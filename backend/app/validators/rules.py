import re
from datetime import datetime
from typing import Tuple, Optional

VALID_TYPES = {"Credit", "Debit"}
VALID_MODES = {"Cash", "UPI", "Bank"}
VALID_STATUSES = {"Success", "Pending", "Failed"}


def parse_and_normalize_date(raw_val: object) -> Tuple[bool, str, str, bool]:
    """
    Returns (is_valid, ddmmyyyy, iso_date, was_normalized)
    """
    if raw_val is None:
        return False, "", "", False
    raw_str = str(raw_val).strip()
    if not raw_str:
        return False, "", "", False

    # Try standard date formats
    for fmt in ("%d-%m-%Y", "%d/%m/%Y", "%d.%m.%Y", "%Y-%m-%d", "%Y/%m/%d", "%d %b %Y", "%d-%b-%Y"):
        try:
            dt = datetime.strptime(raw_str, fmt)
            ddmmyyyy = dt.strftime("%d-%m-%Y")
            iso_date = dt.strftime("%Y-%m-%d")
            return True, ddmmyyyy, iso_date, (ddmmyyyy != str(raw_val))
        except ValueError:
            continue

    return False, raw_str, "", False


def normalize_type_value(raw_val: str) -> Tuple[str, bool, bool]:
    trimmed = (raw_val or "").strip()
    lower = trimmed.lower()
    if lower in {"credit", "cr", "cr.", "c", "inflow", "receipt"}:
        return "Credit", True, (raw_val != "Credit")
    if lower in {"debit", "dr", "dr.", "d", "outflow", "payment", "payout"}:
        return "Debit", True, (raw_val != "Debit")
    return trimmed, False, (trimmed != raw_val)


def normalize_mode_value(raw_val: str) -> Tuple[str, bool, bool]:
    trimmed = (raw_val or "").strip()
    lower = trimmed.lower()
    if lower in {"cash", "csh", "petty cash", "counter cash"}:
        return "Cash", True, (raw_val != "Cash")
    if lower in {"upi", "gpay", "phonepe", "paytm", "bhim", "qr", "upi transfer"}:
        return "UPI", True, (raw_val != "UPI")
    if lower in {"bank", "neft", "rtgs", "imps", "bank transfer", "netbanking", "wire", "cheque"}:
        return "Bank", True, (raw_val != "Bank")
    return trimmed, False, (trimmed != raw_val)


def normalize_status_value(raw_val: str) -> Tuple[str, bool, bool]:
    trimmed = (raw_val or "").strip()
    lower = trimmed.lower()
    if lower in {"success", "successful", "completed", "settled", "paid", "cleared", "ok"}:
        return "Success", True, (raw_val != "Success")
    if lower in {"pending", "in progress", "processing", "initiated", "awaiting", "hold"}:
        return "Pending", True, (raw_val != "Pending")
    if lower in {"failed", "failure", "declined", "rejected", "bounced", "cancelled", "error"}:
        return "Failed", True, (raw_val != "Failed")
    return trimmed, False, (trimmed != raw_val)


def parse_amount_value(raw_val: object) -> Tuple[Optional[float], bool, bool]:
    if raw_val is None:
        return None, False, False
    raw_str = str(raw_val).strip()
    if not raw_str:
        return None, False, False
    cleaned = re.sub(r"^(?:INR|Rs\.?|₹|\$)\s*", "", raw_str, flags=re.IGNORECASE)
    cleaned = cleaned.replace(",", "").replace(" ", "")
    try:
        val = round(float(cleaned), 2)
        if val <= 0:
            return val, False, False
        return val, True, (raw_str != str(val))
    except ValueError:
        return None, False, False
