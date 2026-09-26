import io
from typing import Any, Dict, Optional
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter


def export_mis_excel_workbook(
    session_data: Dict[str, Any],
    reconciliation_data: Optional[Dict[str, Any]] = None,
) -> bytes:
    """
    Generates a professionally formatted 6-sheet Excel (.xlsx) report using openpyxl:
    1. Dashboard
    2. Raw Data
    3. Clean Data
    4. Exceptions
    5. Status Summary
    6. Reconciliation
    """
    wb = openpyxl.Workbook()

    header_fill = PatternFill(start_color="0F172A", end_color="0F172A", fill_type="solid")
    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    thin_side = Side(style="thin", color="E2E8F0")
    border = Border(left=thin_side, right=thin_side, top=thin_side, bottom=thin_side)

    fill_ok = PatternFill(start_color="DCFCE7", end_color="DCFCE7", fill_type="solid")
    fill_warn = PatternFill(start_color="FEF3C7", end_color="FEF3C7", fill_type="solid")
    fill_err = PatternFill(start_color="FEE2E2", end_color="FEE2E2", fill_type="solid")

    def style_header_row(ws, row_idx=1):
        for cell in ws[row_idx]:
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal="left", vertical="center")
            cell.border = border

    def auto_fit_columns(ws):
        for col in ws.columns:
            max_len = max((len(str(cell.value or "")) for cell in col), default=12)
            col_letter = get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = min(max(max_len + 4, 14), 48)

    # Sheet 1: Dashboard
    ws_dash = wb.active
    ws_dash.title = "Dashboard"
    ws_dash.freeze_panes = "A4"
    ws_dash.append(["MIS Operations Executive Report", "", ""])
    ws_dash["A1"].font = Font(name="Calibri", size=15, bold=True)
    ws_dash.append(["Source File", session_data.get("fileName", ""), "Report Generated", session_data.get("uploadedAt", "")])
    ws_dash.append([])
    ws_dash.append(["Metric", "Value", "Excel Formula Equivalent"])
    style_header_row(ws_dash, 4)

    mis = session_data.get("misSummary", {})
    val = session_data.get("validationSummary", {})
    kpis = [
        ("Total Transactions", mis.get("totalTransactions", 0), 'COUNTA(Clean_Data!B:B)'),
        ("Total Amount", mis.get("totalAmount", 0), 'SUM(Clean_Data!E:E)'),
        ("Successful Transactions", mis.get("successfulTransactions", 0), 'COUNTIF(Status, "Success")'),
        ("Pending Transactions", mis.get("pendingTransactions", 0), 'COUNTIF(Status, "Pending")'),
        ("Failed Transactions", mis.get("failedTransactions", 0), 'COUNTIF(Status, "Failed")'),
        ("Success Rate (%)", f"{mis.get('successRate', 0)}%", "Success / Total * 100"),
        ("Credit Amount", mis.get("creditAmount", 0), 'SUMIF(Type, "Credit", Amount)'),
        ("Debit Amount", mis.get("debitAmount", 0), 'SUMIF(Type, "Debit", Amount)'),
        ("Duplicate Records", val.get("duplicatesCount", 0), "COUNTIF(TxnID, Duplicate)"),
        ("Records Requiring Review", val.get("recordsRequiringReview", 0), 'COUNTIF(StatusCheck, "Review Needed")'),
    ]
    for metric, v, formula in kpis:
        ws_dash.append([metric, v, formula])
    auto_fit_columns(ws_dash)

    # Sheet 2: Raw Data
    ws_raw = wb.create_sheet("Raw Data")
    ws_raw.freeze_panes = "A2"
    raw_cols = session_data.get("uploadedColumns", [])
    if raw_cols:
        ws_raw.append(raw_cols)
        style_header_row(ws_raw, 1)
        for r in session_data.get("rawRecords", []):
            ws_raw.append([r.get(c, "") for c in raw_cols])
        ws_raw.auto_filter.ref = ws_raw.dimensions
    auto_fit_columns(ws_raw)

    # Sheet 3: Clean Data
    ws_clean = wb.create_sheet("Clean Data")
    ws_clean.freeze_panes = "A2"
    clean_headers = [
        "Row #", "Date", "Transaction ID", "Customer/Party Name",
        "Type", "Amount", "Mode", "Status", "Status Check", "Validation Issue", "Remarks"
    ]
    ws_clean.append(clean_headers)
    style_header_row(ws_clean, 1)

    for rec in session_data.get("processedRecords", []):
        issues_str = ", ".join(rec.get("validationIssues", [])) or "None"
        ws_clean.append([
            rec.get("rowIndex"),
            rec.get("date"),
            rec.get("transactionId"),
            rec.get("customerName"),
            rec.get("type"),
            rec.get("amount") or 0,
            rec.get("mode"),
            rec.get("status"),
            rec.get("statusCheck"),
            issues_str,
            rec.get("remarks"),
        ])
        row_num = ws_clean.max_row
        ws_clean.cell(row=row_num, column=6).number_format = '₹#,##,##0.00'
        st_val = str(rec.get("status", "")).lower()
        if st_val == "success":
            ws_clean.cell(row=row_num, column=8).fill = fill_ok
        elif st_val == "pending":
            ws_clean.cell(row=row_num, column=8).fill = fill_warn
        elif st_val == "failed":
            ws_clean.cell(row=row_num, column=8).fill = fill_err

    ws_clean.auto_filter.ref = ws_clean.dimensions
    auto_fit_columns(ws_clean)

    # Sheet 4: Exceptions
    ws_exc = wb.create_sheet("Exceptions")
    ws_exc.freeze_panes = "A2"
    ws_exc.append(clean_headers)
    style_header_row(ws_exc, 1)
    for rec in session_data.get("processedRecords", []):
        if not rec.get("isValid") or rec.get("statusCheck") == "Review Needed":
            issues_str = ", ".join(rec.get("validationIssues", [])) or f"Status is {rec.get('status')}"
            ws_exc.append([
                rec.get("rowIndex"),
                rec.get("date"),
                rec.get("transactionId"),
                rec.get("customerName"),
                rec.get("type"),
                rec.get("amount") or 0,
                rec.get("mode"),
                rec.get("status"),
                rec.get("statusCheck"),
                issues_str,
                rec.get("remarks"),
            ])
    ws_exc.auto_filter.ref = ws_exc.dimensions
    auto_fit_columns(ws_exc)

    # Sheet 5: Status Summary
    ws_sum = wb.create_sheet("Status Summary")
    ws_sum.freeze_panes = "A2"
    ws_sum.append(["Status", "Count", "Amount"])
    style_header_row(ws_sum, 1)
    ws_sum.append(["Success", mis.get("successfulTransactions", 0), ""])
    ws_sum.append(["Pending", mis.get("pendingTransactions", 0), ""])
    ws_sum.append(["Failed", mis.get("failedTransactions", 0), ""])
    auto_fit_columns(ws_sum)

    # Sheet 6: Reconciliation
    ws_rec = wb.create_sheet("Reconciliation")
    ws_rec.freeze_panes = "A2"
    ws_rec.append(["Transaction ID", "Category", "Internal Date", "External Date", "Internal Amount", "External Amount", "Variance", "Explanation"])
    style_header_row(ws_rec, 1)
    if reconciliation_data:
        for item in reconciliation_data.get("items", []):
            ws_rec.append([
                item.get("transactionId"),
                item.get("category"),
                item.get("internalDate") or "—",
                item.get("externalDate") or "—",
                item.get("internalAmount") or 0,
                item.get("externalAmount") or 0,
                item.get("amountVariance") or 0,
                item.get("explanation"),
            ])
    auto_fit_columns(ws_rec)

    out = io.BytesIO()
    wb.save(out)
    return out.getvalue()
