import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  FileSpreadsheet,
  GitCompare,
  Search,
  Upload,
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { parseFileClientSide, UniversalReconcileApiResponse } from '../services/misApi';
import {
  AppSettings,
  DatasetSession,
  RawRecord,
  ReconcileCategory,
  ReconcileConfig,
} from '../types/mis';
import { formatNumber } from '../utils/formatters';

interface ReconciliationPageProps {
  session: DatasetSession | null;
  reconcileState: UniversalReconcileApiResponse | null;
  settings: AppSettings;
  isLoading: boolean;
  onRunCustomReconcile: (params: {
    fileARecords: RawRecord[];
    fileBRecords: RawRecord[];
    config: ReconcileConfig;
    fileAName: string;
    fileBName: string;
  }) => void;
  onNotify: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
}

export function ReconciliationPage({
  session,
  reconcileState,
  settings,
  isLoading,
  onRunCustomReconcile,
  onNotify,
}: ReconciliationPageProps) {
  const fileAInputRef = useRef<HTMLInputElement | null>(null);
  const fileBInputRef = useRef<HTMLInputElement | null>(null);

  const [fileARecords, setFileARecords] = useState<RawRecord[]>([]);
  const [fileBRecords, setFileBRecords] = useState<RawRecord[]>([]);
  const [fileAName, setFileAName] = useState<string>('');
  const [fileBName, setFileBName] = useState<string>('');
  const [fileACols, setFileACols] = useState<string[]>([]);
  const [fileBCols, setFileBCols] = useState<string[]>([]);

  const [config, setConfig] = useState<ReconcileConfig>({
    keyColumnA: '',
    keyColumnB: '',
    valueColumnA: '',
    valueColumnB: '',
    dateColumnA: '',
    dateColumnB: '',
    labelColumnA: '',
    labelColumnB: '',
  });

  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'EXCEPTIONS' | ReconcileCategory>(
    'ALL'
  );
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    if (reconcileState) {
      setFileARecords(reconcileState.fileARecords);
      setFileBRecords(reconcileState.fileBRecords);
      setFileAName(reconcileState.result.fileAName);
      setFileBName(reconcileState.result.fileBName);
      setFileACols(reconcileState.fileAColumns);
      setFileBCols(reconcileState.fileBColumns);
      setConfig(reconcileState.config);
    } else {
      setFileARecords([]);
      setFileBRecords([]);
      setFileAName('');
      setFileBName('');
      setFileACols([]);
      setFileBCols([]);
      setConfig({
        keyColumnA: '',
        keyColumnB: '',
        valueColumnA: '',
        valueColumnB: '',
        dateColumnA: '',
        dateColumnB: '',
        labelColumnA: '',
        labelColumnB: '',
      });
      setCategoryFilter('ALL');
      setSearchQuery('');
    }
  }, [reconcileState]);

  const handleUploadFileA = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = await parseFileClientSide(file);
      const cols = Object.keys(parsed.rawRecords[0] || {});
      setFileARecords(parsed.rawRecords);
      setFileAName(file.name);
      setFileACols(cols);
      setConfig((prev) => ({
        ...prev,
        keyColumnA: cols[0] || '',
        valueColumnA: cols.find((c) => /amount|value|qty|revenue|cost|salary/i.test(c)) || cols[1] || '',
        dateColumnA: cols.find((c) => /date|dt/i.test(c)) || '',
      }));
      onNotify('info', 'File A Loaded', `Loaded "${file.name}" (${parsed.rawRecords.length} rows).`);
    } catch (err: unknown) {
      onNotify('error', 'File A Error', err instanceof Error ? err.message : 'Invalid file');
    }
    e.target.value = '';
  };

  const handleUploadFileB = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = await parseFileClientSide(file);
      const cols = Object.keys(parsed.rawRecords[0] || {});
      setFileBRecords(parsed.rawRecords);
      setFileBName(file.name);
      setFileBCols(cols);
      setConfig((prev) => ({
        ...prev,
        keyColumnB: cols[0] || '',
        valueColumnB: cols.find((c) => /amount|value|qty|revenue|cost|salary/i.test(c)) || cols[1] || '',
        dateColumnB: cols.find((c) => /date|dt/i.test(c)) || '',
      }));
      onNotify('info', 'File B Loaded', `Loaded "${file.name}" (${parsed.rawRecords.length} rows).`);
    } catch (err: unknown) {
      onNotify('error', 'File B Error', err instanceof Error ? err.message : 'Invalid file');
    }
    e.target.value = '';
  };

  const handleUseCurrentSessionForFileA = () => {
    if (!session) return;
    const cols = session.uploadedColumns;
    setFileARecords(session.rawRecords);
    setFileAName(session.fileName);
    setFileACols(cols);
    setConfig((prev) => ({
      ...prev,
      keyColumnA: session.datasetProfile.primaryIdentifierCol || cols[0] || '',
      valueColumnA: session.datasetProfile.primaryNumericCol || cols[1] || '',
      dateColumnA: session.datasetProfile.primaryDateCol || '',
      labelColumnA: session.datasetProfile.primaryNameCol || '',
    }));
    onNotify('info', 'Assigned Active Dataset as File A', `Using "${session.fileName}" as File A.`);
  };

  const triggerReconcile = () => {
    if (!fileARecords.length || !fileBRecords.length) {
      onNotify('error', 'Two Files Required', 'Please upload both File A and File B first.');
      return;
    }
    if (!config.keyColumnA || !config.keyColumnB) {
      onNotify('error', 'Matching Key Required', 'Select the matching key column for both files.');
      return;
    }
    onRunCustomReconcile({
      fileARecords,
      fileBRecords,
      config,
      fileAName: fileAName || 'File_A.xlsx',
      fileBName: fileBName || 'File_B.xlsx',
    });
  };

  const filteredItems = useMemo(() => {
    const items = reconcileState?.result.items ?? [];
    const q = searchQuery.trim().toLowerCase();

    return items.filter((item) => {
      if (categoryFilter === 'EXCEPTIONS' && item.category === 'Matched') return false;
      if (
        categoryFilter !== 'ALL' &&
        categoryFilter !== 'EXCEPTIONS' &&
        item.category !== categoryFilter
      ) {
        return false;
      }
      if (q) {
        const hay = `${item.keyValue} ${item.label} ${item.category} ${item.explanation}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [reconcileState, categoryFilter, searchQuery]);

  const summary = reconcileState?.result.summary;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Universal Two-Dataset Reconciliation (File A vs File B)
          </h2>
          <p className="text-sm text-slate-600">
            Upload two Excel/CSV datasets, select any matching identifier key (Order ID,
            Transaction ID, SKU, Employee ID), and compare numeric values, dates, or quantities.
          </p>
        </div>
      </div>

      {/* File A & File B Upload & Column Selectors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* File A */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-500">Dataset 1</div>
              <h3 className="text-sm font-bold text-slate-900">File A (Primary / Internal)</h3>
            </div>
            <div className="flex items-center gap-2">
              {session && (
                <button
                  type="button"
                  onClick={handleUseCurrentSessionForFileA}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                >
                  Use Active Dataset
                </button>
              )}
              <input
                ref={fileAInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleUploadFileA}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileAInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 whitespace-nowrap"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload File A</span>
              </button>
            </div>
          </div>

          {fileARecords.length > 0 ? (
            <div className="space-y-3 pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
                  <span>{fileAName}</span>
                </span>
                <span className="font-mono tabular-nums text-slate-500">
                  {fileARecords.length} rows
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-slate-500 mb-1 font-medium">Matching Key *</label>
                  <select
                    value={config.keyColumnA}
                    onChange={(e) => setConfig({ ...config, keyColumnA: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium"
                  >
                    <option value="">-- Select --</option>
                    {fileACols.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 mb-1 font-medium">
                    Numeric Value Col
                  </label>
                  <select
                    value={config.valueColumnA}
                    onChange={(e) => setConfig({ ...config, valueColumnA: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium"
                  >
                    <option value="">-- Select --</option>
                    {fileACols.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 mb-1 font-medium">Date Column</label>
                  <select
                    value={config.dateColumnA || ''}
                    onChange={(e) => setConfig({ ...config, dateColumnA: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium"
                  >
                    <option value="">-- Optional --</option>
                    {fileACols.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
              No File A uploaded yet.
            </div>
          )}
        </div>

        {/* File B */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-500">Dataset 2</div>
              <h3 className="text-sm font-bold text-slate-900">File B (Comparison / External)</h3>
            </div>
            <div>
              <input
                ref={fileBInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleUploadFileB}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileBInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 whitespace-nowrap"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload File B</span>
              </button>
            </div>
          </div>

          {fileBRecords.length > 0 ? (
            <div className="space-y-3 pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
                  <span>{fileBName}</span>
                </span>
                <span className="font-mono tabular-nums text-slate-500">
                  {fileBRecords.length} rows
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-slate-500 mb-1 font-medium">Matching Key *</label>
                  <select
                    value={config.keyColumnB}
                    onChange={(e) => setConfig({ ...config, keyColumnB: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium"
                  >
                    <option value="">-- Select --</option>
                    {fileBCols.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 mb-1 font-medium">
                    Numeric Value Col
                  </label>
                  <select
                    value={config.valueColumnB}
                    onChange={(e) => setConfig({ ...config, valueColumnB: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium"
                  >
                    <option value="">-- Select --</option>
                    {fileBCols.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 mb-1 font-medium">Date Column</label>
                  <select
                    value={config.dateColumnB || ''}
                    onChange={(e) => setConfig({ ...config, dateColumnB: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium"
                  >
                    <option value="">-- Optional --</option>
                    {fileBCols.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
              No File B uploaded yet.
            </div>
          )}
        </div>
      </div>

      {(fileARecords.length > 0 || fileBRecords.length > 0) && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-end">
          <button
            type="button"
            disabled={isLoading}
            onClick={triggerReconcile}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 transition-colors disabled:opacity-50"
          >
            <GitCompare className="w-4 h-4" />
            <span>{isLoading ? 'Reconciling...' : 'Run Reconciliation'}</span>
          </button>
        </div>
      )}

      {summary && reconcileState && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <button
              type="button"
              onClick={() => setCategoryFilter('Matched')}
              className="text-left bg-white border border-slate-200 rounded-xl p-4 hover:bg-slate-50"
            >
              <div className="text-xs text-slate-500">Matched</div>
              <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-emerald-700">
                {formatNumber(summary.matchedCount, settings)}
              </div>
            </button>

            <button
              type="button"
              onClick={() => setCategoryFilter('Missing in File A')}
              className="text-left bg-white border border-slate-200 rounded-xl p-4 hover:bg-slate-50"
            >
              <div className="text-xs text-slate-500">Missing in File A</div>
              <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-rose-700">
                {formatNumber(summary.missingInACount, settings)}
              </div>
            </button>

            <button
              type="button"
              onClick={() => setCategoryFilter('Missing in File B')}
              className="text-left bg-white border border-slate-200 rounded-xl p-4 hover:bg-slate-50"
            >
              <div className="text-xs text-slate-500">Missing in File B</div>
              <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-orange-700">
                {formatNumber(summary.missingInBCount, settings)}
              </div>
            </button>

            <button
              type="button"
              onClick={() => setCategoryFilter('Value Mismatch')}
              className="text-left bg-white border border-slate-200 rounded-xl p-4 hover:bg-slate-50"
            >
              <div className="text-xs text-slate-500">Value Mismatch</div>
              <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-amber-700">
                {formatNumber(summary.valueMismatchCount, settings)}
              </div>
            </button>

            <button
              type="button"
              onClick={() => setCategoryFilter('Duplicate')}
              className="text-left bg-white border border-slate-200 rounded-xl p-4 hover:bg-slate-50"
            >
              <div className="text-xs text-slate-500">Duplicates</div>
              <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-purple-700">
                {formatNumber(summary.duplicateCount, settings)}
              </div>
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(
                [
                  { id: 'ALL', label: `All (${reconcileState.result.items.length})` },
                  {
                    id: 'EXCEPTIONS',
                    label: `Mismatches (${
                      reconcileState.result.items.length - summary.matchedCount
                    })`,
                  },
                  { id: 'Value Mismatch', label: 'Value Mismatch' },
                  { id: 'Missing in File A', label: 'Missing in File A' },
                  { id: 'Missing in File B', label: 'Missing in File B' },
                  { id: 'Duplicate', label: 'Duplicate' },
                  { id: 'Matched', label: 'Matched' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setCategoryFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                    categoryFilter === tab.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative w-full lg:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Key or Label..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                    <th className="py-3 px-4">Matching Key</th>
                    <th className="py-3 px-4">Classification</th>
                    <th className="py-3 px-4">Label</th>
                    <th className="py-3 px-4">File A Date</th>
                    <th className="py-3 px-4">File B Date</th>
                    <th className="py-3 px-4 text-right">File A Value</th>
                    <th className="py-3 px-4 text-right">File B Value</th>
                    <th className="py-3 px-4 text-right">Variance (Δ)</th>
                    <th className="py-3 px-4">Explanation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono tabular-nums font-semibold text-slate-900">
                        {item.keyValue}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge value={item.category} variant="reconcile" />
                      </td>
                      <td className="py-3 px-4 text-slate-800">{item.label}</td>
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-600">
                        {item.dateA || '—'}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-600">
                        {item.dateB || '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-medium">
                        {item.valueA !== null ? formatNumber(item.valueA, settings) : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-medium">
                        {item.valueB !== null ? formatNumber(item.valueB, settings) : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        {item.variance === 0 ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>0</span>
                          </span>
                        ) : item.variance !== null ? (
                          <span className="font-semibold text-rose-700">
                            {item.variance > 0 ? '+' : ''}
                            {formatNumber(item.variance, settings)}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{item.explanation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
