import os
import tempfile
from typing import Any, Dict, List, Optional
import pandas as pd
from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from app.models.schemas import CleanRequest, ReconcileRequest, ValidateRequest
from app.services.excel_exporter import export_mis_excel_workbook
from app.services.processor import process_dataset
from app.services.reconciler import reconcile_datasets

router = APIRouter(prefix="/api", tags=["MIS Operations"])

SESSIONS: Dict[str, Dict[str, Any]] = {}
RECONCILIATIONS: Dict[str, Dict[str, Any]] = {}


def safe_remove_temp_file(file_path: Optional[str]) -> None:
    """Safely deletes a temporary file without raising if already removed."""
    if not file_path:
        return
    try:
        if os.path.exists(file_path) and os.path.isfile(file_path):
            # Never delete files inside sample_data
            norm_path = os.path.abspath(file_path)
            if "sample_data" in norm_path:
                return
            os.remove(norm_path)
    except OSError:
        pass


def parse_uploaded_file_from_temp_path(temp_path: str, filename: str) -> List[Dict[str, Any]]:
    lower = filename.lower()
    if not lower.endswith((".xlsx", ".xls", ".csv")):
        raise HTTPException(
            status_code=400,
            detail="Unsupported file format. Please upload an Excel (.xlsx, .xls) or CSV (.csv) file.",
        )
    try:
        if lower.endswith(".csv"):
            df = pd.read_csv(temp_path, dtype=str).fillna("")
        else:
            df = pd.read_excel(temp_path, dtype=str).fillna("")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to read spreadsheet: {str(exc)}")

    if df.empty:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")

    return df.to_dict(orient="records")


@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "MIS Operations Assistant FastAPI Backend",
        "activeSessions": len(SESSIONS),
    }


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    sessionId: str = Form("default"),
):
    filename = file.filename or "upload.xlsx"
    lower = filename.lower()
    if not lower.endswith((".xlsx", ".xls", ".csv")):
        await file.close()
        raise HTTPException(
            status_code=400,
            detail="Unsupported file format. Please upload an Excel (.xlsx, .xls) or CSV (.csv) file.",
        )

    suffix = os.path.splitext(filename)[1].lower() or ".xlsx"
    temp_upload_path: Optional[str] = None

    try:
        content = await file.read()
        with tempfile.NamedTemporaryFile(
            mode="wb", suffix=suffix, prefix="mis_upload_", delete=False
        ) as tmp_file:
            temp_upload_path = tmp_file.name
            tmp_file.write(content)

        # Clear any old session or reconciliation state for this sessionId before replacing
        SESSIONS.pop(sessionId, None)
        RECONCILIATIONS.pop(sessionId, None)

        records = parse_uploaded_file_from_temp_path(temp_upload_path, filename)
        cols = list(records[0].keys()) if records else []
        default_mapping = {
            "date": cols[0] if len(cols) > 0 else "",
            "transactionId": cols[1] if len(cols) > 1 else "",
            "customerName": cols[2] if len(cols) > 2 else "",
            "type": cols[3] if len(cols) > 3 else "",
            "amount": cols[4] if len(cols) > 4 else "",
            "mode": cols[5] if len(cols) > 5 else "",
            "status": cols[6] if len(cols) > 6 else "",
            "remarks": cols[7] if len(cols) > 7 else "",
        }
        session_data = process_dataset(
            records,
            default_mapping,
            apply_cleaning=False,
            file_name=filename,
            file_size=len(content),
            session_id=sessionId,
        )
        SESSIONS[sessionId] = session_data
        return session_data
    finally:
        await file.close()
        safe_remove_temp_file(temp_upload_path)


@router.delete("/session/{session_id}")
def delete_session(session_id: str):
    """Clears active analysis session and reconciliation data without touching sample_data."""
    SESSIONS.pop(session_id, None)
    RECONCILIATIONS.pop(session_id, None)
    return {
        "status": "cleared",
        "sessionId": session_id,
        "message": "Uploaded file and analysis session deleted successfully.",
    }


@router.post("/session/clear")
def clear_session_post(payload: Dict[str, Any]):
    session_id = str(payload.get("sessionId", "default"))
    SESSIONS.pop(session_id, None)
    RECONCILIATIONS.pop(session_id, None)
    return {
        "status": "cleared",
        "sessionId": session_id,
        "message": "Uploaded file and analysis session deleted successfully.",
    }


@router.post("/validate")
def validate_data(req: ValidateRequest):
    existing = SESSIONS.get(req.sessionId, {})
    raw_records = req.rawRecords or existing.get("rawRecords")
    if not raw_records:
        raise HTTPException(status_code=400, detail="No dataset found in session.")
    session_data = process_dataset(
        raw_records,
        req.columnMapping.model_dump(),
        apply_cleaning=False,
        file_name=req.fileName or existing.get("fileName", "Dataset.xlsx"),
        file_size=req.fileSize or existing.get("fileSize", 0),
        session_id=req.sessionId,
    )
    SESSIONS[req.sessionId] = session_data
    return session_data


@router.post("/clean")
def clean_data(req: CleanRequest):
    existing = SESSIONS.get(req.sessionId, {})
    raw_records = req.rawRecords or existing.get("rawRecords")
    mapping = req.columnMapping.model_dump() if req.columnMapping else existing.get("columnMapping")
    if not raw_records or not mapping:
        raise HTTPException(status_code=400, detail="Session dataset or mapping not found.")
    session_data = process_dataset(
        raw_records,
        mapping,
        apply_cleaning=req.applyCleaning,
        file_name=req.fileName or existing.get("fileName", "Cleaned_Dataset.xlsx"),
        file_size=req.fileSize or existing.get("fileSize", 0),
        session_id=req.sessionId,
    )
    SESSIONS[req.sessionId] = session_data
    return session_data


@router.post("/reconcile")
def reconcile_data(req: ReconcileRequest):
    if not req.internalRecords or not req.externalRecords:
        raise HTTPException(status_code=400, detail="Both Internal and External records are required.")
    int_map = req.internalMapping.model_dump() if req.internalMapping else {}
    ext_map = req.externalMapping.model_dump() if req.externalMapping else {}
    result = reconcile_datasets(
        req.internalRecords,
        req.externalRecords,
        int_map,
        ext_map,
        req.verifyDate,
        req.internalFileName,
        req.externalFileName,
    )
    RECONCILIATIONS[req.sessionId] = result
    return {"result": result}


@router.post("/report")
def generate_report(payload: Dict[str, Any], background_tasks: BackgroundTasks):
    session_id = payload.get("sessionId", "default")
    session_data = payload.get("session") or SESSIONS.get(session_id)
    if not session_data:
        raise HTTPException(status_code=400, detail="No active dataset to generate report.")
    recon_data = payload.get("reconciliation") or RECONCILIATIONS.get(session_id)

    temp_report_path: Optional[str] = None
    try:
        xlsx_bytes = export_mis_excel_workbook(session_data, recon_data)
        with tempfile.NamedTemporaryFile(
            mode="wb", suffix=".xlsx", prefix="mis_report_", delete=False
        ) as tmp_report:
            temp_report_path = tmp_report.name
            tmp_report.write(xlsx_bytes)

        with open(temp_report_path, "rb") as f:
            response_bytes = f.read()

        # Schedule cleanup after response is sent and also clean in finally block
        background_tasks.add_task(safe_remove_temp_file, temp_report_path)
        return Response(
            content=response_bytes,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": 'attachment; filename="MIS_Operations_Report.xlsx"'},
        )
    finally:
        safe_remove_temp_file(temp_report_path)
