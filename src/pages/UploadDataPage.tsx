import React, { useRef, useState } from 'react';
import {
  ArrowRight,
  Database,
  Download,
  FileSpreadsheet,
  Layers,
  RotateCcw,
  Sparkles,
  Upload,
} from 'lucide-react';
import { UploadedFileCard } from '../components/UploadedFileCard';
import { NavTab } from '../hooks/useMISState';
import { downloadSampleDatasetExcel } from '../services/misApi';
import { AppSettings, DatasetSession, SampleDatasetId } from '../types/mis';
import { formatCurrency, formatNumber } from '../utils/formatters';
import { SAMPLE_DATASET_META } from '../utils/sampleDatasets';

interface UploadDataPageProps {
  session: DatasetSession | null;
  settings: AppSettings;
  activeSampleId: SampleDatasetId;
  fileInputResetKey: number;
  isLoading: boolean;
  onUploadFile: (file: File) => void;
  onSelectSheet: (sheetName: string) => void;
  onDeleteFile: () => void;
  onStartNewAnalysis: () => void;
  onLoadSample: (datasetId: SampleDatasetId) => void;
  onApplyCleaning: (apply?: boolean) => void;
  onNavigate: (tab: NavTab) => void;
}

export function UploadDataPage({
  session,
  settings,
  activeSampleId,
  fileInputResetKey,
  isLoading,
  onUploadFile,
  onSelectSheet,
  onDeleteFile,
  onStartNewAnalysis,
  onLoadSample,
  onApplyCleaning,
  onNavigate,
}: UploadDataPageProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      onUploadFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadFile(file);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Sample Domain Loader */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Universal Excel/CSV Upload & Automatic Dataset Profiler
          </h2>
          <p className="text-sm text-slate-600">
            Upload any business spreadsheet (5 to 50+ columns). The engine automatically detects
            header rows, column types, semantic roles, missing values, and statistical profiles.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {session && (
            <button
              type="button"
              onClick={onStartNewAnalysis}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Clear Analysis</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => downloadSampleDatasetExcel(activeSampleId)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Download Sample .xlsx ({activeSampleId})</span>
          </button>
        </div>
      </div>

      {/* Uploaded File Card (Shown when a file/dataset is active) */}
      {session && (
        <UploadedFileCard
          session={session}
          isLoading={isLoading}
          fileInputResetKey={fileInputResetKey}
          onReplaceFile={onUploadFile}
          onDeleteFile={onDeleteFile}
          onStartNewAnalysis={onStartNewAnalysis}
        />
      )}

      {/* 5 Pre-Configured Business Datasets Selector */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-slate-900">
            1-Click Multi-Domain Sample Datasets (For Immediate Testing)
          </div>
          <span className="text-xs text-slate-500">
            Click any domain below to test schema-agnostic profiling
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {SAMPLE_DATASET_META.map((ds) => {
            const isSelected = session?.fileName === ds.fileName;
            return (
              <button
                key={ds.id}
                type="button"
                disabled={isLoading}
                onClick={() => onLoadSample(ds.id)}
                className={`text-left p-3.5 rounded-xl border transition-colors flex flex-col justify-between ${
                  isSelected
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-slate-50/70 hover:bg-white text-slate-900'
                }`}
              >
                <div>
                  <div
                    className={`text-xs font-medium ${
                      isSelected ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    {ds.domain}
                  </div>
                  <div className="mt-1 text-xs font-bold">{ds.name}</div>
                </div>
                <div
                  className={`mt-2.5 text-xs font-mono flex items-center gap-1 ${
                    isSelected ? 'text-emerald-300' : 'text-slate-600'
                  }`}
                >
                  <Database className="w-3 h-3" />
                  <span>{ds.fileName}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Drag & Drop Upload Box */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`bg-white border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          isDragging
            ? 'border-slate-900 bg-slate-50'
            : 'border-slate-300 hover:border-slate-400'
        }`}
      >
        <input
          key={`main-upload-input-${fileInputResetKey}`}
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mx-auto mb-3">
          <Upload className="w-5 h-5" />
        </div>

        <div className="text-sm font-bold text-slate-900">
          {session
            ? 'Upload or drop another Excel (.xlsx, .xls) or CSV (.csv) file to replace current analysis'
            : 'Drag and drop any Excel (.xlsx, .xls) or CSV (.csv) dataset here'}
        </div>
        <p className="mt-1 text-xs text-slate-500 max-w-lg mx-auto">
          Automatically detects the true header row even if title banners exist at the top, selects
          the primary data worksheet, and profiles all columns without manual configuration.
        </p>

        <div className="mt-4">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => fileInputRef.current?.click()}
            className="px-5 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
          >
            {isLoading
              ? 'Parsing & Profiling...'
              : session
              ? 'Select Replacement File'
              : 'Browse Local Files'}
          </button>
        </div>
      </div>

      {session && (
        <>
          {/* Multi-Sheet Selector (if workbook has multiple sheets) */}
          {session.sheetNames.length > 1 && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                <Layers className="w-4 h-4 text-slate-500" />
                <span>Multi-Sheet Workbook Detected ({session.sheetNames.length} sheets):</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {session.sheetNames.map((sName) => (
                  <button
                    key={sName}
                    type="button"
                    onClick={() => onSelectSheet(sName)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      session.activeSheetName === sName
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {sName}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Dataset Profiling Summary Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span className="font-semibold text-slate-800">{session.fileName}</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  Dataset Profile & Structural Health
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => onApplyCleaning(!session.isCleaned)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>
                    {session.isCleaned
                      ? 'Showing Clean Data (Switch to Raw)'
                      : 'Apply Universal Cleaning'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('dashboard')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
                >
                  <span>View MIS Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('explore')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
                >
                  <span>Explore & Group Data</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-xs text-slate-500">Total Rows</div>
                <div className="mt-1 text-lg font-bold font-mono tabular-nums text-slate-900">
                  {session.datasetProfile.totalRows}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-xs text-slate-500">Total Columns</div>
                <div className="mt-1 text-lg font-bold font-mono tabular-nums text-slate-900">
                  {session.datasetProfile.totalColumns}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-200">
                <div className="text-xs text-emerald-800">Valid Rows</div>
                <div className="mt-1 text-lg font-bold font-mono tabular-nums text-emerald-800">
                  {session.validationSummary.validRecords}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-rose-50/60 border border-rose-200">
                <div className="text-xs text-rose-800">Invalid Rows</div>
                <div className="mt-1 text-lg font-bold font-mono tabular-nums text-rose-800">
                  {session.validationSummary.invalidRecords}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-amber-50/60 border border-amber-200">
                <div className="text-xs text-amber-900">Missing Cells</div>
                <div className="mt-1 text-lg font-bold font-mono tabular-nums text-amber-900">
                  {session.datasetProfile.missingValuesCount}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-xs text-slate-500">Numeric Cols</div>
                <div className="mt-1 text-lg font-bold font-mono tabular-nums text-slate-900">
                  {session.datasetProfile.numericColumnsCount}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-xs text-slate-500">Date Cols</div>
                <div className="mt-1 text-lg font-bold font-mono tabular-nums text-slate-900">
                  {session.datasetProfile.dateColumnsCount}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-xs text-slate-500">Categorical Cols</div>
                <div className="mt-1 text-lg font-bold font-mono tabular-nums text-slate-900">
                  {session.datasetProfile.categoricalColumnsCount}
                </div>
              </div>
            </div>
          </div>

          {/* Automatic Column Detection & Profiling Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Automatic Column Detection & Semantic Role Profile
                </h3>
                <p className="text-xs text-slate-500">
                  Automatically inferred data types, semantic business roles, completeness, and
                  statistical summaries for every column.
                </p>
              </div>
              <span className="text-xs font-mono text-slate-500">
                {session.columnProfiles.length} columns profiled
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                    <th className="py-3 px-4">Column Name</th>
                    <th className="py-3 px-4">Detected Type</th>
                    <th className="py-3 px-4">Semantic Role</th>
                    <th className="py-3 px-4 text-right">Unique</th>
                    <th className="py-3 px-4 text-right">Nulls (Missing %)</th>
                    <th className="py-3 px-4 text-right">Duplicates</th>
                    <th className="py-3 px-4 text-right">Sum / Range</th>
                    <th className="py-3 px-4">Example Values</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {session.columnProfiles.map((col) => (
                    <tr key={col.name} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                        {col.name}
                      </td>
                      <td className="py-3 px-4 font-mono uppercase text-slate-700 whitespace-nowrap">
                        {col.dataType}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800 whitespace-nowrap">
                        {col.semanticRole}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        {col.uniqueCount}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        <span
                          className={
                            col.nullCount > 0
                              ? 'text-amber-700 font-semibold'
                              : 'text-slate-500'
                          }
                        >
                          {col.nullCount} ({col.missingPercentage}%)
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                        {col.duplicateCount}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                        {col.dataType === 'numeric' && col.sum !== undefined ? (
                          <div>
                            <div className="font-semibold text-slate-900">
                              Sum:{' '}
                              {col.semanticRole === 'Currency'
                                ? formatCurrency(col.sum, settings)
                                : formatNumber(col.sum, settings)}
                            </div>
                            <div className="text-slate-500">
                              Avg:{' '}
                              {col.semanticRole === 'Currency'
                                ? formatCurrency(col.average, settings)
                                : formatNumber(col.average, settings)}
                            </div>
                          </div>
                        ) : col.dataType === 'date' && col.earliestDate ? (
                          <span className="text-slate-600">
                            {col.earliestDate} → {col.latestDate}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600 max-w-xs truncate">
                        {col.exampleValues.join(' · ') || '(Empty)'}
                      </td>
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
