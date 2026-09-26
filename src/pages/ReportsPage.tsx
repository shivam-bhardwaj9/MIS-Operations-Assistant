import { useMemo, useState } from 'react';
import { CheckCircle2, Download, FileSpreadsheet, Upload } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { NavTab } from '../hooks/useMISState';
import {
  AppSettings,
  DatasetSession,
  ReconciliationResult,
  ReportPeriodType,
  UniversalProcessedRow,
} from '../types/mis';
import { formatCurrency, formatNumber } from '../utils/formatters';

interface ReportsPageProps {
  session: DatasetSession | null;
  reconciliation: ReconciliationResult | null;
  settings: AppSettings;
  isExporting: boolean;
  onGenerateExcel: (options?: {
    filteredRows?: UniversalProcessedRow[];
    reportTitle?: string;
    periodLabel?: string;
    downloadFileName?: string;
  }) => void;
  onNavigate: (tab: NavTab) => void;
}

export function ReportsPage({
  session,
  reconciliation,
  settings,
  isExporting,
  onGenerateExcel,
  onNavigate,
}: ReportsPageProps) {
  const [periodType, setPeriodType] = useState<ReportPeriodType>('all');
  const [selectedDailyDate, setSelectedDailyDate] = useState<string>('');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  const availableDates = useMemo(() => {
    if (!session || !session.datasetProfile.primaryDateCol) return [];
    const dateCol = session.datasetProfile.primaryDateCol;
    return Array.from(
      new Set(session.processedRows.map((r) => r.isoDates[dateCol]).filter(Boolean))
    ).sort();
  }, [session]);

  const activeDailyDate =
    selectedDailyDate || availableDates[availableDates.length - 1] || '';

  const scopedRows = useMemo(() => {
    if (!session) return [];
    const dateCol = session.datasetProfile.primaryDateCol;
    if (!dateCol || periodType === 'all') return session.processedRows;

    if (periodType === 'daily' && activeDailyDate) {
      return session.processedRows.filter((r) => r.isoDates[dateCol] === activeDailyDate);
    }

    if (periodType === 'weekly' && availableDates.length > 0) {
      const latestIso = availableDates[availableDates.length - 1];
      const latestObj = new Date(latestIso);
      const sevenDaysAgo = new Date(latestObj.getTime() - 6 * 86400 * 1000)
        .toISOString()
        .slice(0, 10);
      return session.processedRows.filter(
        (r) =>
          !r.isoDates[dateCol] ||
          (r.isoDates[dateCol] >= sevenDaysAgo && r.isoDates[dateCol] <= latestIso)
      );
    }

    if (periodType === 'custom') {
      return session.processedRows.filter((r) => {
        const d = r.isoDates[dateCol];
        if (!d) return true;
        if (customStart && d < customStart) return false;
        if (customEnd && d > customEnd) return false;
        return true;
      });
    }

    return session.processedRows;
  }, [session, periodType, activeDailyDate, availableDates, customStart, customEnd]);

  if (!session) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center max-w-xl mx-auto my-8 space-y-4">
        <div className="text-base font-bold text-slate-900">
          No Dataset Uploaded for Report Generation
        </div>
        <p className="text-xs text-slate-600">
          Upload an Excel (.xlsx, .xls) or CSV (.csv) file to generate a multi-sheet MIS report.
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

  const { datasetProfile, statusDistribution, typeDistribution } = session;
  const primaryNumCol = datasetProfile.primaryNumericCol;
  const primaryStatusCol = datasetProfile.primaryStatusCol;
  const primaryCatCol = datasetProfile.primaryCategoryCol || datasetProfile.primaryTypeCol;
  const primaryColProfile = session.columnProfiles.find((c) => c.name === primaryNumCol);
  const isCurrency = primaryColProfile?.semanticRole === 'Currency';
  const fmtVal = (v: number) =>
    isCurrency ? formatCurrency(v, settings) : formatNumber(v, settings);

  const validScopedCount = scopedRows.filter((r) => r.isValid).length;
  const invalidScopedCount = scopedRows.length - validScopedCount;
  const exceptionRows = scopedRows.filter(
    (r) => !r.isValid || r.statusCheck === 'Review Needed'
  );

  const sheetsIncluded = [
    { name: 'Sheet 1: Executive Summary', desc: 'Dataset health, dynamic KPIs & insights' },
    { name: 'Sheet 2: Dataset Profile', desc: `${session.columnProfiles.length} columns profiled` },
    { name: 'Sheet 3: Raw Data', desc: 'Original untouched uploaded records' },
    { name: 'Sheet 4: Clean Data', desc: 'Normalized records + Data Validation & Status Check' },
    { name: 'Sheet 5: Data Quality', desc: 'Validation rules, duplicates & missing cells' },
    { name: 'Sheet 6: Dynamic Analysis', desc: `Grouped breakdown by ${primaryCatCol || 'Category'}` },
    { name: 'Sheet 7: Exceptions', desc: `${exceptionRows.length} ERROR / WARNING / REVIEW rows` },
  ];

  if (reconciliation && reconciliation.items.length > 0) {
    sheetsIncluded.push({
      name: 'Sheet 8: Reconciliation',
      desc: `${reconciliation.items.length} reconciled rows (${reconciliation.fileAName} vs ${reconciliation.fileBName})`,
    });
  }

  return (
    <div className="space-y-6">
      {/* Header & Export CTA */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Universal MIS Report Generator & Multi-Sheet Excel Export
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Generates a professionally formatted {sheetsIncluded.length}-sheet{' '}
            <code>.xlsx</code> workbook for <strong>{session.fileName}</strong>.
          </p>
        </div>

        <button
          type="button"
          disabled={isExporting}
          onClick={() =>
            onGenerateExcel({
              filteredRows: scopedRows,
              reportTitle: `MIS Executive Report - ${session.fileName}`,
              periodLabel: `${periodType.toUpperCase()} Scope (${scopedRows.length} rows)`,
              downloadFileName: `MIS_Report_${session.fileName.replace(/\.[^.]+$/, '')}.xlsx`,
            })
          }
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors whitespace-nowrap disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          <span>
            {isExporting ? 'Generating Workbook...' : 'Generate MIS Excel Report'}
          </span>
        </button>
      </div>

      {/* Period Filter */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          {(
            [
              { id: 'all', label: 'Full Dataset' },
              { id: 'daily', label: 'Daily Report' },
              { id: 'weekly', label: 'Weekly Report' },
              { id: 'custom', label: 'Custom Date Range' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setPeriodType(t.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                periodType === t.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {periodType === 'daily' && availableDates.length > 0 && (
          <select
            value={activeDailyDate}
            onChange={(e) => setSelectedDailyDate(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-mono text-xs"
          >
            {availableDates.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        )}

        {periodType === 'custom' && (
          <div className="flex items-center gap-2 text-xs">
            <span>From:</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-2.5 py-1 rounded border border-slate-300 font-mono"
            />
            <span>To:</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-2.5 py-1 rounded border border-slate-300 font-mono"
            />
          </div>
        )}
      </div>

      {/* Included Worksheets Preview */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-3">
          <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
          <span>
            Exported Excel Workbook Structure ({sheetsIncluded.length} Sheets)
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {sheetsIncluded.map((s) => (
            <div
              key={s.name}
              className="p-3 rounded-lg bg-slate-50 border border-slate-200"
            >
              <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{s.name}</span>
              </div>
              <div className="text-slate-500 mt-1">{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Status Summary & Primary Category Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {statusDistribution.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                Business Status Summary ({primaryStatusCol})
              </h3>
              <span className="text-xs font-mono text-slate-500">
                Valid Data vs Business State
              </span>
            </div>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                  <th className="py-2.5 px-4">{primaryStatusCol}</th>
                  <th className="py-2.5 px-4 text-right">Total Count</th>
                  <th className="py-2.5 px-4 text-right">Data Valid Count</th>
                  <th className="py-2.5 px-4 text-right">Share (%)</th>
                  {primaryNumCol && (
                    <th className="py-2.5 px-4 text-right">Total {primaryNumCol}</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {statusDistribution.map((s) => (
                  <tr key={s.name}>
                    <td className="py-2.5 px-4">
                      <StatusBadge value={s.name} variant="status" />
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums font-medium">
                      {s.count}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-emerald-700">
                      {s.validCount}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-500">
                      {s.percentage}%
                    </td>
                    {primaryNumCol && (
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold">
                        {fmtVal(s.amount)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {typeDistribution.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                Dimension Breakdown ({primaryCatCol})
              </h3>
              <span className="text-xs font-mono text-slate-500">
                Sheet 6 in Workbook
              </span>
            </div>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                  <th className="py-2.5 px-4">{primaryCatCol}</th>
                  <th className="py-2.5 px-4 text-right">Count</th>
                  <th className="py-2.5 px-4 text-right">Share (%)</th>
                  {primaryNumCol && (
                    <th className="py-2.5 px-4 text-right">Total {primaryNumCol}</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {typeDistribution.slice(0, 8).map((c) => (
                  <tr key={c.category}>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">
                      {c.category}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                      {c.count}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-500">
                      {c.percentage}%
                    </td>
                    {primaryNumCol && (
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold">
                        {fmtVal(c.amount)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Universal Exception Report Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Universal Exception & Review Report ({exceptionRows.length} Records)
            </h3>
            <p className="text-xs text-slate-500">
              Separates structural Data Quality Errors ({invalidScopedCount}) from valid records
              with actionable Business Status.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600 sticky top-0">
                <th className="py-2.5 px-4">Row #</th>
                <th className="py-2.5 px-4">
                  {datasetProfile.primaryIdentifierCol || 'Identifier'}
                </th>
                <th className="py-2.5 px-4">
                  {datasetProfile.primaryNameCol || 'Label'}
                </th>
                <th className="py-2.5 px-4">Data Validation</th>
                <th className="py-2.5 px-4">Business Status</th>
                <th className="py-2.5 px-4">Status Check</th>
                <th className="py-2.5 px-4">Detailed Audit Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {exceptionRows.map((r) => (
                <tr key={r.rowIndex} className="hover:bg-slate-50">
                  <td className="py-2.5 px-4 font-mono tabular-nums text-slate-500">
                    {r.rowIndex}
                  </td>
                  <td className="py-2.5 px-4 font-mono tabular-nums font-semibold">
                    {datasetProfile.primaryIdentifierCol
                      ? String(
                          r.cleanCells[datasetProfile.primaryIdentifierCol] ?? '(Missing ID)'
                        )
                      : `Row ${r.rowIndex}`}
                  </td>
                  <td className="py-2.5 px-4">
                    {datasetProfile.primaryNameCol
                      ? String(r.cleanCells[datasetProfile.primaryNameCol] ?? '(Missing)')
                      : '—'}
                  </td>
                  <td className="py-2.5 px-4">
                    <StatusBadge value={r.dataValidation} variant="validation" />
                  </td>
                  <td className="py-2.5 px-4">
                    <StatusBadge value={r.businessStatus} variant="status" />
                  </td>
                  <td className="py-2.5 px-4">
                    <StatusBadge value={r.statusCheck} variant="check" />
                  </td>
                  <td className="py-2.5 px-4 font-medium text-slate-700">
                    {r.issues.length > 0
                      ? r.issues.map((i) => i.message).join('; ')
                      : `Structurally valid record with Business Status = ${r.businessStatus}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
