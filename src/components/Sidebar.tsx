import {
  BarChart3,
  CheckSquare,
  Compass,
  FileSpreadsheet,
  GitCompare,
  LayoutDashboard,
  RotateCcw,
  Settings,
  Upload,
} from 'lucide-react';
import { NavTab } from '../hooks/useMISState';
import { DatasetSession, ReconciliationResult } from '../types/mis';
import { formatFileSize, getFileTypeLabel } from '../utils/formatters';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  session: DatasetSession | null;
  reconciliation: ReconciliationResult | null;
  onStartNewAnalysis: () => void;
  isLoading: boolean;
}

const NAV_ITEMS: {
  id: NavTab;
  label: string;
  icon: typeof LayoutDashboard;
}[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'upload', label: 'Upload & Profile', icon: Upload },
  { id: 'explore', label: 'Explore Data', icon: Compass },
  { id: 'validation', label: 'Data Validation', icon: CheckSquare },
  { id: 'reconciliation', label: 'Reconciliation', icon: GitCompare },
  { id: 'reports', label: 'MIS Reports', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function Sidebar({
  activeTab,
  onSelectTab,
  session,
  reconciliation,
  onStartNewAnalysis,
  isLoading,
}: SidebarProps) {
  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 select-none">
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-200">
        <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white shrink-0">
          <FileSpreadsheet className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-bold tracking-tight text-slate-900 truncate">
            MIS Operations
          </div>
          <div className="text-xs text-slate-500 truncate">
            Universal Data & Reporting
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const errorCount =
            item.id === 'validation' && session
              ? session.validationSummary.invalidRecords
              : null;
          const reconMismatches =
            item.id === 'reconciliation' && reconciliation
              ? reconciliation.items.filter((i) => i.category !== 'Matched').length
              : null;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-white' : 'text-slate-400'
                  }`}
                />
                <span>{item.label}</span>
              </span>

              {errorCount !== null && errorCount > 0 && (
                <span
                  className={`font-mono tabular-nums text-xs px-1.5 py-0.5 rounded ${
                    isActive
                      ? 'bg-rose-400/20 text-rose-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {errorCount}
                </span>
              )}

              {reconMismatches !== null && reconMismatches > 0 && (
                <span
                  className={`font-mono tabular-nums text-xs px-1.5 py-0.5 rounded ${
                    isActive
                      ? 'bg-amber-400/20 text-amber-200'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}
                >
                  {reconMismatches}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Active Dataset Status */}
      <div className="p-4 border-t border-slate-200 bg-slate-50/70 space-y-2">
        {session ? (
          <>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Active File</span>
              <span className="font-mono tabular-nums text-slate-800 font-semibold">
                {session.validationSummary.totalRecords} rows • {getFileTypeLabel(session.fileName)}
              </span>
            </div>
            <div
              className="text-xs font-semibold text-slate-900 truncate"
              title={session.fileName}
            >
              {session.fileName}
            </div>
            <div className="flex items-center justify-between text-xs font-mono tabular-nums">
              <span className="text-emerald-700 font-medium">
                Valid: {session.validationSummary.validRecords}
              </span>
              <span className="text-slate-500">
                {formatFileSize(session.fileSize)}
              </span>
              <span className="text-rose-700 font-medium">
                Errors: {session.validationSummary.invalidRecords}
              </span>
            </div>
            <button
              type="button"
              disabled={isLoading}
              onClick={onStartNewAnalysis}
              className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <RotateCcw className="w-3 h-3 text-slate-500" />
              <span>Clear Analysis</span>
            </button>
          </>
        ) : (
          <div className="space-y-2">
            <div className="text-xs font-medium text-slate-500">
              No active file uploaded
            </div>
            <button
              type="button"
              onClick={() => onSelectTab('upload')}
              className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Excel / CSV</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
