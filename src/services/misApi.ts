import * as XLSX from 'xlsx';
import {
  AppSettings,
  DatasetSession,
  RawRecord,
  ReconcileCategory,
  ReconcileConfig,
  ReconciliationItem,
  ReconciliationResult,
  UniversalProcessedRow,
} from '../types/mis';
import { generateFormattedMISWorkbook } from '../utils/excelGenerator';
import {
  processUniversalDataset,
  runUniversalReconciliation,
} from '../utils/misEngine';
import { parseWorkbookFromData } from '../utils/spreadsheetParser';

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
).replace(/\/+$/, '');

export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

export interface BackendColumnMapping {
  date: string;
  transactionId: string;
  customerName: string;
  type: string;
  amount: string;
  mode: string;
  status: string;
  remarks: string;
}

export interface BackendHealthResponse {
  status: string;
  service: string;
  activeSessions: number;
}

/**
 * Extracts a descriptive HTTP status + error message from FastAPI or Express error responses
 * (handles 400, 404, 422 Pydantic validation arrays, and 500 errors).
 */
async function extractBackendError(response: Response, endpoint: string): Promise<string> {
  let detailText = response.statusText || 'Request failed';
  try {
    const data = await response.json();
    if (typeof data?.detail === 'string') {
      detailText = data.detail;
    } else if (Array.isArray(data?.detail)) {
      detailText = data.detail
        .map((err: { loc?: (string | number)[]; msg?: string }) => {
          const field = Array.isArray(err.loc) ? err.loc.join('.') : 'body';
          return `${field}: ${err.msg || 'invalid'}`;
        })
        .join('; ');
    } else if (typeof data?.error === 'string') {
      detailText = data.error;
    }
  } catch {
    // Response body was not JSON
  }

  const formattedError = `[${endpoint}] HTTP ${response.status}: ${detailText}`;
  console.warn(formattedError);
  return formattedError;
}

/**
 * Maps a universal DatasetSession's detected columns to the FastAPI ColumnMappingModel schema:
 * { date, transactionId, customerName, type, amount, mode, status, remarks }
 */
function buildBackendColumnMapping(session: DatasetSession): BackendColumnMapping {
  const cols = session.uploadedColumns;
  const profile = session.datasetProfile;
  const findByRole = (role: string) =>
    session.columnProfiles.find((c) => c.semanticRole === role)?.name || '';

  return {
    date: profile.primaryDateCol || findByRole('Date') || cols[0] || '',
    transactionId:
      profile.primaryIdentifierCol || findByRole('Identifier') || cols[1] || '',
    customerName: profile.primaryNameCol || findByRole('Name') || cols[2] || '',
    type:
      profile.primaryTypeCol ||
      findByRole('Type') ||
      profile.primaryCategoryCol ||
      cols[3] ||
      '',
    amount:
      profile.primaryNumericCol ||
      findByRole('Currency') ||
      findByRole('Number') ||
      cols[4] ||
      '',
    mode: findByRole('Mode') || findByRole('Category') || cols[5] || '',
    status: profile.primaryStatusCol || findByRole('Status') || cols[6] || '',
    remarks: findByRole('Text') || cols[7] || '',
  };
}

/**
 * Maps UniversalProcessedRow[] to FastAPI's processedRecords structure
 * expected by backend/app/services/excel_exporter.py.
 */
function buildBackendProcessedRecords(
  session: DatasetSession,
  rows: UniversalProcessedRow[]
): Record<string, unknown>[] {
  const mapping = buildBackendColumnMapping(session);
  return rows.map((r) => ({
    rowIndex: r.rowIndex,
    date: mapping.date ? String(r.cleanCells[mapping.date] ?? '') : '',
    isoDate: mapping.date ? r.isoDates[mapping.date] || '' : '',
    transactionId: mapping.transactionId
      ? String(r.cleanCells[mapping.transactionId] ?? '')
      : `ROW-${r.rowIndex}`,
    customerName: mapping.customerName
      ? String(r.cleanCells[mapping.customerName] ?? '')
      : '',
    type: mapping.type ? String(r.cleanCells[mapping.type] ?? '') : '',
    amount: mapping.amount ? (r.numericValues[mapping.amount] ?? 0) : 0,
    mode: mapping.mode ? String(r.cleanCells[mapping.mode] ?? '') : '',
    status: r.businessStatus !== '—' ? r.businessStatus : '',
    remarks: mapping.remarks ? String(r.cleanCells[mapping.remarks] ?? '') : '',
    statusCheck: r.statusCheck,
    validationIssues: r.issues.map((i) => i.message),
    isValid: r.isValid,
    isDuplicate: r.isDuplicateIdentifier,
  }));
}

