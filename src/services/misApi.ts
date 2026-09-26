import * as XLSX from 'xlsx';
import {
  AppSettings,
  DatasetSession,
  RawRecord,
  ReconcileConfig,
  ReconciliationResult,
  SampleDatasetId,
  UniversalProcessedRow,
} from '../types/mis';
import { generateFormattedMISWorkbook } from '../utils/excelGenerator';
import {
  generateUniversalSampleReconciliation,
  getSampleDatasetById,
  processUniversalDataset,
  runUniversalReconciliation,
} from '../utils/misEngine';
import { parseWorkbookFromData } from '../utils/spreadsheetParser';

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
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('sessionId', sessionId);
    if (preferredSheetName) {
      formData.append('sheetName', preferredSheetName);
    }

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (response.ok) {
      return (await response.json()) as DatasetSession;
    }
    const errData = await response.json().catch(() => null);
    if (errData?.error) {
      throw new Error(errData.error);
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.message.startsWith('Unsupported file')) {
      throw err;
    }
  }

  const parsed = await parseFileClientSide(file, preferredSheetName);
  return processUniversalDataset(parsed.rawRecords, {
    applyCleaning: true,
    fileName: file.name,
    fileSize: file.size,
    sessionId,
    sheetNames: parsed.sheetNames,
    activeSheetName: parsed.activeSheetName,
  });
}

export async function deleteSessionApi(sessionId: string): Promise<void> {
  try {
    await fetch(`/api/session/${encodeURIComponent(sessionId)}`, {
      method: 'DELETE',
    });
  } catch {
    // Fallback if offline or client-only mode
  }
}

export async function loadSampleDatasetApi(
  sessionId: string,
  datasetId: SampleDatasetId = 'transactions',
  applyCleaning = true
): Promise<DatasetSession> {
  try {
    const response = await fetch('/api/sample', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, datasetId, applyCleaning }),
    });
    if (response.ok) {
      return (await response.json()) as DatasetSession;
    }
  } catch {
    // Fallback
  }

  const { fileName, rawRecords } = getSampleDatasetById(datasetId);
  return processUniversalDataset(rawRecords, {
    applyCleaning,
    fileName,
    fileSize: 24576,
    sessionId,
    sheetNames: ['Data'],
    activeSheetName: 'Data',
  });
}

export async function cleanDatasetApi(
  session: DatasetSession,
  applyCleaning = true
): Promise<DatasetSession> {
  try {
    const response = await fetch('/api/clean', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: session.sessionId,
        rawRecords: session.rawRecords,
        fileName: session.fileName,
        fileSize: session.fileSize,
        applyCleaning,
      }),
    });
    if (response.ok) {
      return (await response.json()) as DatasetSession;
    }
  } catch {
    // Fallback
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

export async function loadSampleReconciliationApi(
  sessionId: string
): Promise<UniversalReconcileApiResponse> {
  try {
    const response = await fetch('/api/reconcile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        useSampleReconciliation: true,
      }),
    });
    if (response.ok) {
      return (await response.json()) as UniversalReconcileApiResponse;
    }
  } catch {
    // Fallback
  }

  const sample = generateUniversalSampleReconciliation();
  const result = runUniversalReconciliation(
    sample.fileARecords,
    sample.fileBRecords,
    sample.config,
    sample.fileAName,
    sample.fileBName
  );
  return {
    result,
    fileAColumns: Object.keys(sample.fileARecords[0] || {}),
    fileBColumns: Object.keys(sample.fileBRecords[0] || {}),
    config: sample.config,
    fileARecords: sample.fileARecords,
    fileBRecords: sample.fileBRecords,
  };
}

export async function runCustomReconciliationApi(params: {
  sessionId: string;
  fileARecords: RawRecord[];
  fileBRecords: RawRecord[];
  config: ReconcileConfig;
  fileAName: string;
  fileBName: string;
}): Promise<ReconciliationResult> {
  try {
    const response = await fetch('/api/reconcile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (response.ok) {
      const data = (await response.json()) as UniversalReconcileApiResponse;
      return data.result;
    }
  } catch {
    // Fallback
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
  let arrayBuffer: ArrayBuffer | null = null;

  try {
    const response = await fetch('/api/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: params.session.sessionId,
        session: params.session,
        reconciliation: params.reconciliation,
        filteredRows: params.filteredRows,
        reportTitle: params.reportTitle,
        periodLabel: params.periodLabel,
        settings: params.settings,
      }),
    });

    if (response.ok) {
      arrayBuffer = await response.arrayBuffer();
    }
  } catch {
    // Fallback to client-side ExcelJS generation
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

export function downloadSampleDatasetExcel(datasetId: SampleDatasetId = 'transactions'): void {
  const { fileName, rawRecords } = getSampleDatasetById(datasetId);
  const ws = XLSX.utils.json_to_sheet(rawRecords);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  XLSX.writeFile(wb, fileName);
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
