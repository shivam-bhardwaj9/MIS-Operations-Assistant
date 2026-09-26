import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Compass,
  Upload,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { UploadedFileCard } from '../components/UploadedFileCard';
import { NavTab } from '../hooks/useMISState';
import { AppSettings, DatasetSession } from '../types/mis';
import { formatCurrency, formatNumber } from '../utils/formatters';

interface DashboardPageProps {
  session: DatasetSession | null;
  settings: AppSettings;
  fileInputResetKey: number;
  isLoading: boolean;
  onUploadFile: (file: File) => void;
  onDeleteFile: () => void;
  onStartNewAnalysis: () => void;
  onNavigate: (tab: NavTab) => void;
}

const PIE_COLORS = [
  '#16A34A',
  '#D97706',
  '#DC2626',
  '#2563EB',
  '#7C3AED',
  '#0891B2',
  '#475569',
];

export function DashboardPage({
  session,
  settings,
  fileInputResetKey,
  isLoading,
  onUploadFile,
  onDeleteFile,
  onStartNewAnalysis,
  onNavigate,
}: DashboardPageProps) {
  const emptyFileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  if (!session) {
    return (
      <div className="max-w-4xl mx-auto py-8 space-y-6">
        <div className="bg-white border border-slate-200 rounded-xl p-8 space-y-6">
          <div className="max-w-2xl space-y-2">
            <div className="text-xs font-semibold text-slate-500">
              Universal MIS Automation & Reporting Platform
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Upload Excel / CSV to Start Analysis
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Upload your Excel (.xlsx, .xls) or CSV (.csv) dataset to automatically detect columns,
              validate data quality, clean records, and generate executive MIS KPIs and charts.
            </p>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) onUploadFile(file);
            }}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              isDragging
                ? 'border-slate-900 bg-slate-50'
                : 'border-slate-300 hover:border-slate-400'
            }`}
          >
            <input
              key={`dashboard-upload-input-${fileInputResetKey}`}
              ref={emptyFileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  onUploadFile(file);
                  e.target.value = '';
                }
              }}
              className="hidden"
            />

            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mx-auto mb-3">
              <Upload className="w-5 h-5" />
            </div>

            <div className="text-sm font-bold text-slate-900">
              Drag and drop your Excel (.xlsx, .xls) or CSV (.csv) file here
            </div>
            <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
              Upload → Parse → Validate → Clean → Analyze → Reconcile → Generate MIS Report
            </p>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                disabled={isLoading}
                onClick={() => emptyFileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span>{isLoading ? 'Processing File...' : 'Upload Excel / CSV'}</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('upload')}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <span>Open Upload & Profiler</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const {
    validationSummary,
    misSummary,
    datasetProfile,
    dynamicCharts,
    deterministicInsights,
  } = session;

  const primaryNumCol = datasetProfile.primaryNumericCol;
  const primaryStatusCol = datasetProfile.primaryStatusCol;
  const primaryColProfile = session.columnProfiles.find((c) => c.name === primaryNumCol);
  const isCurrency = primaryColProfile?.semanticRole === 'Currency';

  const formatMetric = (val: number) =>
    isCurrency ? formatCurrency(val, settings) : formatNumber(val, settings);

  return (
    <div className="space-y-6">
      {/* Uploaded File Card */}
      <UploadedFileCard
        session={session}
        isLoading={isLoading}
        fileInputResetKey={fileInputResetKey}
        onReplaceFile={onUploadFile}
        onDeleteFile={onDeleteFile}
        onStartNewAnalysis={onStartNewAnalysis}
      />

      {/* Active Workspace Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-semibold text-slate-500">
            Active MIS Analysis Workspace
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Executive MIS Operations Overview
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('explore')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap"
          >
            <Compass className="w-3.5 h-3.5 text-slate-600" />
            <span>Explore Data (Group By)</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('validation')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            <span>Inspect Validation & Exceptions</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* SECTION 1: DATASET HEALTH & DATA VALIDITY VS BUSINESS STATUS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Records */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">Total Records</div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {formatNumber(validationSummary.totalRecords, settings)}
          </div>
          <div className="mt-2 text-xs text-slate-500 font-mono tabular-nums">
            Valid ({validationSummary.validRecords}) + Invalid ({validationSummary.invalidRecords}) ={' '}
            {validationSummary.totalRecords}
          </div>
        </div>

        {/* 2. Structurally Valid Records */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">
            Valid Records (Data Validation = VALID)
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-emerald-700">
            {formatNumber(validationSummary.validRecords, settings)}{' '}
            <span className="text-sm font-normal text-slate-500">
              ({misSummary.validRate}%)
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Includes valid Pending/Failed/Open rows</span>
          </div>
        </div>

        {/* 3. Structurally Invalid Records (Data Errors) */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">
            Invalid Records (Data Quality Errors)
          </div>
          <div
            className={`mt-2 text-2xl font-bold font-mono tabular-nums ${
              validationSummary.invalidRecords > 0 ? 'text-rose-700' : 'text-slate-900'
            }`}
          >
            {formatNumber(validationSummary.invalidRecords, settings)}
          </div>
          <div className="mt-2 text-xs text-slate-500 font-mono tabular-nums">
            {validationSummary.duplicatesCount} duplicate ID · {validationSummary.missingFieldsCount}{' '}
            missing
          </div>
        </div>

        {/* 4. Business Status Review (Valid rows needing operational follow-up) */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">
            Records Requiring Review
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-amber-700">
            {formatNumber(validationSummary.recordsRequiringReview, settings)}
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>
              {validationSummary.businessReviewCount} valid business-review +{' '}
              {validationSummary.invalidRecords} data errors
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 2: DYNAMIC DOMAIN KPIs (Metric + Business Status Breakdown) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Primary Metric Total */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">
            {primaryNumCol ? `Total ${primaryNumCol}` : 'Unique Values Across Dataset'}
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {primaryNumCol
              ? formatMetric(misSummary.totalAmount)
              : formatNumber(datasetProfile.uniqueValuesCount, settings)}
          </div>
          <div className="mt-2 text-xs text-slate-500 font-mono tabular-nums">
            {primaryNumCol
              ? `Avg: ${formatMetric(misSummary.averageTransactionAmount)} · Median: ${formatMetric(
                  misSummary.medianTransactionAmount
                )}`
              : `${datasetProfile.categoricalColumnsCount} categorical columns`}
          </div>
        </div>

        {/* Positive / Successful Business Status */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">
            {primaryStatusCol
              ? `Positive / Settled (${primaryStatusCol})`
              : 'Numeric & Date Columns'}
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-emerald-700">
            {primaryStatusCol
              ? formatNumber(misSummary.successfulTransactions, settings)
              : `${datasetProfile.numericColumnsCount} Num · ${datasetProfile.dateColumnsCount} Date`}
          </div>
          <div className="mt-2 text-xs text-slate-500 font-mono tabular-nums">
            {primaryStatusCol
              ? `Rate: ${misSummary.successRate}% of total records`
              : 'Automatically profiled schema'}
          </div>
        </div>

        {/* Pending / Open / In-Progress Business Status */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">
            {primaryStatusCol
              ? `Pending / Open (${primaryStatusCol})`
              : 'Missing Cell Count'}
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-amber-700">
            {primaryStatusCol
              ? formatNumber(misSummary.pendingTransactions, settings)
              : formatNumber(datasetProfile.missingValuesCount, settings)}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {primaryStatusCol
              ? 'Valid business state · Status Check = Review'
              : 'Total empty cells across dataset'}
          </div>
        </div>

        {/* Failed / Cancelled / Escalated Business Status */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">
            {primaryStatusCol
              ? `Failed / Escalated / Closed (${primaryStatusCol})`
              : 'Duplicate Identifiers'}
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-rose-700">
            {primaryStatusCol
              ? formatNumber(misSummary.failedTransactions, settings)
              : formatNumber(validationSummary.duplicatesCount, settings)}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {primaryStatusCol
              ? 'Valid business state · Status Check = Review'
              : 'Duplicate primary key rows'}
          </div>
        </div>
      </div>

      {/* Deterministic Insights & Statistical Range Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Deterministic Operational Insights
            </h3>
            <span className="text-xs font-mono text-slate-500">
              100% Rule & Calculation Backed
            </span>
          </div>
          <ul className="space-y-2 text-xs text-slate-700">
            {deterministicInsights.map((insight, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="font-mono font-bold text-slate-400">
                  0{i + 1}.
                </span>
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Dataset Profile Quick Summary */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Dataset Profile Summary</h3>
            <span className="text-xs font-mono text-slate-500">Schema Profiler</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
              <div className="text-slate-500">Rows × Columns</div>
              <div className="mt-0.5 font-mono tabular-nums font-bold text-slate-900">
                {datasetProfile.totalRows} × {datasetProfile.totalColumns}
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
              <div className="text-slate-500">Missing Cells</div>
              <div className="mt-0.5 font-mono tabular-nums font-bold text-slate-900">
                {datasetProfile.missingValuesCount}
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
              <div className="text-slate-500">Duplicate IDs</div>
              <div className="mt-0.5 font-mono tabular-nums font-bold text-rose-700">
                {datasetProfile.duplicateIdentifiersCount}
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
              <div className="text-slate-500">Column Types</div>
              <div className="mt-0.5 font-mono tabular-nums font-bold text-slate-900">
                {datasetProfile.numericColumnsCount}N · {datasetProfile.dateColumnsCount}D ·{' '}
                {datasetProfile.categoricalColumnsCount}C
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {dynamicCharts.map((chart) => (
          <div
            key={chart.id}
            className="bg-white border border-slate-200 rounded-xl p-5"
          >
            <div className="mb-4">
              <h3 className="text-sm font-bold text-slate-900">{chart.title}</h3>
              <p className="text-xs text-slate-500">{chart.subtitle}</p>
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                {chart.chartType === 'pie' ? (
                  <PieChart>
                    <Pie
                      data={chart.data}
                      dataKey={chart.yKeys[0].key}
                      nameKey={chart.xKey}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={84}
                      paddingAngle={3}
                    >
                      {chart.data.map((entry, idx) => (
                        <Cell
                          key={String(entry[chart.xKey] ?? idx)}
                          fill={PIE_COLORS[idx % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={32} />
                  </PieChart>
                ) : chart.chartType === 'area' ? (
                  <AreaChart
                    data={chart.data}
                    margin={{ top: 10, right: 16, left: 8, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey={chart.xKey} tick={{ fontSize: 11, fill: '#475569' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#475569' }} />
                    <Tooltip
                      formatter={(val: unknown) => [
                        chart.yKeys[0].isCurrency
                          ? formatCurrency(Number(val), settings)
                          : formatNumber(Number(val), settings),
                        chart.yKeys[0].label,
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey={chart.yKeys[0].key}
                      name={chart.yKeys[0].label}
                      stroke={chart.yKeys[0].color}
                      fill={chart.yKeys[0].color}
                      fillOpacity={0.12}
                      strokeWidth={2}
                    />
                  </AreaChart>
                ) : (
                  <BarChart
                    data={chart.data}
                    margin={{ top: 10, right: 16, left: 8, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey={chart.xKey} tick={{ fontSize: 11, fill: '#475569' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#475569' }} />
                    <Tooltip
                      formatter={(val: unknown, name: unknown) => [
                        chart.yKeys.some((y) => y.isCurrency)
                          ? formatCurrency(Number(val), settings)
                          : formatNumber(Number(val), settings),
                        String(name),
                      ]}
                    />
                    {chart.yKeys.length > 1 && <Legend verticalAlign="bottom" height={32} />}
                    {chart.yKeys.map((yk) => (
                      <Bar
                        key={yk.key}
                        dataKey={yk.key}
                        name={yk.label}
                        fill={yk.color}
                        radius={[4, 4, 0, 0]}
                      />
                    ))}
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
