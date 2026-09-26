import { useEffect, useRef } from 'react';
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  CheckSquare,
  Compass,
  GitCompare,
  Info,
  LayoutDashboard,
  Settings,
  Upload,
  X,
} from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { NavTab, useMISState } from './hooks/useMISState';
import { DashboardPage } from './pages/DashboardPage';
import { DataValidationPage } from './pages/DataValidationPage';
import { ExploreDataPage } from './pages/ExploreDataPage';
import { ReconciliationPage } from './pages/ReconciliationPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { UploadDataPage } from './pages/UploadDataPage';

export default function App() {
  const {
    activeTab,
    setActiveTab,
    activeSampleId,
    session,
    fileInputResetKey,
    reconcileState,
    settings,
    updateSettings,
    isLoading,
    isExporting,
    notification,
    dismissNotification,
    notify,
    handleLoadSampleData,
    handleUploadFile,
    handleSelectWorksheet,
    handleDeleteUploadedFile,
    handleStartNewAnalysis,
    handleApplyCleaning,
    handleInlineCellUpdate,
    handleRemoveDuplicateRows,
    handleLoadSampleReconciliation,
    handleRunCustomReconciliation,
    handleGenerateExcelReport,
    handleClearSession,
  } = useMISState();

  const initializedRef = useRef(false);

  // Automatically load the default Fintech sample dataset on initial launch
  // so KPI cards, Recharts analytics, validation rules, and reports are immediately demonstrable.
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      handleLoadSampleData('transactions', true);
    }
  }, [handleLoadSampleData]);

  const mobileTabs: { id: NavTab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'upload', label: 'Upload', icon: Upload },
    { id: 'explore', label: 'Explore', icon: Compass },
    { id: 'validation', label: 'Validate', icon: CheckSquare },
    { id: 'reconciliation', label: 'Reconcile', icon: GitCompare },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex">
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          session={session}
          reconciliation={reconcileState?.result || null}
          activeSampleId={activeSampleId}
          onLoadSample={(datasetId) => handleLoadSampleData(datasetId, true)}
          onStartNewAnalysis={handleStartNewAnalysis}
          isLoading={isLoading}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader
          session={session}
          preparedBy={settings.preparedBy}
          activeSampleId={activeSampleId}
          onLoadSample={(datasetId) => handleLoadSampleData(datasetId, true)}
          onStartNewAnalysis={handleStartNewAnalysis}
          onExportReport={() => handleGenerateExcelReport()}
          isLoading={isLoading}
          isExporting={isExporting}
        />

        {/* Mobile Navigation Strip */}
        <div className="md:hidden bg-white border-b border-slate-200 px-3 py-2 flex items-center gap-1 overflow-x-auto">
          {mobileTabs.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
                  active
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Notification Banner */}
        {notification && (
          <div className="px-6 pt-4">
            <div
              className={`rounded-xl border px-4 py-3 flex items-start justify-between gap-3 ${
                notification.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : notification.type === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-900'
                  : 'bg-blue-50 border-blue-200 text-blue-900'
              }`}
            >
              <div className="flex items-start gap-2.5 text-xs">
                {notification.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : notification.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                ) : (
                  <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <span className="font-bold">{notification.title}: </span>
                  <span>{notification.message}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={dismissNotification}
                className="p-1 rounded hover:bg-black/5 text-current shrink-0"
                aria-label="Dismiss notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Active Page Viewport */}
        <main className="flex-1 p-6 max-w-[1440px] w-full mx-auto">
          {activeTab === 'dashboard' && (
            <DashboardPage
              session={session}
              settings={settings}
              activeSampleId={activeSampleId}
              fileInputResetKey={fileInputResetKey}
              isLoading={isLoading}
              onUploadFile={handleUploadFile}
              onDeleteFile={handleDeleteUploadedFile}
              onStartNewAnalysis={handleStartNewAnalysis}
              onLoadSample={(datasetId) => handleLoadSampleData(datasetId, true)}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === 'upload' && (
            <UploadDataPage
              session={session}
              settings={settings}
              activeSampleId={activeSampleId}
              fileInputResetKey={fileInputResetKey}
              isLoading={isLoading}
              onUploadFile={handleUploadFile}
              onSelectSheet={handleSelectWorksheet}
              onDeleteFile={handleDeleteUploadedFile}
              onStartNewAnalysis={handleStartNewAnalysis}
              onLoadSample={(datasetId) => handleLoadSampleData(datasetId, true)}
              onApplyCleaning={handleApplyCleaning}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === 'explore' && (
            <ExploreDataPage
              session={session}
              settings={settings}
              onLoadSample={(datasetId) => handleLoadSampleData(datasetId, true)}
            />
          )}

          {activeTab === 'validation' && (
            <DataValidationPage
              session={session}
              settings={settings}
              onApplyCleaning={handleApplyCleaning}
              onRemoveDuplicates={handleRemoveDuplicateRows}
              onInlineCellUpdate={handleInlineCellUpdate}
              onLoadSample={(datasetId) => handleLoadSampleData(datasetId, true)}
            />
          )}

          {activeTab === 'reconciliation' && (
            <ReconciliationPage
              session={session}
              reconcileState={reconcileState}
              settings={settings}
              isLoading={isLoading}
              onLoadSampleReconcile={handleLoadSampleReconciliation}
              onRunCustomReconcile={handleRunCustomReconciliation}
              onNotify={notify}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsPage
              session={session}
              reconciliation={reconcileState?.result || null}
              settings={settings}
              isExporting={isExporting}
              onGenerateExcel={handleGenerateExcelReport}
              onLoadSample={(datasetId) => handleLoadSampleData(datasetId, true)}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsPage
              settings={settings}
              onUpdateSettings={updateSettings}
              onClearSession={handleClearSession}
            />
          )}
        </main>
      </div>
    </div>
  );
}
