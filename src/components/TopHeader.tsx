import { Calendar, Database, Download, User } from 'lucide-react';
import { DatasetSession, SampleDatasetId } from '../types/mis';
import { SAMPLE_DATASET_META } from '../utils/sampleDatasets';

interface TopHeaderProps {
  session: DatasetSession | null;
  preparedBy: string;
  activeSampleId: SampleDatasetId;
  onLoadSample: (datasetId: SampleDatasetId) => void;
  onExportReport: () => void;
  isLoading: boolean;
  isExporting: boolean;
}

export function TopHeader({
  session,
  preparedBy,
  activeSampleId,
  onLoadSample,
  onExportReport,
  isLoading,
  isExporting,
}: TopHeaderProps) {
  const formattedDate = new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date());

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
      {/* Zone 1: Single Text Element Brand Title */}
      <h1 className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
        MIS Operations Assistant
      </h1>

      {/* Zone 2: Current Date & User Profile Context */}
      <div className="hidden lg:flex items-center gap-5 text-xs text-slate-600">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-mono tabular-nums">{formattedDate}</span>
        </div>
        <span aria-hidden="true" className="text-slate-300">
          ·
        </span>
        <div className="flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-medium text-slate-800">{preparedBy}</span>
        </div>
      </div>

      {/* Zone 3: 1-2 Primary Operational Actions */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5 text-slate-500 hidden sm:block" />
          <select
            aria-label="Select Sample Dataset"
            value={activeSampleId}
            disabled={isLoading}
            onChange={(e) => onLoadSample(e.target.value as SampleDatasetId)}
            className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            {SAMPLE_DATASET_META.map((d) => (
              <option key={d.id} value={d.id}>
                Sample: {d.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          disabled={!session || isExporting}
          onClick={onExportReport}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800 transition-colors whitespace-nowrap disabled:opacity-40"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{isExporting ? 'Generating .xlsx...' : 'Generate MIS Excel Report'}</span>
        </button>
      </div>
    </header>
  );
}
