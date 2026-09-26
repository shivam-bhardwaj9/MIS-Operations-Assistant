import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit3,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { NavTab } from '../hooks/useMISState';
import { exportFilteredRowsToExcel } from '../services/misApi';
import {
  AppSettings,
  DatasetSession,
  UniversalProcessedRow,
} from '../types/mis';
import { formatCurrency, formatNumber } from '../utils/formatters';

interface DataValidationPageProps {
  session: DatasetSession | null;
  settings: AppSettings;
  onApplyCleaning: (apply?: boolean) => void;
  onRemoveDuplicates: () => void;
  onInlineCellUpdate: (rowIndex: number, updatedCells: Record<string, string>) => void;
  onNavigate: (tab: NavTab) => void;
}

type FilterMode =
  | 'all'
  | 'valid'
  | 'data_errors'
  | 'business_review'
  | 'all_review'
  | 'duplicates'
  | 'missing';

export function DataValidationPage({
  session,
  settings,
  onApplyCleaning,
  onRemoveDuplicates,
  onInlineCellUpdate,
  onNavigate,
}: DataValidationPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);

  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<Record<string, string>>({});

  const filteredRows = useMemo(() => {
    if (!session) return [];
    const q = searchQuery.trim().toLowerCase();

    return session.processedRows.filter((row) => {
      if (filterMode === 'valid' && !row.isValid) return false;
      if (filterMode === 'data_errors' && row.isValid) return false;
      if (
        filterMode === 'business_review' &&
        row.statusCheckReason !== 'Business Status'
      ) {
        return false;
      }
      if (filterMode === 'all_review' && row.statusCheck !== 'Review Needed') {
        return false;
      }
      if (filterMode === 'duplicates' && !row.isDuplicateIdentifier) return false;
      if (
        filterMode === 'missing' &&
        !row.issues.some((i) => i.code === 'MISSING_VALUE')
      ) {
        return false;
      }

      if (q) {
        const cellText = Object.values(row.cleanCells)
          .map((v) => String(v ?? ''))
          .join(' ');
        const issueText = row.issues.map((i) => i.message).join(' ');
        const hay = `${cellText} ${issueText} ${row.dataValidation} ${row.businessStatus}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [session, filterMode, searchQuery]);

  if (!session) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center max-w-xl mx-auto my-8 space-y-4">
        <div className="text-base font-bold text-slate-900">
          No Dataset Uploaded for Validation
        </div>
        <p className="text-xs text-slate-600">
          Upload an Excel (.xlsx, .xls) or CSV (.csv) file to inspect Data Validity vs Business
          Status and resolve exceptions.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('upload')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Upload Excel / CSV</span>
        </button>
      </div>
    );
  }

  const { validationSummary, columnProfiles, uploadedColumns } = session;
  const colProfileMap = new Map(columnProfiles.map((c) => [c.name, c]));

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedRows = filteredRows.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  const startEditing = (row: UniversalProcessedRow) => {
    setEditingRow(row.rowIndex);
    const initial: Record<string, string> = {};
    for (const col of uploadedColumns) {
      const val = row.cleanCells[col];
      initial[col] = val !== null && val !== undefined ? String(val) : row.rawCells[col] || '';
    }
    setEditDraft(initial);
  };

  const saveEdit = (rowIndex: number) => {
    onInlineCellUpdate(rowIndex, editDraft);
    setEditingRow(null);
  };

  return (
    <div className="space-y-6">
      {/* Header & Separation of Data Validity vs Business Status Explanation */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Universal Data Validation & Exception Inspector
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Strict separation enforced: <strong>Data Validation</strong> checks structural data
              quality (VALID / ERROR), while <strong>Business Status</strong> tracks operational
              state (e.g. Pending, Failed, Open, On Leave → Review Needed).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onApplyCleaning(!session.isCleaned)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>
                {session.isCleaned ? 'Showing Cleaned Data' : 'Apply Data Cleaning'}
              </span>
            </button>

            {validationSummary.duplicatesCount > 0 && (
              <button
                type="button"
                onClick={onRemoveDuplicates}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-rose-300 bg-rose-50 text-xs font-semibold text-rose-800 hover:bg-rose-100 transition-colors whitespace-nowrap"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Deduplicate IDs ({validationSummary.duplicatesCount})</span>
              </button>
            )}

            <button
              type="button"
              onClick={() =>
                exportFilteredRowsToExcel(
                  session,
                  filteredRows,
                  `Validated_${session.fileName.replace(/\.[^.]+$/, '')}.xlsx`
                )
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Filtered ({filteredRows.length})</span>
            </button>
          </div>
        </div>

        {/* Interactive Filter Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => {
              setFilterMode('all');
              setPage(1);
            }}
            className={`text-left p-3 rounded-lg border transition-colors ${
              filterMode === 'all'
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-900'
            }`}
          >
            <div className={`text-xs ${filterMode === 'all' ? 'text-slate-300' : 'text-slate-500'}`}>
              Total Rows
            </div>
            <div className="mt-1 text-lg font-bold font-mono tabular-nums">
              {validationSummary.totalRecords}
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setFilterMode('valid');
              setPage(1);
            }}
            className={`text-left p-3 rounded-lg border transition-colors ${
              filterMode === 'valid'
                ? 'border-emerald-700 bg-emerald-700 text-white'
                : 'border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-900'
            }`}
          >
            <div className={`text-xs ${filterMode === 'valid' ? 'text-emerald-100' : 'text-emerald-700'}`}>
              Data Valid (VALID)
            </div>
            <div className="mt-1 text-lg font-bold font-mono tabular-nums">
              {validationSummary.validRecords}
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setFilterMode('data_errors');
              setPage(1);
            }}
            className={`text-left p-3 rounded-lg border transition-colors ${
              filterMode === 'data_errors'
                ? 'border-rose-700 bg-rose-700 text-white'
                : 'border-rose-200 bg-rose-50/50 hover:bg-rose-50 text-rose-900'
            }`}
          >
            <div className={`text-xs ${filterMode === 'data_errors' ? 'text-rose-100' : 'text-rose-700'}`}>
              Data Errors (ERROR)
            </div>
            <div className="mt-1 text-lg font-bold font-mono tabular-nums">
              {validationSummary.invalidRecords}
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setFilterMode('business_review');
              setPage(1);
            }}
            className={`text-left p-3 rounded-lg border transition-colors ${
              filterMode === 'business_review'
                ? 'border-amber-600 bg-amber-600 text-white'
                : 'border-amber-200 bg-amber-50/50 hover:bg-amber-50 text-amber-900'
            }`}
          >
            <div
              className={`text-xs ${
                filterMode === 'business_review' ? 'text-amber-100' : 'text-amber-800'
              }`}
            >
              Valid · Biz Review
            </div>
            <div className="mt-1 text-lg font-bold font-mono tabular-nums">
              {validationSummary.businessReviewCount}
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setFilterMode('all_review');
              setPage(1);
            }}
            className={`text-left p-3 rounded-lg border transition-colors ${
              filterMode === 'all_review'
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-900'
            }`}
          >
            <div
              className={`text-xs ${
                filterMode === 'all_review' ? 'text-slate-300' : 'text-slate-500'
              }`}
            >
              Total Review Needed
            </div>
            <div className="mt-1 text-lg font-bold font-mono tabular-nums">
              {validationSummary.recordsRequiringReview}
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setFilterMode('duplicates');
              setPage(1);
            }}
            className={`text-left p-3 rounded-lg border transition-colors ${
              filterMode === 'duplicates'
                ? 'border-rose-700 bg-rose-700 text-white'
                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-900'
            }`}
          >
            <div
              className={`text-xs ${
                filterMode === 'duplicates' ? 'text-rose-100' : 'text-slate-500'
              }`}
            >
              Duplicate IDs
            </div>
            <div className="mt-1 text-lg font-bold font-mono tabular-nums">
              {validationSummary.duplicatesCount}
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setFilterMode('missing');
              setPage(1);
            }}
            className={`text-left p-3 rounded-lg border transition-colors ${
              filterMode === 'missing'
                ? 'border-rose-700 bg-rose-700 text-white'
                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-900'
            }`}
          >
            <div
              className={`text-xs ${
                filterMode === 'missing' ? 'text-rose-100' : 'text-slate-500'
              }`}
            >
              Missing Values
            </div>
            <div className="mt-1 text-lg font-bold font-mono tabular-nums">
              {validationSummary.missingFieldsCount}
            </div>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search across all columns, IDs, statuses, or validation issues..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>

        {(searchQuery || filterMode !== 'all') && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setFilterMode('all');
              setPage(1);
            }}
            className="text-xs font-semibold text-rose-700 hover:underline"
          >
            Reset Active Filters
          </button>
        )}
      </div>

      {/* Universal Dynamic Schema Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                <th className="py-3 px-3 whitespace-nowrap">#</th>
                {uploadedColumns.map((col) => {
                  const prof = colProfileMap.get(col);
                  return (
                    <th
                      key={col}
                      className={`py-3 px-3 whitespace-nowrap ${
                        prof?.dataType === 'numeric' ? 'text-right' : 'text-left'
                      }`}
                    >
                      {col}
                    </th>
                  );
                })}
                <th className="py-3 px-3 whitespace-nowrap">Data Validation</th>
                <th className="py-3 px-3 whitespace-nowrap">Status Check</th>
                <th className="py-3 px-3 whitespace-nowrap">Validation / Audit Notes</th>
                <th className="py-3 px-3 text-right whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={uploadedColumns.length + 5}
                    className="py-10 text-center text-slate-500"
                  >
                    No records match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row) => {
                  const isEditing = editingRow === row.rowIndex;

                  if (isEditing) {
                    return (
                      <tr key={row.rowIndex} className="bg-amber-50/40">
                        <td className="py-2.5 px-3 font-mono tabular-nums text-slate-500">
                          {row.rowIndex}
                        </td>
                        {uploadedColumns.map((col) => (
                          <td key={col} className="py-2 px-2">
                            <input
                              type="text"
                              value={editDraft[col] ?? ''}
                              onChange={(e) =>
                                setEditDraft({ ...editDraft, [col]: e.target.value })
                              }
                              className="w-full min-w-[90px] px-2 py-1 border border-slate-300 rounded bg-white text-xs font-mono"
                            />
                          </td>
                        ))}
                        <td colSpan={3} className="py-2.5 px-3 text-slate-500 italic">
                          Editing Row #{row.rowIndex}
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => saveEdit(row.rowIndex)}
                              className="p-1.5 rounded bg-emerald-700 text-white hover:bg-emerald-800"
                              title="Save"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingRow(null)}
                              className="p-1.5 rounded bg-slate-200 text-slate-700 hover:bg-slate-300"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr
                      key={row.rowIndex}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        !row.isValid ? 'bg-rose-50/20' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-mono tabular-nums text-slate-400">
                        {row.rowIndex}
                      </td>
                      {uploadedColumns.map((col) => {
                        const prof = colProfileMap.get(col);
                        const cellVal = row.cleanCells[col];
                        const hasColError = row.issues.some((i) => i.column === col);

                        if (prof?.semanticRole === 'Status') {
                          return (
                            <td key={col} className="py-2.5 px-3 whitespace-nowrap">
                              <StatusBadge
                                value={String(cellVal ?? '(Missing)')}
                                variant="status"
                              />
                            </td>
                          );
                        }

                        if (prof?.dataType === 'numeric') {
                          const num = row.numericValues[col];
                          return (
                            <td
                              key={col}
                              className={`py-2.5 px-3 text-right font-mono tabular-nums whitespace-nowrap ${
                                hasColError
                                  ? 'text-rose-700 font-bold'
                                  : 'text-slate-900 font-semibold'
                              }`}
                            >
                              {num !== null && num !== undefined
                                ? prof.semanticRole === 'Currency'
                                  ? formatCurrency(num, settings)
                                  : prof.semanticRole === 'Percentage'
                                  ? `${num}%`
                                  : formatNumber(num, settings)
                                : cellVal
                                ? `Invalid (${cellVal})`
                                : '(Missing)'}
                            </td>
                          );
                        }

                        return (
                          <td
                            key={col}
                            className={`py-2.5 px-3 max-w-[200px] truncate ${
                              prof?.dataType === 'date' || prof?.dataType === 'identifier'
                                ? 'font-mono tabular-nums'
                                : ''
                            } ${
                              hasColError
                                ? 'text-rose-700 font-semibold'
                                : 'text-slate-800'
                            }`}
                            title={String(cellVal ?? '')}
                          >
                            {cellVal !== null && cellVal !== undefined && String(cellVal) !== ''
                              ? String(cellVal)
                              : '(Missing)'}
                          </td>
                        );
                      })}

                      {/* Data Validation Column (Strictly Structural Validity) */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <StatusBadge value={row.dataValidation} variant="validation" />
                      </td>

                      {/* Status Check Column (Operational Review Indicator) */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <StatusBadge value={row.statusCheck} variant="check" />
                      </td>

                      {/* Detailed Explanation of Either Data Error or Business Status Review */}
                      <td className="py-2.5 px-3">
                        {row.issues.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {row.issues.map((iss, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 text-xs font-medium text-rose-700 whitespace-nowrap"
                              >
                                <AlertTriangle className="w-3 h-3 shrink-0" />
                                <span>{iss.message}</span>
                              </span>
                            ))}
                          </div>
                        ) : row.statusCheck === 'Review Needed' ? (
                          <span className="text-xs text-amber-800 font-medium whitespace-nowrap">
                            Valid data · Business Status = {row.businessStatus}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-medium whitespace-nowrap">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>Valid & Settled</span>
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => startEditing(row)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-3">
            <span>
              Showing{' '}
              <strong className="font-mono tabular-nums text-slate-900">
                {filteredRows.length === 0 ? 0 : (safePage - 1) * pageSize + 1}
              </strong>{' '}
              to{' '}
              <strong className="font-mono tabular-nums text-slate-900">
                {Math.min(safePage * pageSize, filteredRows.length)}
              </strong>{' '}
              of{' '}
              <strong className="font-mono tabular-nums text-slate-900">
                {filteredRows.length}
              </strong>{' '}
              records
            </span>

            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="px-2 py-1 rounded border border-slate-300 bg-white text-xs font-mono"
            >
              <option value={10}>10 / page</option>
              <option value={15}>15 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>
            <span className="px-2 font-mono tabular-nums">
              Page {safePage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
