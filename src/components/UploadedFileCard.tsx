import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import { DatasetSession } from '../types/mis';
import { formatFileSize, getFileTypeLabel } from '../utils/formatters';

interface UploadedFileCardProps {
  session: DatasetSession;
  isLoading: boolean;
  fileInputResetKey: number;
  onReplaceFile: (file: File) => void;
  onDeleteFile: () => void;
  onStartNewAnalysis: () => void;
}

export function UploadedFileCard({
  session,
  isLoading,
  fileInputResetKey,
  onReplaceFile,
  onDeleteFile,
  onStartNewAnalysis,
}: UploadedFileCardProps) {
  const replaceInputRef = useRef<HTMLInputElement | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const fileType = getFileTypeLabel(session.fileName);
  const formattedSize = formatFileSize(session.fileSize);
  const totalRows = session.validationSummary.totalRecords;
  const totalCols = session.uploadedColumns.length;

  const handleReplaceInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onReplaceFile(file);
      e.target.value = '';
    }
  };

  const handleConfirmDelete = () => {
    if (replaceInputRef.current) {
      replaceInputRef.current.value = '';
    }
    setIsConfirmModalOpen(false);
    onDeleteFile();
  };

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          {/* Excel / Spreadsheet Icon */}
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>

          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="text-sm font-bold text-slate-900 truncate"
                title={session.fileName}
              >
                {session.fileName}
              </span>

              {/* File Type Badge */}
              <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[11px] font-mono font-semibold text-slate-700">
                {fileType}
              </span>

              {/* Processing / Status State Badge */}
              {isLoading ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-[11px] font-semibold text-blue-800">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Processing...</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-800">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>
                    Processed ({session.isCleaned ? 'Cleaned' : 'Raw'})
                  </span>
                </span>
              )}
            </div>

            {/* File Metadata Line: rows • file type • file size • active sheet */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-mono tabular-nums">
              <span>{totalRows} rows</span>
              <span aria-hidden="true">•</span>
              <span>{fileType}</span>
              <span aria-hidden="true">•</span>
              <span>{formattedSize}</span>
              <span aria-hidden="true">•</span>
              <span>{totalCols} columns</span>
              {session.activeSheetName && (
                <>
                  <span aria-hidden="true">•</span>
                  <span className="font-sans">Sheet: {session.activeSheetName}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Hidden File Input for Replace File */}
        <input
          key={`replace-input-${fileInputResetKey}`}
          ref={replaceInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleReplaceInputChange}
          className="hidden"
        />

        {/* File Actions: Replace File, Delete File, Start New Analysis */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => replaceInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap disabled:opacity-50"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
            <span>Replace File</span>
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={onStartNewAnalysis}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
            <span>Start New Analysis</span>
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={() => setIsConfirmModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-rose-300 bg-rose-50 text-xs font-semibold text-rose-800 hover:bg-rose-100 transition-colors whitespace-nowrap disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-700" />
            <span>Delete File</span>
          </button>
        </div>
      </div>

      {/* Delete File Confirmation Dialog Modal */}
      {isConfirmModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-file-modal-title"
        >
          <div className="bg-white border border-slate-200 rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3
                    id="delete-file-modal-title"
                    className="text-base font-bold text-slate-900"
                  >
                    Delete uploaded file?
                  </h3>
                  <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                    Are you sure you want to remove this uploaded file and clear the current analysis?
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
              <div className="font-semibold text-slate-800 truncate">
                {session.fileName} ({totalRows} rows • {fileType} • {formattedSize})
              </div>
              <p className="text-[11px] text-slate-500">
                This clears the active dataset, validation results, reconciliation state, and charts.
                Any MIS Excel reports you have already downloaded to your computer will remain safe.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-700 text-white text-xs font-semibold hover:bg-rose-800 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete File</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