/**
 * Adapts the FastAPI reconcile_datasets response into the frontend ReconciliationResult structure.
 */
function adaptBackendReconciliationResult(
  rawResult: Record<string, unknown>,
  config: ReconcileConfig,
  fallbackFileAName: string,
  fallbackFileBName: string
): ReconciliationResult {
  if (
    typeof rawResult.fileAName === 'string' &&
    rawResult.summary &&
    typeof (rawResult.summary as Record<string, unknown>).totalFileA === 'number'
  ) {
    return rawResult as unknown as ReconciliationResult;
  }

  const rawSummary = (rawResult.summary || {}) as Record<string, unknown>;
  const rawItems = (Array.isArray(rawResult.items) ? rawResult.items : []) as Record<
    string,
    unknown
  >[];

  const mapCategory = (cat: string): ReconcileCategory => {
    if (cat === 'Missing in Internal' || cat === 'Missing in File A') {
      return 'Missing in File A';
    }
    if (cat === 'Missing in External' || cat === 'Missing in File B') {
      return 'Missing in File B';
    }
    if (cat === 'Amount Mismatch' || cat === 'Value Mismatch') {
      return 'Value Mismatch';
    }
    if (cat === 'Duplicate') {
      return 'Duplicate';
    }
    return 'Matched';
  };

  const items: ReconciliationItem[] = rawItems.map((item, idx) => {
    const category = mapCategory(String(item.category || 'Matched'));
    const valueA =
      typeof item.valueA === 'number'
        ? item.valueA
        : typeof item.internalAmount === 'number'
        ? item.internalAmount
        : null;
    const valueB =
      typeof item.valueB === 'number'
        ? item.valueB
        : typeof item.externalAmount === 'number'
        ? item.externalAmount
        : null;
    const variance =
      typeof item.variance === 'number'
        ? item.variance
        : typeof item.amountVariance === 'number'
        ? item.amountVariance
        : valueA !== null && valueB !== null
        ? Math.round((valueA - valueB) * 100) / 100
        : null;

    return {
      id: String(item.id || `rec-${idx + 1}`),
      keyValue: String(item.keyValue || item.transactionId || `KEY-${idx + 1}`),
      category,
      dateA: item.dateA
        ? String(item.dateA)
        : item.internalDate
        ? String(item.internalDate)
        : null,
      dateB: item.dateB
        ? String(item.dateB)
        : item.externalDate
        ? String(item.externalDate)
        : null,
      valueA,
      valueB,
      variance,
      statusA: item.statusA ? String(item.statusA) : null,
      statusB: item.statusB ? String(item.statusB) : null,
      label: String(item.label || item.partyName || '—'),
      dateMatched: Boolean(item.dateMatched),
      explanation: String(item.explanation || ''),
    };
  });

  return {
    fileAName: String(rawResult.fileAName || rawResult.internalFileName || fallbackFileAName),
    fileBName: String(rawResult.fileBName || rawResult.externalFileName || fallbackFileBName),
    reconciledAt: String(rawResult.reconciledAt || new Date().toISOString()),
    config,
    summary: {
      totalFileA: Number(rawSummary.totalFileA ?? rawSummary.totalInternal ?? 0),
      totalFileB: Number(rawSummary.totalFileB ?? rawSummary.totalExternal ?? 0),
      matchedCount: Number(rawSummary.matchedCount ?? 0),
      matchedValue: Number(rawSummary.matchedValue ?? rawSummary.matchedAmount ?? 0),
      missingInACount: Number(
        rawSummary.missingInACount ?? rawSummary.missingInInternalCount ?? 0
      ),
      missingInAValue: Number(
        rawSummary.missingInAValue ?? rawSummary.missingInInternalAmount ?? 0
      ),
      missingInBCount: Number(
        rawSummary.missingInBCount ?? rawSummary.missingInExternalCount ?? 0
      ),
      missingInBValue: Number(
        rawSummary.missingInBValue ?? rawSummary.missingInExternalAmount ?? 0
      ),
      valueMismatchCount: Number(
        rawSummary.valueMismatchCount ?? rawSummary.amountMismatchCount ?? 0
      ),
      totalVarianceValue: Number(
        rawSummary.totalVarianceValue ?? rawSummary.totalVarianceAmount ?? 0
      ),
      duplicateCount: Number(rawSummary.duplicateCount ?? 0),
      reconciliationRate: Number(rawSummary.reconciliationRate ?? 0),
    },
    items,
  };
}

