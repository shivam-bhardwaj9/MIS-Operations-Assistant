# MIS Operations Assistant

An enterprise-grade **Operations & MIS Automation Web Application** built to eliminate repetitive spreadsheet manual work, automate data cleaning and deterministic validation, reconcile internal ERP ledgers against bank statements, and generate formatted multi-sheet Excel reports (`.xlsx`).

---

## 1. Project Overview

Operations and MIS (Management Information Systems) teams spend hours every day cleaning messy Excel exports, standardizing inconsistent dates, hunting down duplicate voucher IDs, writing repetitive `SUMIF` / `COUNTIF` / `VLOOKUP` formulas, and reconciling internal transaction registers against external bank statements.

**MIS Operations Assistant** replaces fragile manual spreadsheet work with a deterministic, auditable workflow:
- **Zero Silent Data Modification**: Displays a pre-cleaning validation summary before applying normalization rules.
- **Smart Column Mapping**: Automatically maps non-standard column headers (e.g., `"Txn ID"` → `"Transaction ID"`, `"Payment Status"` → `"Status"`).
- **Deterministic Validation & Cleaning**: Normalizes dates to `DD-MM-YYYY`, trims whitespace, standardizes `Type`, `Mode`, and `Status`, flags duplicate Transaction IDs, and computes a `Status Check` (`OK` vs `Review Needed`).
- **Two-Way Reconciliation**: Compares Internal Transactions vs Bank/External Statements to isolate `Matched`, `Missing in Internal`, `Missing in External`, `Amount Mismatch`, and `Duplicate` records.
- **6-Sheet Formatted Excel Export**: Generates an executive `.xlsx` workbook with frozen headers, auto-filters, currency formatting (`₹#,##,##0.00`), conditional status colors, and proper column widths.

---

## 2. Core Features

1. **Executive MIS Dashboard**:
   - 8 KPI Cards: Total Transactions, Total Amount, Successful Transactions, Pending Transactions, Failed Transactions, Success Rate, Duplicate Records, and Records Requiring Review.
   - Automated MIS Formula Strip: Credit Amount (`SUMIF(Type, "Credit", Amount)`), Debit Amount (`SUMIF(Type, "Debit", Amount)`), Average, Highest, and Lowest Transaction Amount.
   - 4 Interactive Recharts Visualizations: Transaction Status Distribution, Daily Transaction Amount, Daily Transaction Count, and Credit vs Debit Amount.
2. **Upload & Column Mapping**:
   - Drag-and-drop support for `.xlsx`, `.xls`, and `.csv` files.
   - Interactive column mapper with live sample previews for `Date`, `Transaction ID`, `Customer/Party Name`, `Type`, `Amount`, `Mode`, `Status`, and `Remarks`.
3. **Data Cleaning & Validation Table**:
   - Pre-cleaning Validation Summary (Processed, Valid, Missing Fields, Duplicates, Invalid Amounts, Invalid Dates).
   - One-click deterministic normalization and one-click duplicate removal.
   - Searchable, sortable, paginated data table with inline row editing to fix invalid/missing cells directly in the browser.
4. **Two-Way Bank Reconciliation**:
   - Upload File 1 (Internal Ledger) and File 2 (Bank/External Statement) or load the 1-click Sample Reconciliation Pair.
   - Classifies every record into `Matched`, `Missing in Internal`, `Missing in External`, `Amount Mismatch`, or `Duplicate` with exact variance ($\Delta$) and audit explanations.
5. **Reports & 6-Sheet Excel Export**:
   - Daily, Weekly, and Custom Date Range report views.
   - Generates a formatted `.xlsx` workbook containing:
     - `Sheet 1 — Dashboard`
     - `Sheet 2 — Raw Data`
     - `Sheet 3 — Clean Data`
     - `Sheet 4 — Exceptions`
     - `Sheet 5 — Status Summary`
     - `Sheet 6 — Reconciliation`

---

## 3. Tech Stack

### Frontend
- **React 19** + **TypeScript**
- **Vite**
- **Tailwind CSS**
- **Recharts** (Interactive operational charts)
- **Lucide React** (Accessible semantic icons)

### Backend
- **Python FastAPI** (`/backend/app/main.py`) with **Pandas** and **openpyxl**
- **Node/Express + ExcelJS/SheetJS** (`/server.ts`) unified full-stack runtime for zero-config single-port deployment

---

## 4. Architecture

