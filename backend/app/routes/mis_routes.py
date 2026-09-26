import io
from typing import Any, Dict, List
import pandas as pd
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from app.models.schemas import CleanRequest, ReconcileRequest, ValidateRequest
from app.services.excel_exporter import export_mis_excel_workbook
from app.services.processor import process_dataset
from app.services.reconciler import reconcile_datasets

router = APIRouter(prefix="/api", tags=["MIS Operations"])

SESSIONS: Dict[str, Dict[str, Any]] = {}
RECONCILIATIONS: Dict[str, Dict[str, Any]] = {}


def parse_uploaded_file(file_bytes: bytes, filename: str) -> List[Dict[str, Any]]:
    lower = filename.lower()
    if not lower.endswith((".xlsx", ".xls", ".csv")):
        raise HTTPException(
            status_code=400,
            detail="Unsupported file format. Please upload an Excel (.xlsx, .xls) or CSV (.csv) file.",
        )
    try:
        if lower.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(file_bytes), dtype=str).fillna("")
        else:
            df = pd.read_excel(io.BytesIO(file_bytes), dtype=str).fillna("")
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
    content = await file.read()
    records = parse_uploaded_file(content, file.filename or "upload.xlsx")
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
        file_name=file.filename or "upload.xlsx",
        file_size=len(content),
        session_id=sessionId,
    )
    SESSIONS[sessionId] = session_data
    return session_data


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
def generate_report(payload: Dict[str, Any]):
    session_id = payload.get("sessionId", "default")
    session_data = payload.get("session") or SESSIONS.get(session_id)
    if not session_data:
        raise HTTPException(status_code=400, detail="No active dataset to generate report.")
    recon_data = payload.get("reconciliation") or RECONCILIATIONS.get(session_id)
    xlsx_bytes = export_mis_excel_workbook(session_data, recon_data)
    return Response(
        content=xlsx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="MIS_Operations_Report.xlsx"'},
    )