export async function checkBackendHealthApi(): Promise<BackendHealthResponse | null> {
  try {
    const response = await fetch(apiUrl('/api/health'), {
      method: 'GET',
    });
    if (!response.ok) {
      await extractBackendError(response, 'GET /api/health');
      return null;
    }
    return (await response.json()) as BackendHealthResponse;
  } catch (err: unknown) {
    console.warn('[GET /api/health] Network error:', err);
    return null;
  }
}

export async function parseFileClientSide(
  file: File,
  preferredSheetName?: string
): Promise<{
  sheetNames: string[];
  activeSheetName: string;
  rawRecords: RawRecord[];
}> {
  const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
  if (!['.xlsx', '.xls', '.csv'].includes(ext)) {
    throw new Error(
      `Unsupported file format "${ext}". Please upload an Excel (.xlsx, .xls) or CSV (.csv) file.`
    );
  }

  const buffer = await file.arrayBuffer();
  const parsed = parseWorkbookFromData(buffer, preferredSheetName);
  return {
    sheetNames: parsed.sheetNames,
    activeSheetName: parsed.activeSheetName,
    rawRecords: parsed.rawRecords,
  };
}

export async function uploadDatasetApi(
  file: File,
  sessionId: string,
  preferredSheetName?: string
): Promise<DatasetSession> {
  const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
  if (!['.xlsx', '.xls', '.csv'].includes(ext)) {
    throw new Error(
      `Unsupported file format "${ext}". Please upload an Excel (.xlsx, .xls) or CSV (.csv) file.`
    );
  }

  let backendRawRecords: RawRecord[] | null = null;
  let backendErrorMsg: string | null = null;

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('sessionId', sessionId);
    if (preferredSheetName) {
      formData.append('sheetName', preferredSheetName);
    }

    const response = await fetch(apiUrl('/api/upload'), {
      method: 'POST',
      body: formData,
    });

    if (response.ok) {
      const data = (await response.json()) as Partial<DatasetSession>;
      if (
        Array.isArray(data.columnProfiles) &&
        Array.isArray(data.processedRows) &&
        data.datasetProfile
      ) {
        return data as DatasetSession;
      }
      if (Array.isArray(data.rawRecords) && data.rawRecords.length > 0) {
        backendRawRecords = data.rawRecords;
      }
    } else {
      backendErrorMsg = await extractBackendError(response, 'POST /api/upload');
    }
  } catch (err: unknown) {
    console.warn('[POST /api/upload] Request failed, parsing uploaded file directly:', err);
  }

  // Parse the user's real uploaded file using the smart multi-sheet & header-row detector
  try {
    const parsed = await parseFileClientSide(file, preferredSheetName);
    return processUniversalDataset(parsed.rawRecords, {
      applyCleaning: true,
      fileName: file.name,
      fileSize: file.size,
      sessionId,
      sheetNames: parsed.sheetNames,
      activeSheetName: parsed.activeSheetName,
    });
  } catch (clientErr: unknown) {
    if (backendRawRecords && backendRawRecords.length > 0) {
      return processUniversalDataset(backendRawRecords, {
        applyCleaning: true,
        fileName: file.name,
        fileSize: file.size,
        sessionId,
        sheetNames: ['Sheet1'],
        activeSheetName: 'Sheet1',
      });
    }
    const reason =
      clientErr instanceof Error
        ? clientErr.message
        : backendErrorMsg || 'Unable to process the file. Please try again or check the backend connection.';
    throw new Error(reason);
  }
}