```text
mis-operations-assistant/
├── src/                        # React + TypeScript Frontend
│   ├── components/             # Sidebar, TopHeader, StatusBadge
│   ├── pages/                  # Dashboard, Upload, Validation, Reconciliation, Reports, Settings
│   ├── services/               # API client & Excel export handlers
│   ├── hooks/                  # Session & notification state management
│   ├── types/                  # Strict TypeScript domain interfaces
│   ├── utils/                  # Deterministic MIS & Reconciliation engines
│   └── App.tsx
├── backend/                    # Python FastAPI Backend
│   ├── app/
│   │   ├── main.py             # FastAPI application entrypoint
│   │   ├── routes/             # /api/upload, /api/validate, /api/clean, /api/reconcile, /api/report
│   │   ├── services/           # Pandas processor, reconciler, openpyxl workbook builder
│   │   ├── models/             # Pydantic request/response schemas
│   │   └── validators/         # Date, amount, and enumeration validators
│   ├── requirements.txt
│   └── sample_data/
├── server.ts                   # Full-stack Express + Vite server (Port 3000)
└── README.md
```

---

## 5. Installation & Setup

### Frontend & Full-Stack Runtime Setup
```bash
npm install
npm run dev
```
The application runs on `http://localhost:3000`.

### Python FastAPI Backend Setup (Optional Standalone Mode)
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

---

## 6. Example Operational Workflow

1. **Load Sample Data or Upload Excel**:
   - Click **"Load Sample Data"** in the Top Header (loads 62 realistic Indian operational records with intentional formatting errors, duplicates, and missing fields), or drag and drop any `.xlsx` / `.csv` file on the **Upload Data** page.
2. **Verify Column Mapping & Validation Summary**:
   - Inspect how uploaded headers (`Txn Date`, `Txn ID`, `Party Name`, `Payment Status`) map to canonical MIS fields.
   - Review the pre-cleaning counts (Valid vs Missing vs Duplicates vs Invalid Dates/Amounts).
3. **Apply Deterministic Cleaning & Fix Exceptions**:
   - Click **"Apply Data Cleaning Rules"** to normalize dates to `DD-MM-YYYY`, trim spaces, and standardize `Credit`/`Debit`, `Cash`/`UPI`/`Bank`, and `Success`/`Pending`/`Failed`.
   - Open **Data Validation** to filter by `Review Needed`, deduplicate rows, or click **Edit** on any row to fix missing values inline.
4. **Reconcile Internal Ledger vs Bank Statement**:
   - Navigate to **Reconciliation** and click **"Load Sample Reconciliation Pair"** (or upload two files) to inspect `Amount Mismatch`, `Missing in Internal`, `Missing in External`, and `Duplicate` records.
5. **Generate Multi-Sheet MIS Excel Report**:
   - Navigate to **Reports**, choose Daily/Weekly/Custom range, and click **"Generate MIS Excel Report"** to download the formatted 6-sheet `.xlsx` workbook.

---

## 7. Interview Explanation

### How This Project Demonstrates Core Operations / MIS Competencies

- **Excel & MIS Formula Mastery**: Automates equivalent logic for `SUM`, `COUNTIF(Status, "Success")`, `SUMIF(Type, "Credit", Amount)`, `AVERAGE`, `MAX`, `MIN`, and `XLOOKUP` / `VLOOKUP` without fragile manual cell references.
- **Data Validation & Hygiene**: Enforces strict schema rules on required fields, calendar dates (`DD-MM-YYYY`), positive numeric amounts, and allowed enumerations (`Credit`/`Debit`, `Cash`/`UPI`/`Bank`, `Success`/`Pending`/`Failed`).
- **Controlled Data Cleaning**: Never silently overwrites financial data—shows an explicit before/after validation summary prior to applying deterministic normalization.
- **Exception Management**: Automatically computes `Status Check` (`OK` vs `Review Needed`) so operations teams focus only on failed, pending, duplicate, or malformed transactions.
- **Two-Way Reconciliation**: Mirrors real-world finance/operations settlement workflows by matching internal ERP vouchers against bank UTRs and isolating amount variances and unrecorded entries.
- **Executive Reporting Automation**: Produces audit-ready, multi-sheet `.xlsx` workbooks with frozen headers, auto-filters, currency formatting, and conditional status styling in one click.

---

## 8. Future Improvements

- Scheduled automated ingestion from SFTP / Google Sheets folders.
- Configurable tolerance thresholds for bank fee / TDS deductions during reconciliation.
- Multi-currency forex conversion tables for cross-border settlement batches.
- Audit log history export for maker-checker sign-off workflows.
