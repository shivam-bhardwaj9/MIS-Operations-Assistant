import { useCallback, useEffect, useState } from 'react';
import {
  cleanDatasetApi,
  downloadFormattedExcelReport,
  runCustomReconciliationApi,
  UniversalReconcileApiResponse,
  uploadDatasetApi,
} from '../services/misApi';
import {
  AppSettings,
  DatasetSession,
  RawRecord,
  ReconcileConfig,
  UniversalProcessedRow,
} from '../types/mis';
import { DEFAULT_SETTINGS } from '../utils/formatters';
import { processUniversalDataset } from '../utils/misEngine';

export type NavTab =
  | 'dashboard'
  | 'upload'
  | 'explore'
  | 'validation'
  | 'reconciliation'
  | 'reports'
  | 'settings';

export interface NotificationBanner {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

export function useMISState() {
  const [sessionId] = useState<string>(() => `mis-session-${Date.now()}`);
  const [activeTab, setActiveTab] = useState<NavTab>('upload');
  const [session, setSession] = useState<DatasetSession | null>(null);
  const [lastUploadedFile, setLastUploadedFile] = useState<File | null>(null);
  const [fileInputResetKey, setFileInputResetKey] = useState<number>(0);
  const [reconcileState, setReconcileState] =
    useState<UniversalReconcileApiResponse | null>(null);

  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('mis_ops_settings');
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch {
      // ignore
    }
    return DEFAULT_SETTINGS;
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [notification, setNotification] = useState<NotificationBanner | null>(null);

  const notify = useCallback(
    (type: 'success' | 'error' | 'info', title: string, message: string) => {
      const id = String(Date.now());
      setNotification({ id, type, title, message });
    },
    []
  );

  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => {
      setNotification((prev) => (prev?.id === notification.id ? null : prev));
    }, 5500);
    return () => clearTimeout(timer);
  }, [notification]);

  const updateSettings = useCallback(
    (next: Partial<AppSettings>) => {
      setSettings((prev) => {
        const merged = { ...prev, ...next };
        try {
          localStorage.setItem('mis_ops_settings', JSON.stringify(merged));
        } catch {
          // ignore
        }
        return merged;
      });
      notify('success', 'Settings Saved', 'Operational preferences have been updated.');
    },
    [notify]
  );

  const handleUploadFile = useCallback(
    async (file: File, preferredSheetName?: string) => {
      setIsLoading(true);
      if (!preferredSheetName) {
        setSession(null);
        setReconcileState(null);
        setFileInputResetKey((k) => k + 1);
      }
      setLastUploadedFile(file);
      try {
        const data = await uploadDatasetApi(file, sessionId, preferredSheetName);
        setSession(data);
        notify(
          'success',
          `Parsed "${file.name}" (${data.activeSheetName})`,
          `Detected ${data.uploadedColumns.length} columns across ${data.validationSummary.totalRecords} rows: ${data.validationSummary.validRecords} valid, ${data.validationSummary.invalidRecords} invalid.`
        );
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : 'Unable to process the file. Please try again or check the backend connection.';
        notify('error', 'Unable to Process File', msg);
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId, notify]
  );

  const handleSelectWorksheet = useCallback(
    async (sheetName: string) => {
      if (!lastUploadedFile) return;
      await handleUploadFile(lastUploadedFile, sheetName);
    },
    [lastUploadedFile, handleUploadFile]
  );

  const handleDeleteUploadedFile = useCallback(() => {
    setSession(null);
    setReconcileState(null);
    setLastUploadedFile(null);
    setIsLoading(false);
    setIsExporting(false);
    setFileInputResetKey((k) => k + 1);
    setActiveTab('upload');
    notify(
      'success',
      'Uploaded File Deleted',
      'Uploaded file deleted successfully.'
    );
  }, [notify]);

  const handleStartNewAnalysis = useCallback(() => {
    setSession(null);
    setReconcileState(null);
    setLastUploadedFile(null);
    setIsLoading(false);
    setIsExporting(false);
    setFileInputResetKey((k) => k + 1);
    setActiveTab('upload');
    notify(
      'info',
      'Ready for New Analysis',
      'Current analysis cleared. Upload another Excel or CSV file to begin.'
    );
  }, [notify]);

  const handleClearSession = useCallback(() => {
    setSession(null);
    setReconcileState(null);
    setLastUploadedFile(null);
    setIsLoading(false);
    setIsExporting(false);
    setFileInputResetKey((k) => k + 1);
    setActiveTab('upload');
    notify(
      'info',
      'Session Cleared',
      'All in-memory records and reconciliation data have been reset.'
    );
  }, [notify]);

  const handleApplyCleaning = useCallback(
    async (apply = true) => {
      if (!session) return;
      setIsLoading(true);
      try {
        const cleaned = await cleanDatasetApi(session, apply);
        setSession(cleaned);
        notify(
          'success',
          apply ? 'Universal Data Cleaning Active' : 'Displaying Raw Values',
          apply
            ? `Normalized dates, numbers, and categories across ${cleaned.validationSummary.totalRecords} rows while preserving original Raw Data.`
            : 'Showing untouched original cell strings.'
        );
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : 'Unable to process the file. Please try again or check the backend connection.';
        notify('error', 'Processing Error', msg);
      } finally {
        setIsLoading(false);
      }
    },
    [session, notify]
  );

  const handleInlineCellUpdate = useCallback(
    (rowIndex: number, updatedCells: Record<string, string>) => {
      if (!session) return;
      const updatedRaw = session.rawRecords.map((raw, idx) => {
        if (idx + 1 !== rowIndex) return raw;
        return { ...raw, ...updatedCells };
      });

      const reprocessed = processUniversalDataset(updatedRaw, {
        applyCleaning: session.isCleaned,
        fileName: session.fileName,
        fileSize: session.fileSize,
        sessionId: session.sessionId,
        sheetNames: session.sheetNames,
        activeSheetName: session.activeSheetName,
      });
      setSession(reprocessed);
      notify(
        'success',
        `Row #${rowIndex} Updated`,
        `Re-validated dataset: ${reprocessed.validationSummary.validRecords} valid, ${reprocessed.validationSummary.invalidRecords} invalid.`
      );
    },
    [session, notify]
  );

  const handleRemoveDuplicateRows = useCallback(() => {
    if (!session) return;
    const idCol = session.datasetProfile.primaryIdentifierCol;
    const seen = new Set<string>();
    const deduplicatedRaw: RawRecord[] = [];
    let removedCount = 0;

    for (const row of session.rawRecords) {
      const key = idCol
        ? String(row[idCol] ?? '').trim().toUpperCase()
        : session.uploadedColumns.map((c) => String(row[c] ?? '').trim()).join('|');

      if (key && seen.has(key)) {
        removedCount++;
        continue;
      }
      if (key) seen.add(key);
      deduplicatedRaw.push(row);
    }

    if (removedCount === 0) {
      notify('info', 'No Duplicates Found', 'All identifier keys in the dataset are unique.');
      return;
    }

    const reprocessed = processUniversalDataset(deduplicatedRaw, {
      applyCleaning: session.isCleaned,
      fileName: session.fileName,
      fileSize: session.fileSize,
      sessionId: session.sessionId,
      sheetNames: session.sheetNames,
      activeSheetName: session.activeSheetName,
    });
    setSession(reprocessed);
    notify(
      'success',
      'Duplicates Removed',
      `Removed ${removedCount} duplicate record(s), keeping the first occurrence.`
    );
  }, [session, notify]);

  const handleRunCustomReconciliation = useCallback(
    async (params: {
      fileARecords: RawRecord[];
      fileBRecords: RawRecord[];
      config: ReconcileConfig;
      fileAName: string;
      fileBName: string;
    }) => {
      setIsLoading(true);
      try {
        const result = await runCustomReconciliationApi({
          sessionId,
          ...params,
        });
        setReconcileState({
          result,
          fileAColumns: Object.keys(params.fileARecords[0] || {}),
          fileBColumns: Object.keys(params.fileBRecords[0] || {}),
          config: params.config,
          fileARecords: params.fileARecords,
          fileBRecords: params.fileBRecords,
        });
        notify(
          'success',
          'Reconciliation Completed',
          `Matched ${result.summary.matchedCount} records (${result.summary.reconciliationRate}% match rate).`
        );
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : 'Unable to reconcile files. Please try again or check the backend connection.';
        notify('error', 'Reconciliation Error', msg);
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId, notify]
  );

  const handleGenerateExcelReport = useCallback(
    async (options?: {
      filteredRows?: UniversalProcessedRow[];
      reportTitle?: string;
      periodLabel?: string;
      downloadFileName?: string;
    }) => {
      if (!session) {
        notify('error', 'No Active Dataset', 'Please upload an Excel or CSV file first.');
        return;
      }
      setIsExporting(true);
      try {
        await downloadFormattedExcelReport({
          session,
          reconciliation: reconcileState?.result || null,
          filteredRows: options?.filteredRows,
          reportTitle: options?.reportTitle,
          periodLabel: options?.periodLabel,
          settings,
          downloadFileName: options?.downloadFileName,
        });
        notify(
          'success',
          'Multi-Sheet MIS Excel Report Generated',
          'Exported Executive Summary, Dataset Profile, Raw Data, Clean Data, Data Quality, Dynamic Analysis, and Exceptions sheets.'
        );
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : 'Unable to generate Excel workbook. Please try again.';
        notify('error', 'Export Error', msg);
      } finally {
        setIsExporting(false);
      }
    },
    [session, reconcileState, settings, notify]
  );

  return {
    sessionId,
    activeTab,
    setActiveTab,
    session,
    lastUploadedFile,
    fileInputResetKey,
    reconcileState,
    settings,
    updateSettings,
    isLoading,
    isExporting,
    notification,
    dismissNotification: () => setNotification(null),
    notify,
    handleUploadFile,
    handleSelectWorksheet,
    handleDeleteUploadedFile,
    handleStartNewAnalysis,
    handleApplyCleaning,
    handleInlineCellUpdate,
    handleRemoveDuplicateRows,
    handleRunCustomReconciliation,
    handleGenerateExcelReport,
    handleClearSession,
  };
}