export async function validateDatasetApi(
  session: DatasetSession
): Promise<DatasetSession> {
  if (!session || !session.rawRecords || session.rawRecords.length === 0) {
    throw new Error('No uploaded dataset found to validate.');
  }

  try {
    const response = await fetch(apiUrl('/api/validate'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: session.sessionId,
        columnMapping: buildBackendColumnMapping(session),
        rawRecords: session.rawRecords,
        fileName: session.fileName,
        fileSize: session.fileSize,
      }),
    });

    if (response.ok) {
      const data = (await response.json()) as Partial<DatasetSession>;
      if (
        Array.isArray(data.columnProfiles) &&
        Array.isArray(data.processedRows) &&
        data.datasetProfile
      ) {
        return data as DatasetSession;
      }
    } else {
      await extractBackendError(response, 'POST /api/validate');
    }
  } catch (err: unknown) {
    console.warn('[POST /api/validate] Request failed, using local validation engine:', err);
  }

  return processUniversalDataset(session.rawRecords, {
    applyCleaning: false,
    fileName: session.fileName,
    fileSize: session.fileSize,
    sessionId: session.sessionId,
    sheetNames: session.sheetNames,
    activeSheetName: session.activeSheetName,
  });
}

export async function cleanDatasetApi(
  session: DatasetSession,
  applyCleaning = true
): Promise<DatasetSession> {
  if (!session || !session.rawRecords || session.rawRecords.length === 0) {
    throw new Error('No uploaded dataset found to clean.');
  }

  try {
    const response = await fetch(apiUrl('/api/clean'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: session.sessionId,
        columnMapping: buildBackendColumnMapping(session),
        rawRecords: session.rawRecords,
        fileName: session.fileName,
        fileSize: session.fileSize,
        applyCleaning,
      }),
    });

    if (response.ok) {
      const data = (await response.json()) as Partial<DatasetSession>;
      if (
        Array.isArray(data.columnProfiles) &&
        Array.isArray(data.processedRows) &&
        data.datasetProfile
      ) {
        return data as DatasetSession;
      }
    } else {
      await extractBackendError(response, 'POST /api/clean');
    }
  } catch (err: unknown) {
    console.warn('[POST /api/clean] Request failed, using local cleaning engine:', err);
  }

  return processUniversalDataset(session.rawRecords, {
    applyCleaning,
    fileName: session.fileName,
    fileSize: session.fileSize,
    sessionId: session.sessionId,
    sheetNames: session.sheetNames,
    activeSheetName: session.activeSheetName,
  });
}

export interface UniversalReconcileApiResponse {
  result: ReconciliationResult;
  fileAColumns: string[];
  fileBColumns: string[];
  config: ReconcileConfig;
  fileARecords: RawRecord[];
  fileBRecords: RawRecord[];
}

