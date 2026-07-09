import React, { useState } from 'react';
import { useCarpentry } from '../context/CarpentryContext';
import {
  Loader2,
  Layers,
  TrendingUp,
  Award,
  Hammer,
  RefreshCw,
  Settings,
  Sun,
  Moon,
  Info,
  Play
} from 'lucide-react';

import SettingsModal from './SettingsModal';
import ExportCenterModal from './ExportCenterModal';
import ReportPreviewModal from './ReportPreviewModal';
import EstimateCalculatorModal from './EstimateCalculatorModal';
import SavedFilesModal from './SavedFilesModal';
import CabinetDesignerModal from './CabinetDesignerModal';
import AttendanceModal from './AttendanceModal';
import AboutModal from './AboutModal';
import UserSessionsModal from './UserSessionsModal';
import WorkerSelfEntryPortal from './WorkerSelfEntryPortal';
import CuttingListPanel from './CuttingListPanel';
import LayoutVisualizerPanel from './LayoutVisualizerPanel';
import ToastContainer from './Toast';
import HeaderMenu from './HeaderMenu';

export default function AppWorkspace() {
  const {
    appConfig,
    setAppConfig,
    isUserSessionsOpen,
    setIsUserSessionsOpen,
    language,
    theme,
    isAboutOpen,
    setIsAboutOpen,
    handleToggleTheme,
    attendanceData,
    setAttendanceData,
    isAttendanceOpen,
    setIsAttendanceOpen,
    activeWorkerPortalId,
    parts,
    settings,
    setParts,
    setSettings,
    isSettingsOpen,
    setIsSettingsOpen,
    isCabinetDesignerOpen,
    setIsCabinetDesignerOpen,
    autosaveStatus,
    result,
    compareResults,
    setCompareResults,
    isComparing,
    isCalculating,
    isExportOpen,
    setIsExportOpen,
    isReportPreviewOpen,
    setIsReportPreviewOpen,
    isCalcOpen,
    setIsCalcOpen,
    isSavedFilesOpen,
    setIsSavedFilesOpen,
    savedJobs,
    setSavedJobs,
    activeJobId,
    setActiveJobId,
    toasts,
    removeToast,
    addToast,
    handleUndo,
    handleRedo,
    calculateResult,
    handleLanguageToggle,
    handleCompareAlgos,
    handleUpdateJobSettings,
    handleExportCsv,
    handleExportJson,
    handleExportCNC,
    handleImportJson,
    handlePrint,
    winner,
    t,
    isHindi,
    canUndo,
    canRedo,
    setWorkspaceState
  } = useCarpentry();

  return (
    <div id="app-container" className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans transition-colors duration-250">
      
      {/* Printable Report Header (Hidden in UI, Visible in standard browser print) */}
      <div id="print-header" className="p-8">
        <h1 className="text-3xl font-extrabold border-b-2 border-slate-900 pb-2">
          {t.title} / Cutting & Banding Report
        </h1>
        <p className="text-sm font-semibold text-slate-500 mt-2">
          {t.subtitle}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 border border-slate-200 rounded-xl p-4 bg-slate-50/50">
          <div>
            <span className="text-xs font-bold text-slate-400 block uppercase">Sheet Dimensions</span>
            <span className="text-sm font-extrabold text-slate-800">{settings.sheetL} x {settings.sheetW} {settings.unit}</span>
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 block uppercase">Blade Kerf</span>
            <span className="text-sm font-extrabold text-slate-800">{settings.bladeTh} mm</span>
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 block uppercase">Edge Banding Thickness</span>
            <span className="text-sm font-extrabold text-slate-800">{settings.edgeTh} mm</span>
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 block uppercase">Border Trim</span>
            <span className="text-sm font-extrabold text-slate-800">{settings.trimMargin} mm</span>
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 block uppercase">Active Packing Heuristic</span>
            <span className="text-sm font-extrabold text-slate-800">{settings.algorithm}</span>
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 block uppercase">Date Created</span>
            <span className="text-sm font-extrabold text-slate-800">{new Date().toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Screen View Header */}
      <header id="header-bar" className="bg-white/80 dark:bg-slate-900/85 backdrop-blur-xl sticky top-0 z-40 text-slate-800 dark:text-slate-100 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.1)] border-b border-slate-200/60 dark:border-slate-800 px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full overflow-hidden shadow-md shadow-indigo-600/20 border-2 border-indigo-100 dark:border-slate-800 flex items-center justify-center bg-white shrink-0">
            <img src="/src/assets/images/shahirah_logo_1782493245476.jpg" alt="Sahirah Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2 text-slate-900 dark:text-white">
              {t.title}
              <span className="text-[9px] font-bold bg-indigo-100 border border-indigo-200 text-indigo-700 dark:bg-indigo-950 dark:border-indigo-800 dark:text-indigo-400 rounded-full px-2 py-0.5 tracking-widest uppercase shrink-0">PRO</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t.subtitle}</p>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-3">
          {/* Autosave Status Indicator */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950/45 border border-slate-200 dark:border-slate-850 rounded-xl px-2.5 py-1.5 text-xs text-slate-500 dark:text-slate-400 font-semibold select-none shadow-sm">
            {autosaveStatus === 'saving' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping shrink-0" />
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider">{isHindi ? 'सुरक्षित हो रहा है...' : 'Saving...'}</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">{isHindi ? 'सुरक्षित' : 'Autosaved'}</span>
              </>
            )}
          </div>
          
          <button
            onClick={() => calculateResult()}
            disabled={isCalculating}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-xl text-sm font-bold shadow-md shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isCalculating ? <Loader2 size={16} className="animate-spin" /> : <Layers size={16} />}
            {isCalculating ? (isHindi ? 'गणना जारी...' : 'Calculating...') : (isHindi ? 'लेआउट बनाएं' : 'Optimize Layout')}
          </button>

          {/* 2D Almirah Designer Button */}
          <button
            onClick={() => setIsCabinetDesignerOpen(true)}
            className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/35 dark:hover:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-900/50 text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
            title={isHindi ? "2D अलमारी डिज़ाइनर खोलें" : "Open 2D Almirah Designer"}
          >
            <Hammer size={14} />
            <span className="hidden sm:inline">{isHindi ? "2D अलमारी" : "2D Almirah"}</span>
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={handleToggleTheme}
            className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950/45 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900/50 hover:text-slate-950 dark:hover:text-white transition-all shadow-sm active:scale-95 border border-slate-200 dark:border-slate-850 cursor-pointer focus:outline-none"
            title={theme === 'light' ? (isHindi ? 'डार्क थीम चालू करें' : 'Switch to Dark Theme') : (isHindi ? 'लाइट थीम चालू करें' : 'Switch to Light Theme')}
          >
            {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
          </button>

          {/* About Button */}
          <button
            onClick={() => setIsAboutOpen(true)}
            className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950/45 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900/50 hover:text-slate-950 dark:hover:text-white transition-all shadow-sm active:scale-95 border border-slate-200 dark:border-slate-850 cursor-pointer focus:outline-none"
            title={isHindi ? 'सॉफ्टवेयर के बारे में' : 'About Software'}
          >
            <Info size={15} />
          </button>

          <HeaderMenu 
            language={language}
            onOpenSavedFiles={() => setIsSavedFilesOpen(true)}
            onOpenCalc={() => setIsCalcOpen(true)}
            onOpenExport={() => setIsExportOpen(true)}
            onOpenAttendance={() => setIsAttendanceOpen(true)}
            onOpenUserSessions={() => setIsUserSessionsOpen(true)}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onToggleLanguage={handleLanguageToggle}
            onImportJson={handleImportJson}
          />
        </div>
      </header>

      <AttendanceModal
        isOpen={isAttendanceOpen}
        onClose={() => setIsAttendanceOpen(false)}
        language={language}
        attendanceData={attendanceData}
        onUpdateData={setAttendanceData}
        appConfig={appConfig}
        onUpdateAppConfig={setAppConfig}
      />

      {/* Main Grid Workspace - Bento Grid Layout */}
      <main id="main-grid" className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 max-w-7xl mx-auto w-full">
        
        {/* Sidebar Configuration Panel - Bento Cell */}
        <aside id="sidebar-settings" className="lg:col-span-4 xl:col-span-3 flex flex-col gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                {isHindi ? 'मटीरियल स्टॉक' : 'Material Stock'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isHindi ? 'सक्रिय बोर्ड्स और सेटिंग्स' : 'Active boards and parameters'}
              </p>
            </div>
            
            <div className="flex flex-col gap-2">
              {(settings.stockItems || []).map((item) => (
                <div key={item.id} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-sm font-semibold text-slate-700 truncate max-w-[120px]">{item.name}</span>
                  <span className="text-xs font-mono text-slate-500">{item.length}x{item.width} {settings.unit}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="mt-2 w-full py-2.5 flex items-center justify-center gap-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl transition-colors font-semibold text-sm"
            >
              <Settings size={16} />
              {isHindi ? 'स्टॉक और सेटिंग प्रबंधित करें' : 'Manage Stock & Settings'}
            </button>
          </div>
        </aside>

          {isSettingsOpen && (
            <SettingsModal
              settings={settings}
              onChange={setSettings}
              onClose={() => setIsSettingsOpen(false)}
              language={language}
              savedJobs={savedJobs}
              activeJobId={activeJobId}
              onSaveToJob={handleUpdateJobSettings}
            />
          )}

        {/* Main Content Area - Bento Area */}
        <div id="main-workspace" className="lg:col-span-8 xl:col-span-9 flex flex-col gap-6">
          {/* Part Entry Card - Bento Cell */}
          <section id="bento-part-entry" className="flex flex-col">
            <CuttingListPanel
              parts={parts}
              onChange={setParts}
              language={language}
              translations={t}
              unit={settings.unit}
              settings={settings}
              onOpenCabinetDesigner={() => setIsCabinetDesignerOpen(true)}
            />
          </section>

          {/* Heuristics Optimization Panel - Bento Cell */}
          <section id="bento-optimize-controls" className="flex flex-col gap-6">
            {/* Heuristics Comparison Button */}
            <div className="flex justify-between items-center bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
              <div>
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <Layers size={16} className="text-indigo-600" />
                  {isHindi ? 'लेआउट ऑप्टिमाइज़ेशन रणनीतियाँ' : 'Optimize Packing Layout'}
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isHindi ? 'सभी गिलोटीन और मैक्सरेक्ट्स एल्गोरिदम चलाएं' : 'Compare all heuristics for highest plywood density'}
                </p>
              </div>
              <button
                id="compare-algos-btn"
                onClick={handleCompareAlgos}
                disabled={parts.length === 0 || isComparing}
                className={`flex items-center gap-1.5 font-bold text-xs py-2.5 px-4 rounded-xl shadow-sm border transition-all cursor-pointer ${
                  parts.length === 0
                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed dark:bg-slate-900 dark:text-slate-600 dark:border-slate-800'
                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100/80 border-indigo-200 dark:bg-indigo-950/45 dark:text-indigo-300 dark:border-indigo-900/50 dark:hover:bg-indigo-950/70 active:scale-95'
                }`}
              >
                {isComparing ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Play size={14} className="fill-indigo-700/80 text-indigo-700 dark:fill-indigo-300/80 dark:text-indigo-300" />
                )}
                {isComparing ? (isHindi ? 'गणना हो रही है...' : 'Solving...') : (isHindi ? 'तुलना करें और चलाएं (Play)' : 'Compare & Play')}
              </button>
            </div>

            {/* Comparative Results block */}
            {compareResults && (
              <div id="compare-panel" className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-md flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                    <TrendingUp size={16} className="text-emerald-600" />
                    {isHindi ? 'एल्गोरिदम प्रदर्शन तुलना' : 'Optimization Comparison Report'}
                  </h4>
                  <button 
                    onClick={() => setCompareResults(null)}
                    className="text-slate-400 hover:text-slate-600 font-bold text-xs p-1"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {compareResults.map((c) => {
                    const isCurrent = settings.algorithm === c.algoKey;
                    const isWinner = winner?.algoKey === c.algoKey;

                    return (
                      <div
                        key={c.algoKey}
                        onClick={() => {
                          const updated = { ...settings, algorithm: c.algoKey };
                          setSettings(updated);
                          calculateResult(updated);
                        }}
                        className={`relative rounded-2xl border p-4 transition-all cursor-pointer flex flex-col gap-2 ${
                          isCurrent
                            ? 'border-indigo-600 bg-indigo-50/20 ring-2 ring-indigo-500/10'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {isWinner && (
                          <span className="absolute -top-2.5 right-3 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-sm">
                            <Award size={9} />
                            BEST
                          </span>
                        )}

                        <h5 className="font-bold text-slate-800 text-xs leading-normal">
                          {c.algoName.split('(')[0]}
                        </h5>

                        <div className="flex flex-col gap-1 mt-1">
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>{isHindi ? 'शीट्स' : 'Sheets'}:</span>
                            <span className="font-bold text-slate-700">{c.sheetsUsed}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>{isHindi ? 'मटीरियल उपयोग' : 'Efficiency'}:</span>
                            <span className="font-extrabold text-emerald-600">{c.utilization.toFixed(1)}%</span>
                          </div>
                          {c.unplacedCount > 0 && (
                            <div className="flex items-center justify-between text-xs text-slate-500 bg-rose-50 px-1 py-0.5 rounded">
                              <span className="text-rose-700 font-medium">{isHindi ? 'बचे पुर्जे' : 'Unplaced'}:</span>
                              <span className="font-bold text-rose-700">{c.unplacedCount}</span>
                            </div>
                          )}
                        </div>

                        <div className="border-t border-slate-100/60 pt-2 mt-2 flex items-center justify-center">
                          <span className={`text-[10px] font-bold ${isCurrent ? 'text-indigo-600' : 'text-slate-400'}`}>
                            {isCurrent ? (isHindi ? '● चयनित' : '● Selected') : (isHindi ? 'क्लिक कर चुनें' : 'Click to Apply')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* Results & Visualization Card - Bento Cell */}
          <section id="bento-visualizer" className="flex flex-col relative">
            {isCalculating && (
              <div className="absolute inset-0 z-10 bg-white/60 dark:bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center rounded-2xl transition-all">
                <div className="flex flex-col items-center gap-3 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700">
                  <RefreshCw className="animate-spin text-indigo-600 dark:text-indigo-400" size={32} />
                  <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
                    {isHindi ? 'ब्लैक-बॉक्स इंजन गणना कर रहा है...' : 'Black-Box Engine Calculating...'}
                  </span>
                </div>
              </div>
            )}
            {parts.length > 0 && parts.some(p => p.quantity > 0 && p.length > 0 && p.width > 0) ? (
              <LayoutVisualizerPanel
                result={result}
                settings={settings}
                language={language}
                translations={t}
                onPrint={handlePrint}
                onExportCsv={handleExportCsv}
                onExportJson={handleExportJson}
              />
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-sm text-center text-slate-400 flex flex-col items-center justify-center h-96 gap-4">
                <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center">
                  <Layers size={32} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-700 text-sm">{isHindi ? 'लेआउट के लिए कोई वैध पुर्जा नहीं' : 'No Valid Parts to Nest'}</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                    {isHindi 
                      ? 'कृपया कटिंग सूची में पुर्जों की लंबाई, चौड़ाई और मात्रा दर्ज करें ताकि विज़ुअलाइज़ेशन और लेआउट रिपोर्ट तैयार की जा सके।' 
                      : 'Add dimensions and quantities for your parts in the cutting list. The layout map and waste metrics will render instantly.'}
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Centralized Export Center Modal */}
      <ExportCenterModal
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
          onExportCsv={handleExportCsv}
          onExportJson={handleExportJson}
          onExportCNC={handleExportCNC}
          onPrint={handlePrint}
          onOpenReportPreview={() => setIsReportPreviewOpen(true)}
          isHindi={isHindi}
          translations={t}
          partsCount={parts.reduce((acc, p) => acc + (p.quantity || 0), 0)}
          sheetsCount={result?.totalSheetsUsed || 0}
          utilization={result?.totalUtilization || 0}
          parts={parts}
          settings={settings}
        />

        {/* Blueprint Visual Report & Share Engine */}
        <ReportPreviewModal
          isOpen={isReportPreviewOpen}
          onClose={() => setIsReportPreviewOpen(false)}
          parts={parts}
          settings={settings}
          result={result}
          isHindi={isHindi}
          onPrint={handlePrint}
        />

        {/* Estimate Calculator Modal */}
        {isCalcOpen && (
          <EstimateCalculatorModal
            onClose={() => setIsCalcOpen(false)}
            language={language}
          />
        )}

        {/* 2D Cabinet Designer Modal */}
        <CabinetDesignerModal
          isOpen={isCabinetDesignerOpen}
          onClose={() => setIsCabinetDesignerOpen(false)}
          language={language}
          unit={settings.unit}
          settings={settings}
          onAddParts={(newParts) => {
            setParts(prev => [...prev, ...newParts]);
            addToast(
              isHindi 
                ? 'अलमारी के सभी पुर्जे कटिंग लिस्ट में सफलतापूर्वक जोड़ दिए गए हैं!' 
                : 'Cabinet panel pieces added to cutting list successfully!', 
              'success'
            );
          }}
        />

        {/* Saved Files Modal */}
        <SavedFilesModal
          isOpen={isSavedFilesOpen}
          onClose={() => setIsSavedFilesOpen(false)}
          savedJobs={savedJobs}
          onDeleteJob={(id) => {
            setSavedJobs(prev => prev.filter(j => j.id !== id));
            if (activeJobId === id) {
              setActiveJobId(null);
            }
          }}
          onLoadJob={(job) => {
            setActiveJobId(job.id);
            setWorkspaceState({
              parts: job.parts,
              settings: job.settings
            });
          }}
          language={language}
          onUpdateJob={(updatedJob) => {
            setSavedJobs(prev => prev.map(j => j.id === updatedJob.id ? updatedJob : j));
          }}
        />

        {/* About App Modal */}
        <AboutModal
          isOpen={isAboutOpen}
          onClose={() => setIsAboutOpen(false)}
          isHindi={isHindi}
        />
        
        {isUserSessionsOpen && (
          <UserSessionsModal
            appConfig={appConfig}
            onUpdateAppConfig={setAppConfig}
            onClose={() => setIsUserSessionsOpen(false)}
            language={language}
          />
        )}

        {activeWorkerPortalId && (
          <WorkerSelfEntryPortal 
            workerId={activeWorkerPortalId} 
            language={language} 
          />
        )}

      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
