from collections import Counter
from datetime import datetime
from typing import Any, Dict, List
from app.validators.rules import (
    parse_and_normalize_date,
    normalize_type_value,
    normalize_mode_value,
    normalize_status_value,
    parse_amount_value,
    VALID_TYPES,
    VALID_MODES,
    VALID_STATUSES,
)


def process_dataset(
    raw_records: List[Dict[str, Any]],
    mapping: Dict[str, str],
    apply_cleaning: bool = False,
    file_name: str = "Uploaded_Dataset.xlsx",
    file_size: int = 0,
    session_id: str = "session-default",
) -> Dict[str, Any]:
    uploaded_columns = list(raw_records[0].keys()) if raw_records else []

    txn_col = mapping.get("transactionId", "")
    txn_counts: Counter = Counter()
    for row in raw_records:
        raw_id = str(row.get(txn_col, "")).strip().upper() if txn_col else ""
        if raw_id:
            txn_counts[raw_id] += 1

    processed_records = []
    valid_records_count = 0
    missing_fields_count = 0
    duplicates_count = 0
    invalid_amounts_count = 0
    invalid_dates_count = 0
    invalid_status_count = 0
    invalid_type_count = 0
    invalid_mode_count = 0
    normalizable_count = 0
    records_requiring_review = 0

    for idx, row in enumerate(raw_records, start=1):
        raw_date = str(row.get(mapping.get("date", ""), "") or "")
        raw_txn = str(row.get(mapping.get("transactionId", ""), "") or "")
        raw_cust = str(row.get(mapping.get("customerName", ""), "") or "")
        raw_type = str(row.get(mapping.get("type", ""), "") or "")
        raw_amt = str(row.get(mapping.get("amount", ""), "") or "")
        raw_mode = str(row.get(mapping.get("mode", ""), "") or "")
        raw_status = str(row.get(mapping.get("status", ""), "") or "")
        raw_remarks = str(row.get(mapping.get("remarks", ""), "") or "")

        date_valid, ddmmyyyy, iso_date, date_norm = parse_and_normalize_date(raw_date)
        type_norm, type_canonical, type_mod = normalize_type_value(raw_type)
        mode_norm, mode_canonical, mode_mod = normalize_mode_value(raw_mode)
        status_norm, status_canonical, status_mod = normalize_status_value(raw_status)
        amt_val, amt_valid, amt_norm = parse_amount_value(raw_amt)

        trimmed_txn = raw_txn.strip().upper()
        trimmed_cust = " ".join(raw_cust.strip().split())
        trimmed_remarks = " ".join(raw_remarks.strip().split())

        if any([date_norm, type_mod, mode_mod, status_mod, amt_norm, raw_txn != trimmed_txn, raw_cust != trimmed_cust]):
            normalizable_count += 1

        issues: List[str] = []
        row_missing = False

        if not raw_date.strip():
            issues.append("Missing Date")
            row_missing = True
        elif not date_valid:
            issues.append("Invalid Date")
            invalid_dates_count += 1

        if not trimmed_txn:
            issues.append("Missing Transaction ID")
            row_missing = True

        is_dup = bool(trimmed_txn and txn_counts[trimmed_txn] > 1)
        if is_dup:
            issues.append("Duplicate Transaction ID")
            duplicates_count += 1

        if not trimmed_cust:
            issues.append("Missing Customer Name")
            row_missing = True

        if not raw_amt.strip():
            issues.append("Missing Amount")
            row_missing = True
        elif not amt_valid:
            issues.append("Invalid Amount")
            invalid_amounts_count += 1

        final_type = type_norm if apply_cleaning else raw_type.strip()
        if not raw_type.strip():
            issues.append("Missing Type")
            row_missing = True
        elif final_type not in VALID_TYPES:
            issues.append("Invalid Type")
            invalid_type_count += 1

        final_mode = mode_norm if apply_cleaning else raw_mode.strip()
        if not raw_mode.strip():
            issues.append("Missing Mode")
            row_missing = True
        elif final_mode not in VALID_MODES:
            issues.append("Invalid Mode")
            invalid_mode_count += 1

        final_status = status_norm if apply_cleaning else raw_status.strip()
        if not raw_status.strip():
            issues.append("Missing Status")
            row_missing = True
        elif final_status not in VALID_STATUSES:
            issues.append("Invalid Status")
            invalid_status_count += 1

        if row_missing:
            missing_fields_count += 1

        is_valid = len(issues) == 0
        if is_valid:
            valid_records_count += 1

        status_check = "OK" if (status_norm == "Success" and is_valid) else "Review Needed"
        if status_check == "Review Needed":
            records_requiring_review += 1

        processed_records.append(
            {
                "rowIndex": idx,
                "rawDate": raw_date,
                "rawTransactionId": raw_txn,
                "rawCustomerName": raw_cust,
                "rawType": raw_type,
                "rawAmount": raw_amt,
                "rawMode": raw_mode,
                "rawStatus": raw_status,
                "rawRemarks": raw_remarks,
                "date": ddmmyyyy if (apply_cleaning and date_valid) else raw_date.strip(),
                "isoDate": iso_date,
                "transactionId": trimmed_txn if apply_cleaning else raw_txn.strip(),
                "customerName": trimmed_cust if apply_cleaning else raw_cust,
                "type": final_type,
                "amount": amt_val,
                "mode": final_mode,
                "status": final_status,
                "remarks": trimmed_remarks if apply_cleaning else raw_remarks,
                "statusCheck": status_check,
                "validationIssues": issues,
                "isValid": is_valid,
                "isDuplicate": is_dup,
                "cleaningChanges": [],
            }
        )

    total_txns = len(processed_records)
    valid_amounts = [r["amount"] for r in processed_records if r["amount"] is not None and r["amount"] > 0]
    total_amount = round(sum(valid_amounts), 2)
    success_count = sum(1 for r in processed_records if normalize_status_value(r["status"])[0] == "Success")
    pending_count = sum(1 for r in processed_records if normalize_status_value(r["status"])[0] == "Pending")
    failed_count = sum(1 for r in processed_records if normalize_status_value(r["status"])[0] == "Failed")
    credit_amount = round(
        sum((r["amount"] or 0) for r in processed_records if normalize_type_value(r["type"])[0] == "Credit" and (r["amount"] or 0) > 0),
        2,
    )
    debit_amount = round(
        sum((r["amount"] or 0) for r in processed_records if normalize_type_value(r["type"])[0] == "Debit" and (r["amount"] or 0) > 0),
        2,
    )
    success_rate = round((success_count / total_txns) * 100, 1) if total_txns > 0 else 0.0

    return {
        "sessionId": session_id,
        "fileName": file_name,
        "fileSize": file_size,
        "uploadedAt": datetime.utcnow().isoformat(),
        "uploadedColumns": uploaded_columns,
        "columnMapping": mapping,
        "isCleaned": apply_cleaning,
        "rawRecords": raw_records,
        "processedRecords": processed_records,
        "validationSummary": {
            "totalRecords": total_txns,
            "validRecords": valid_records_count,
            "missingFieldsCount": missing_fields_count,
            "duplicatesCount": duplicates_count,
            "invalidAmountsCount": invalid_amounts_count,
            "invalidDatesCount": invalid_dates_count,
            "invalidStatusCount": invalid_status_count,
            "invalidTypeCount": invalid_type_count,
            "invalidModeCount": invalid_mode_count,
            "normalizableCount": normalizable_count,
            "recordsRequiringReview": records_requiring_review,
            "issueBreakdown": [],
        },
        "misSummary": {
            "totalTransactions": total_txns,
            "totalAmount": total_amount,
            "successfulTransactions": success_count,
            "pendingTransactions": pending_count,
            "failedTransactions": failed_count,
            "invalidStatusTransactions": total_txns - (success_count + pending_count + failed_count),
            "creditAmount": credit_amount,
            "debitAmount": debit_amount,
            "creditCount": sum(1 for r in processed_records if normalize_type_value(r["type"])[0] == "Credit"),
            "debitCount": sum(1 for r in processed_records if normalize_type_value(r["type"])[0] == "Debit"),
            "successRate": success_rate,
            "duplicateRecords": duplicates_count,
            "recordsRequiringReview": records_requiring_review,
            "averageTransactionAmount": round(total_amount / len(valid_amounts), 2) if valid_amounts else 0.0,
            "highestTransaction": max(valid_amounts) if valid_amounts else 0.0,
            "lowestTransaction": min(valid_amounts) if valid_amounts else 0.0,
        },
    }