export async function runCustomReconciliationApi(params: {
  sessionId: string;
  fileARecords: RawRecord[];
  fileBRecords: RawRecord[];
  config: ReconcileConfig;
  fileAName: string;
  fileBName: string;
}): Promise<ReconciliationResult> {
  if (!params.fileARecords.length || !params.fileBRecords.length) {
    throw new Error('Please upload both File A and File B before running reconciliation.');
  }

  try {
    const response = await fetch(apiUrl('/api/reconcile'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: params.sessionId,
        internalRecords: params.fileARecords,
        externalRecords: params.fileBRecords,
        internalMapping: {
          transactionId: params.config.keyColumnA,
          date: params.config.dateColumnA || '',
          amount: params.config.valueColumnA,
          partyName: params.config.labelColumnA || '',
        },
        externalMapping: {
          transactionId: params.config.keyColumnB,
          date: params.config.dateColumnB || '',
          amount: params.config.valueColumnB,
          partyName: params.config.labelColumnB || '',
        },
        verifyDate: Boolean(params.config.dateColumnA && params.config.dateColumnB),
        internalFileName: params.fileAName,
        externalFileName: params.fileBName,
        useSampleReconciliation: false,
      }),
    });

    if (response.ok) {
      const data = (await response.json()) as { result?: Record<string, unknown> };
      if (data?.result) {
        return adaptBackendReconciliationResult(
          data.result,
          params.config,
          params.fileAName,
          params.fileBName
        );
      }
    } else {
      await extractBackendError(response, 'POST /api/reconcile');
    }
  } catch (err: unknown) {
    console.warn('[POST /api/reconcile] Request failed, using local reconciliation engine:', err);
  }

  return runUniversalReconciliation(
    params.fileARecords,
    params.fileBRecords,
    params.config,
    params.fileAName,
    params.fileBName
  );
}

export async function downloadFormattedExcelReport(params: {
  session: DatasetSession;
  reconciliation?: ReconciliationResult | null;
  filteredRows?: UniversalProcessedRow[];
  reportTitle?: string;
  periodLabel?: string;
  settings: AppSettings;
  downloadFileName?: string;
}): Promise<void> {
  if (!params.session || !params.session.processedRows.length) {
    throw new Error('No active dataset available to generate the report.');
  }

  let arrayBuffer: ArrayBuffer | null = null;
  const rowsForExport = params.filteredRows || params.session.processedRows;

  const backendSessionPayload = {
    ...params.session,
    processedRecords: buildBackendProcessedRecords(params.session, rowsForExport),
  };

  const backendReconPayload = params.reconciliation
    ? {
        ...params.reconciliation,
        items: params.reconciliation.items.map((item) => ({
          ...item,
          transactionId: item.keyValue,
          internalDate: item.dateA,
          externalDate: item.dateB,
          internalAmount: item.valueA,
          externalAmount: item.valueB,
          amountVariance: item.variance,
          explanation: item.explanation,
        })),
      }
    : null;

  try {
    const response = await fetch(apiUrl('/api/report'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: params.session.sessionId,
        session: backendSessionPayload,
        reconciliation: backendReconPayload,
        filteredRows: params.filteredRows,
        reportTitle: params.reportTitle,
        periodLabel: params.periodLabel,
        settings: params.settings,
      }),
    });

    if (response.ok) {
      arrayBuffer = await response.arrayBuffer();
    } else {
      await extractBackendError(response, 'POST /api/report');
    }
  } catch (err: unknown) {
    console.warn('[POST /api/report] Request failed, using client-side ExcelJS generator:', err);
  }

  if (!arrayBuffer) {
    arrayBuffer = await generateFormattedMISWorkbook(
      params.session,
      params.reconciliation,
      params.filteredRows,
      params.reportTitle,
      params.periodLabel,
      params.settings
    );
  }

  const blob = new Blob([arrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = params.downloadFileName || 'MIS_Operations_Executive_Report.xlsx';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportFilteredRowsToExcel(
  session: DatasetSession,
  rows: UniversalProcessedRow[],
  fileName = 'Filtered_MIS_Records.xlsx'
): void {
  const cols = session.uploadedColumns;
  const exportData = rows.map((r) => {
    const obj: Record<string, string | number> = { 'Row #': r.rowIndex };
    for (const c of cols) {
      const val = r.cleanCells[c];
      obj[c] = val !== null && val !== undefined ? val : '';
    }
    obj['Data Validation'] = r.dataValidation;
    obj['Business Status'] = r.businessStatus;
    obj['Status Check'] = r.statusCheck;
    obj['Validation Issues'] =
      r.issues.length > 0 ? r.issues.map((i) => i.message).join('; ') : 'None';
    return obj;
  });

  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Filtered_Records');
  XLSX.writeFile(wb, fileName);
}
