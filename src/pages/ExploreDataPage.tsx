import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Compass,
  PieChart as PieChartIcon,
  Upload,
} from 'lucide-react';
import {
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
import { NavTab } from '../hooks/useMISState';
import {
  AggregationType,
  AppSettings,
  DatasetSession,
} from '../types/mis';
import { formatCurrency, formatNumber } from '../utils/formatters';
import { runDynamicGroupByAnalysis } from '../utils/misEngine';

interface ExploreDataPageProps {
  session: DatasetSession | null;
  settings: AppSettings;
  onNavigate: (tab: NavTab) => void;
}

const COLORS = [
  '#0F172A',
  '#2563EB',
  '#16A34A',
  '#D97706',
  '#7C3AED',
  '#DC2626',
  '#0891B2',
];

export function ExploreDataPage({
  session,
  settings,
  onNavigate,
}: ExploreDataPageProps) {
  const groupableColumns = useMemo(() => {
    if (!session) return [];
    const preferred = session.columnProfiles.filter(
      (c) =>
        c.dataType === 'categorical' ||
        c.dataType === 'date' ||
        c.semanticRole === 'Name' ||
        c.semanticRole === 'Location'
    );
    return preferred.length > 0 ? preferred : session.columnProfiles;
  }, [session]);

  const numericColumns = useMemo(() => {
    if (!session) return [];
    return session.columnProfiles.filter((c) => c.dataType === 'numeric');
  }, [session]);

  const [groupByCol, setGroupByCol] = useState<string>('');
  const [metricCol, setMetricCol] = useState<string>('');
  const [aggregation, setAggregation] = useState<AggregationType>('SUM');
  const [chartMode, setChartMode] = useState<'bar' | 'pie'>('bar');

  useEffect(() => {
    if (!session) return;
    const defaultGroup =
      session.datasetProfile.primaryCategoryCol ||
      session.datasetProfile.primaryStatusCol ||
      groupableColumns[0]?.name ||
      session.uploadedColumns[0] ||
      '';
    const defaultMetric =
      session.datasetProfile.primaryNumericCol ||
      numericColumns[0]?.name ||
      session.uploadedColumns[0] ||
      '';

    setGroupByCol(defaultGroup);
    setMetricCol(defaultMetric);
    setAggregation(numericColumns.length > 0 ? 'SUM' : 'COUNT');
  }, [session, groupableColumns, numericColumns]);

  const analysisResult = useMemo(() => {
    if (!session || !groupByCol) return null;
    return runDynamicGroupByAnalysis(
      session,
      groupByCol,
      metricCol || groupByCol,
      aggregation
    );
  }, [session, groupByCol, metricCol, aggregation]);

  if (!session) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center max-w-xl mx-auto my-8 space-y-4">
        <div className="text-base font-bold text-slate-900">
          No Dataset Uploaded for Dynamic Exploration
        </div>
        <p className="text-xs text-slate-600">
          Upload an Excel (.xlsx, .xls) or CSV (.csv) file to build dynamic Group-By aggregations.
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

  const selectedMetricProfile = session.columnProfiles.find((c) => c.name === metricCol);
  const isCurrencyMetric =
    aggregation !== 'COUNT' && selectedMetricProfile?.semanticRole === 'Currency';

  const formatAgg = (val: number) =>
    isCurrencyMetric ? formatCurrency(val, settings) : formatNumber(val, settings);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Compass className="w-3.5 h-3.5 text-slate-400" />
            <span>Dynamic Pivot & Group-By Workbench</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-0.5">
            Explore Data ({session.fileName})
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Select any categorical or date dimension, choose a numeric metric, and apply SUM,
            AVERAGE, COUNT, MIN, MAX, or MEDIAN.
          </p>
        </div>

        {/* Chart Mode Switcher */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start lg:self-auto">
          <button
            type="button"
            onClick={() => setChartMode('bar')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              chartMode === 'bar'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Bar Chart</span>
          </button>
          <button
            type="button"
            onClick={() => setChartMode('pie')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              chartMode === 'pie'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PieChartIcon className="w-3.5 h-3.5" />
            <span>Distribution Pie</span>
          </button>
        </div>
      </div>

      {/* Group By + Metric + Aggregation Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            1. Group By (Dimension Column)
          </label>
          <select
            value={groupByCol}
            onChange={(e) => setGroupByCol(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            {session.columnProfiles.map((col) => (
              <option key={col.name} value={col.name}>
                {col.name} ({col.semanticRole} · {col.uniqueCount} unique)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            2. Metric (Numeric Column)
          </label>
          <select
            value={metricCol}
            onChange={(e) => setMetricCol(e.target.value)}
            disabled={aggregation === 'COUNT'}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:opacity-50"
          >
            {numericColumns.length > 0 ? (
              numericColumns.map((col) => (
                <option key={col.name} value={col.name}>
                  {col.name} ({col.semanticRole})
                </option>
              ))
            ) : (
              <option value={groupByCol}>Record Count</option>
            )}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            3. Aggregation Function
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {(['SUM', 'AVERAGE', 'COUNT', 'MIN', 'MAX', 'MEDIAN'] as const).map((agg) => (
              <button
                key={agg}
                type="button"
                onClick={() => setAggregation(agg)}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-colors ${
                  aggregation === agg
                    ? 'bg-slate-900 border-slate-900 text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {agg}
              </button>
            ))}
          </div>
        </div>
      </div>

      {analysisResult && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart Visualization */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-slate-900">
                {aggregation}({aggregation === 'COUNT' ? 'Records' : metricCol}) grouped by{' '}
                {groupByCol}
              </h3>
              <p className="text-xs text-slate-500">
                Showing top {Math.min(12, analysisResult.rows.length)} groups
              </p>
            </div>

            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                {chartMode === 'bar' ? (
                  <BarChart
                    data={analysisResult.rows.slice(0, 12)}
                    margin={{ top: 10, right: 16, left: 8, bottom: 16 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="groupValue" tick={{ fontSize: 11, fill: '#475569' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#475569' }} />
                    <Tooltip
                      formatter={(val: unknown) => [
                        formatAgg(Number(val)),
                        `${aggregation}(${aggregation === 'COUNT' ? 'Records' : metricCol})`,
                      ]}
                    />
                    <Bar
                      dataKey="aggregatedValue"
                      name={`${aggregation}`}
                      fill="#0F172A"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                ) : (
                  <PieChart>
                    <Pie
                      data={analysisResult.rows.slice(0, 8)}
                      dataKey="aggregatedValue"
                      nameKey="groupValue"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                    >
                      {analysisResult.rows.slice(0, 8).map((entry, idx) => (
                        <Cell
                          key={entry.groupValue}
                          fill={COLORS[idx % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val: unknown) => formatAgg(Number(val))} />
                    <Legend verticalAlign="bottom" height={32} />
                  </PieChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* Grouped Pivot Summary Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Grouped Summary Table
                </h3>
                <p className="text-xs text-slate-500">
                  {analysisResult.rows.length} distinct groups in {groupByCol}
                </p>
              </div>
              <span className="text-xs font-mono font-semibold text-slate-800">
                Total: {formatAgg(analysisResult.totalAggregatedValue)}
              </span>
            </div>

            <div className="overflow-x-auto max-h-80 flex-1">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600 sticky top-0">
                    <th className="py-2.5 px-4">{groupByCol}</th>
                    <th className="py-2.5 px-4 text-right">Records</th>
                    <th className="py-2.5 px-4 text-right">Valid Rows</th>
                    <th className="py-2.5 px-4 text-right">Share (%)</th>
                    <th className="py-2.5 px-4 text-right">
                      {aggregation}({aggregation === 'COUNT' ? 'Row' : metricCol})
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {analysisResult.rows.map((r) => (
                    <tr key={r.groupValue} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-semibold text-slate-900">
                        {r.groupValue}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                        {r.recordCount}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-emerald-700">
                        {r.validCount}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-500">
                        {r.sharePercentage}%
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums font-bold text-slate-900">
                        {formatAgg(r.aggregatedValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
