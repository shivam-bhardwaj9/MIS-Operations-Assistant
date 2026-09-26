from datetime import datetime
from typing import Any, Dict, List
from app.validators.rules import parse_amount_value, parse_and_normalize_date


def reconcile_datasets(
    internal_rows: List[Dict[str, Any]],
    external_rows: List[Dict[str, Any]],
    internal_mapping: Dict[str, str],
    external_mapping: Dict[str, str],
    verify_date: bool = True,
    internal_file_name: str = "Internal_Transactions.xlsx",
    external_file_name: str = "Bank_Statement.xlsx",
) -> Dict[str, Any]:
    int_by_id: Dict[str, List[Dict[str, Any]]] = {}
    ext_by_id: Dict[str, List[Dict[str, Any]]] = {}

    for row in internal_rows:
        tid = str(row.get(internal_mapping.get("transactionId", ""), "")).strip().upper()
        if tid:
            int_by_id.setdefault(tid, []).append(row)

    for row in external_rows:
        tid = str(row.get(external_mapping.get("transactionId", ""), "")).strip().upper()
        if tid:
            ext_by_id.setdefault(tid, []).append(row)

    all_ids = sorted(set(int_by_id.keys()) | set(ext_by_id.keys()))
    items = []
    matched_count = 0
    matched_amount = 0.0
    missing_int_count = 0
    missing_int_amount = 0.0
    missing_ext_count = 0
    missing_ext_amount = 0.0
    mismatch_count = 0
    variance_total = 0.0
    dup_count = 0

    for idx, tid in enumerate(all_ids, start=1):
        int_list = int_by_id.get(tid, [])
        ext_list = ext_by_id.get(tid, [])

        int_row = int_list[0] if int_list else None
        ext_row = ext_list[0] if ext_list else None

        int_amt = parse_amount_value(int_row.get(internal_mapping.get("amount", "")))[0] if int_row else None
        ext_amt = parse_amount_value(ext_row.get(external_mapping.get("amount", "")))[0] if ext_row else None

        int_date = parse_and_normalize_date(int_row.get(internal_mapping.get("date", "")))[1] if int_row else None
        ext_date = parse_and_normalize_date(ext_row.get(external_mapping.get("date", "")))[1] if ext_row else None

        if len(int_list) > 1 or len(ext_list) > 1:
            dup_count += 1
            category = "Duplicate"
            explanation = f"Duplicate Transaction ID ({len(int_list)} internal, {len(ext_list)} external)."
        elif not int_list and len(ext_list) == 1:
            missing_int_count += 1
            missing_int_amount += ext_amt or 0.0
            category = "Missing in Internal"
            explanation = "Present in External Bank Statement, missing from Internal Ledger."
        elif len(int_list) == 1 and not ext_list:
            missing_ext_count += 1
            missing_ext_amount += int_amt or 0.0
            category = "Missing in External"
            explanation = "Recorded in Internal Ledger, missing from External Bank Statement."
        else:
            variance = round((int_amt or 0.0) - (ext_amt or 0.0), 2)
            if abs(variance) >= 0.01:
                mismatch_count += 1
                variance_total += abs(variance)
                category = "Amount Mismatch"
                explanation = f"Amount variance of ₹{variance:,.2f} between Internal and Bank Statement."
            else:
                matched_count += 1
                matched_amount += int_amt or 0.0
                category = "Matched"
                explanation = "Exact match on Transaction ID and Amount."

        items.append(
            {
                "id": f"rec-{idx}",
                "transactionId": tid,
                "category": category,
                "internalDate": int_date,
                "externalDate": ext_date,
                "internalAmount": int_amt,
                "externalAmount": ext_amt,
                "amountVariance": round((int_amt or 0.0) - (ext_amt or 0.0), 2) if (int_amt is not None and ext_amt is not None) else None,
                "partyName": "—",
                "dateMatched": bool(int_date and ext_date and int_date == ext_date),
                "explanation": explanation,
            }
        )

    return {
        "internalFileName": internal_file_name,
        "externalFileName": external_file_name,
        "reconciledAt": datetime.utcnow().isoformat(),
        "verifyDate": verify_date,
        "summary": {
            "totalInternal": len(internal_rows),
            "totalExternal": len(external_rows),
            "matchedCount": matched_count,
            "matchedAmount": round(matched_amount, 2),
            "missingInInternalCount": missing_int_count,
            "missingInInternalAmount": round(missing_int_amount, 2),
            "missingInExternalCount": missing_ext_count,
            "missingInExternalAmount": round(missing_ext_amount, 2),
            "amountMismatchCount": mismatch_count,
            "totalVarianceAmount": round(variance_total, 2),
            "duplicateCount": dup_count,
            "reconciliationRate": round((matched_count / len(all_ids)) * 100, 1) if all_ids else 0.0,
        },
        "items": items,
    }
