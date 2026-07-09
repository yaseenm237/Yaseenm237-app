import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Language, PartInput, SheetSettings, PackingResult, AlgoComparison, AppConfig, AttendanceSettings, AttendanceRecord } from '../types';
import { runPacking, compareAlgorithms, convertToMm } from '../utils/packer';
import * as Comlink from 'comlink';
import { generatePdfReport } from '../utils/pdfGenerator';
import { useLocalStorage } from './useLocalStorage';
import { useHistory } from './useHistory';
import { decompressPayload } from '../utils/shareCompressor';
import { TRANSLATIONS, DEFAULT_SETTINGS, INITIAL_PARTS } from '../data';
import { SavedJob } from '../components/SavedFilesModal';

const getInitialParts = (suffix: string = ''): PartInput[] => {
  try {
    const params = new URLSearchParams(window.location.search);
    const layoutParam = params.get('layout');
    if (layoutParam) {
      const decompressed = decompressPayload(layoutParam);
      if (decompressed && decompressed.parts) return decompressed.parts;
    }

    const session = window.sessionStorage.getItem(`carpentry_workspace_session${suffix}`);
    if (session) {
      const parsed = JSON.parse(session);
      if (parsed.parts) return parsed.parts;
    }
    const item = window.localStorage.getItem(`carpentry_parts${suffix}`);
    return item ? JSON.parse(item) : INITIAL_PARTS;
  } catch {
    return INITIAL_PARTS;
  }
};

const getInitialSettings = (suffix: string = ''): SheetSettings => {
  try {
    const params = new URLSearchParams(window.location.search);
    const layoutParam = params.get('layout');
    if (layoutParam) {
      const decompressed = decompressPayload(layoutParam);
      if (decompressed && decompressed.settings) return { ...DEFAULT_SETTINGS, ...decompressed.settings };
    }

    const session = window.sessionStorage.getItem(`carpentry_workspace_session${suffix}`);
    let loadedSettings = DEFAULT_SETTINGS;
    if (session) {
      const parsed = JSON.parse(session);
      if (parsed.settings) loadedSettings = { ...DEFAULT_SETTINGS, ...parsed.settings };
    } else {
      const item = window.localStorage.getItem(`carpentry_settings${suffix}`);
      if (item) {
        loadedSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(item) };
      }
    }
    if (!loadedSettings.stockItems || loadedSettings.stockItems.length === 0) {
      loadedSettings.stockItems = [ ...DEFAULT_SETTINGS.stockItems! ];
    }
    if (!loadedSettings.sunmicaItems || loadedSettings.sunmicaItems.length === 0) {
      loadedSettings.sunmicaItems = [ ...DEFAULT_SETTINGS.sunmicaItems! ];
    }
    return loadedSettings;
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export const useCarpentryEngine = () => {
  const [appConfig, setAppConfig] = useLocalStorage<AppConfig>('carpentry_app_config', {
    users: [{ id: 'default', name: 'Default User', createdAt: Date.now(), lastActive: Date.now() }],
    activeUserId: 'default'
  });
  
  const activeUserSuffix = appConfig.activeUserId === 'default' ? '' : `_${appConfig.activeUserId}`;
  const [isUserSessionsOpen, setIsUserSessionsOpen] = useState(false);

  const [language, setLanguage] = useLocalStorage<Language>(`carpentry_language${activeUserSuffix}`, 'English');
  const [theme, setTheme] = useLocalStorage<'light' | 'dark'>(`carpentry_theme${activeUserSuffix}`, 'light');
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const [attendanceData, setAttendanceData] = useLocalStorage<AttendanceSettings>(`carpentry_attendance${activeUserSuffix}`, {
    contractorName: '',
    contractorPhone: '',
    workers: [],
    records: []
  });
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);
  const [activeWorkerPortalId, setActiveWorkerPortalId] = useState<string | null>(null);
  
  // Single-source design history state
  const {
    state: workspaceState,
    set: setWorkspaceState,
    undo,
    redo,
    canUndo,
    canRedo,
    reset: resetWorkspace
  } = useHistory<{ parts: PartInput[]; settings: SheetSettings }>({
    parts: getInitialParts(activeUserSuffix),
    settings: getInitialSettings(activeUserSuffix)
  });

  // Re-initialize parts and settings when active user changes
  useEffect(() => {
    resetWorkspace({
      parts: getInitialParts(activeUserSuffix),
      settings: getInitialSettings(activeUserSuffix)
    });
  }, [activeUserSuffix, resetWorkspace]);

  const { parts, settings } = workspaceState;

  // Wrapped setters to maintain full backward compatibility with child components
  const setParts = useCallback((updater: PartInput[] | ((prev: PartInput[]) => PartInput[])) => {
    setWorkspaceState((curr) => {
      const nextParts = typeof updater === 'function' ? updater(curr.parts) : updater;
      if (nextParts.length === 0) {
        setActiveJobId(null);
      }
      return {
        ...curr,
        parts: nextParts
      };
    });
  }, [setWorkspaceState]);

  const setSettings = useCallback((updater: SheetSettings | ((prev: SheetSettings) => SheetSettings)) => {
    setWorkspaceState((curr) => {
      const nextSettings = typeof updater === 'function' ? updater(curr.settings) : updater;
      return {
        ...curr,
        settings: nextSettings
      };
    });
  }, [setWorkspaceState]);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCabinetDesignerOpen, setIsCabinetDesignerOpen] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<'saving' | 'saved' | 'idle'>('idle');

  // Synchronize state with LocalStorage and SessionStorage (Autosave Indicator)
  useEffect(() => {
    setAutosaveStatus('saving');
    try {
      window.localStorage.setItem(`carpentry_parts${activeUserSuffix}`, JSON.stringify(parts));
      window.localStorage.setItem(`carpentry_settings${activeUserSuffix}`, JSON.stringify(settings));
      window.sessionStorage.setItem(`carpentry_workspace_session${activeUserSuffix}`, JSON.stringify({ parts, settings }));
    } catch (error) {
      console.warn("Failed to persist carpentry states:", error);
    }

    const timer = setTimeout(() => {
      setAutosaveStatus('saved');
    }, 600);

    return () => clearTimeout(timer);
  }, [parts, settings, activeUserSuffix]);

  const [result, setResult] = useState<PackingResult>({
    layouts: [],
    totalSheetsUsed: 0,
    totalUtilization: 0,
    overallWastePercent: 0,
    totalPartsArea: 0,
    totalBandingLength: 0,
    unplacedParts: []
  });
  const [compareResults, setCompareResults] = useState<AlgoComparison[] | null>(null);
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isReportPreviewOpen, setIsReportPreviewOpen] = useState<boolean>(false);
  const [isCalcOpen, setIsCalcOpen] = useState<boolean>(false);
  const [isSavedFilesOpen, setIsSavedFilesOpen] = useState<boolean>(false);
  const [savedJobs, setSavedJobs] = useLocalStorage<SavedJob[]>(`carpentry_saved_jobs${activeUserSuffix}`, []);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'info' }[]>([]);
  const isFirstMount = useRef(true);
  const skipAutosaveToast = useRef(false);

  const workerRef = useRef<Worker | null>(null);
  const engineRef = useRef<any>(null);

  useEffect(() => {
    const worker = new Worker(new URL('../worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    engineRef.current = Comlink.wrap(worker);
    return () => {
      worker.terminate();
    };
  }, []);

  const t = TRANSLATIONS[language];
  const isHindi = language === 'Hindi';

  const addToast = useCallback((message: string, type: 'success' | 'info' = 'success') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleUndo = useCallback(() => {
    if (canUndo) {
      skipAutosaveToast.current = true;
      undo();
      addToast(isHindi ? "पूर्ववत (पीछे जाएं) किया गया" : "Undone last change", 'info');
    }
  }, [canUndo, undo, isHindi, addToast]);

  const handleRedo = useCallback(() => {
    if (canRedo) {
      skipAutosaveToast.current = true;
      redo();
      addToast(isHindi ? "रीडू (आगे बढ़ें) किया गया" : "Redone last change", 'info');
    }
  }, [canRedo, redo, isHindi, addToast]);

  // Keyboard shortcut support (Ctrl+Z / Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      if (isCmdOrCtrl) {
        if (e.key === 'z' || e.key === 'Z') {
          if (e.shiftKey) {
            e.preventDefault();
            handleRedo();
          } else {
            e.preventDefault();
            handleUndo();
          }
        } else if (e.key === 'y' || e.key === 'Y') {
          e.preventDefault();
          handleRedo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleUndo, handleRedo]);

  // Automatically clear layout if there are no valid parts
  useEffect(() => {
    const hasValidParts = parts && parts.length > 0 && parts.some(p => p.quantity > 0 && p.length > 0 && p.width > 0);
    if (!hasValidParts) {
      setResult({
        layouts: [],
        totalSheetsUsed: 0,
        totalUtilization: 0,
        overallWastePercent: 0,
        totalPartsArea: 0,
        totalBandingLength: 0,
        unplacedParts: []
      });
      setCompareResults(null);
    }
  }, [parts]);

  // Manual calculation of cutting list
  const calculateResult = async (overrideSettings?: SheetSettings) => {
    setIsCalculating(true);
    let success = false;
    const activeSettings = (overrideSettings && typeof overrideSettings === 'object' && 'unit' in overrideSettings) ? overrideSettings : settings;

    // Use worker if ready
    if (engineRef.current) {
      try {
        const S_L = convertToMm(activeSettings.sheetL, activeSettings.unit);
        const S_W = convertToMm(activeSettings.sheetW, activeSettings.unit);
        const binW = Math.max(1.0, S_L - 2 * activeSettings.trimMargin);
        const binH = Math.max(1.0, S_W - 2 * activeSettings.trimMargin);

        const input = {
          stock: { length: binW, width: binH },
          parts: parts.map(p => { 
             const lMm = convertToMm(p.length, activeSettings.unit);
             const wMm = convertToMm(p.width, activeSettings.unit);
             let currentEdgeTh = activeSettings.edgeTh;
             if (p.edgeMaterialId && activeSettings.edgeBandItems) {
               const edgeBand = activeSettings.edgeBandItems.find(e => e.id === p.edgeMaterialId);
               if (edgeBand && edgeBand.thickness !== undefined) {
                 currentEdgeTh = edgeBand.thickness;
               }
             }
             const dL = (Number(p.edges?.T || false) + Number(p.edges?.B || false)) * currentEdgeTh;
             const dW = (Number(p.edges?.L || false) + Number(p.edges?.R || false)) * currentEdgeTh;
             return {
               id: p.id,
               name: p.name || 'Unnamed',
               length: Math.max(1.0, lMm - dL),
               width: Math.max(1.0, wMm - dW),
               quantity: p.quantity,
               grain: p.grain,
               allowRot: p.allowRot
             };
          }),
          settings: { 
            kerf: activeSettings.bladeTh, 
            algo: activeSettings.algorithm,
            respectGrain: activeSettings.respectGrain !== false
          }
        };

        console.log("[App] Preparing and sending input to WASM Worker:", JSON.stringify(input, null, 2));
        
        // Call the Rust engine
        const wasmRes = await engineRef.current.runPacking(input);
        console.log("[App] Received result from WASM Worker:", JSON.stringify(wasmRes, null, 2));
        
        if (wasmRes && wasmRes.status === 'success') {
          // Map Rust results to App's PackingResult type
          const findOrigPart = (pId: string) => {
            let found = parts.find(op => op.id === pId);
            if (found) return found;
            const lastUnderscoreIndex = pId.lastIndexOf('_');
            if (lastUnderscoreIndex !== -1) {
              const prefix = pId.substring(0, lastUnderscoreIndex);
              found = parts.find(op => op.id === prefix);
              if (found) return found;
            }
            const firstToken = pId.split('_')[0];
            return parts.find(op => op.id === firstToken);
          };
          
          let placedPartsArea = 0;
          wasmRes.layouts.forEach((l: any) => {
             l.parts.forEach((p: any) => {
               const origPart = findOrigPart(p.id);
               if (origPart) {
                  const lMm = convertToMm(origPart.length, activeSettings.unit);
                  const wMm = convertToMm(origPart.width, activeSettings.unit);
                  placedPartsArea += (lMm * wMm);
               }
             });
          });
          
          const totalStockArea = wasmRes.layouts.length * S_L * S_W;
          const actualUtilization = totalStockArea > 0 ? (placedPartsArea / totalStockArea) * 100 : 0;
          const actualWaste = 100 - actualUtilization;
          
          let totalPartsArea = 0;
          input.parts.forEach(p => {
            totalPartsArea += (p.length * p.width * p.quantity);
          });
          
          const transformedResult: PackingResult = {
            layouts: wasmRes.layouts.map((l: any) => ({
              sheetIndex: l.sheet_index,
              width: l.width,
              height: l.height,
              usedArea: l.used_area,
              totalArea: l.total_area,
              wastePercent: l.waste_percent,
              wasteRects: l.waste_rects,
              parts: l.parts.map((p: any) => {
                const origPart = findOrigPart(p.id);
                const lMm = origPart ? convertToMm(origPart.length, activeSettings.unit) : p.w;
                const wMm = origPart ? convertToMm(origPart.width, activeSettings.unit) : p.h;
                return {
                  id: p.id,
                  name: p.name,
                  x: p.x,
                  y: p.y,
                  w: p.w,
                  h: p.h,
                  isRotated: p.is_rotated,
                  origL: lMm,
                  origW: wMm,
                  cutL: p.is_rotated ? p.h : p.w,
                  cutW: p.is_rotated ? p.w : p.h,
                  edges: origPart?.edges || { T:false, B:false, L:false, R:false },
                  grain: origPart?.grain || 'N',
                  drillHoles: origPart?.drillHoles
                };
              })
            })),
            totalSheetsUsed: wasmRes.layouts.length,
            totalUtilization: actualUtilization,
            overallWastePercent: actualWaste,
            totalPartsArea,
            totalBandingLength: 0, // Computed in UI or later
            unplacedParts: wasmRes.unplaced_parts.map((p: any) => ({
              name: p.name,
              qty: p.quantity
            }))
          };
          
          setResult(transformedResult);
          success = true;
        } else {
          console.warn("[App] WASM Worker failed or returned non-success status:", wasmRes);
        }
      } catch (err) {
        console.error("[App] Worker calculation error:", err);
      }
    }

    if (!success) {
      console.log("[App] Running fallback JS-based packing algorithm...");
      const updatedResult = runPacking(parts, activeSettings);
      setResult(updatedResult);

      if (compareResults) {
        const comp = compareAlgorithms(parts, activeSettings);
        setCompareResults(comp);
      }
    }

    setIsCalculating(false);
  };

  const handleLanguageToggle = () => {
    setLanguage(prev => prev === 'English' ? 'Hindi' : 'English');
  };

  const handleCompareAlgos = async () => {
    setIsComparing(true);
    // short delay to show loading state
    await new Promise(resolve => setTimeout(resolve, 300));
    try {
      const comp = compareAlgorithms(parts, settings);
      setCompareResults(comp);
      
      // Find the winner algorithm that uses the least sheets and has highest efficiency
      const best = [...comp].sort((a, b) => {
        if (a.unplacedCount !== b.unplacedCount) return a.unplacedCount - b.unplacedCount;
        if (a.sheetsUsed !== b.sheetsUsed) return a.sheetsUsed - b.sheetsUsed;
        return b.utilization - a.utilization;
      })[0];

      if (best) {
        const updatedSettings = { ...settings, algorithm: best.algoKey };
        setSettings(updatedSettings);
        await calculateResult(updatedSettings);
        
        addToast(
          isHindi 
            ? `अनुकूलन पूरा हुआ! सर्वोत्तम परिणाम: ${best.algoName.split('(')[0]}`
            : `Optimization complete! Best algorithm applied: ${best.algoName.split('(')[0]}`,
          "success"
        );
      } else {
        await calculateResult(settings);
      }
    } catch (err) {
      console.error("[App] Heuristics compare error:", err);
    } finally {
      setIsComparing(false);
    }
  };

  // Internal save and reset (Feature 4 & 3)
  const saveJobToStorageAndReset = () => {
    const job: SavedJob = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
      name: `Project ${new Date().toLocaleString()}`,
      date: new Date().toISOString(),
      parts: [...parts],
      settings: { ...settings }
    };
    setSavedJobs(prev => [job, ...prev]);
    
    // Auto-clean
    setParts([]);
    setResult({
      layouts: [],
      totalSheetsUsed: 0,
      totalUtilization: 0,
      overallWastePercent: 0,
      totalPartsArea: 0,
      totalBandingLength: 0,
      unplacedParts: []
    });
    setCompareResults(null);
    setActiveJobId(null);
  };

  const handleUpdateJobSettings = (jobId: string, updatedSettings: SheetSettings) => {
    setSavedJobs(prev => prev.map(job => {
      if (job.id === jobId) {
        return {
          ...job,
          settings: { ...updatedSettings }
        };
      }
      return job;
    }));
    
    // Also, if the updated job is the active job currently loaded, we should update the workspace settings in real time!
    if (activeJobId === jobId) {
      setSettings(updatedSettings);
    }
  };

  // CSV Export trigger
  const handleExportCsv = () => {
    let csvContent = "data:text/csv;charset=utf-8,\ufeff"; // Add BOM for Excel UTF-8 support
    const headers = "Part Name,Length,Width,Pressed Thickness (mm),Material Recipe,Full Material Detail,Base Plywood,Front Mica,Back Mica,Grain,Rotation,Quantity,Edges(TBLR)";
    csvContent += headers + "\n";

    const lines: string[] = [headers];

    parts.forEach(p => {
      if (p.quantity <= 0) return;
      const edgesStr = Object.entries(p.edges)
        .filter(([_, active]) => active)
        .map(([name, _]) => name)
        .join('');

      let recipeName = '';
      let baseMatName = '';
      let frontMicaName = '';
      let backMicaName = '';
      let thickness = 0;

      if (p.recipeId && settings.recipes) {
        const recipe = settings.recipes.find(r => r.id === p.recipeId);
        if (recipe) {
          recipeName = recipe.name;
          thickness = recipe.calculatedThickness || 18.0;
          const baseMat = settings.stockItems?.find(s => s.id === recipe.baseMaterialId);
          if (baseMat) baseMatName = baseMat.name;

          const sideAMica = settings.sunmicaItems?.find(s => s.id === recipe.sideAMicaId);
          if (sideAMica) {
            frontMicaName = sideAMica.code ? `${sideAMica.name} [${sideAMica.code}]` : sideAMica.name;
          }
          const sideBMica = settings.sunmicaItems?.find(s => s.id === recipe.sideBMicaId);
          if (sideBMica) {
            backMicaName = sideBMica.code ? `${sideBMica.name} [${sideBMica.code}]` : sideBMica.name;
          }
        }
      } else {
        const baseMat = settings.stockItems?.find(s => s.id === p.materialId);
        if (baseMat) {
          baseMatName = baseMat.name;
          thickness = baseMat.thickness || 18.0;
        }
        const sideAMica = settings.sunmicaItems?.find(s => s.id === p.frontLaminateId);
        if (sideAMica) {
          frontMicaName = sideAMica.code ? `${sideAMica.name} [${sideAMica.code}]` : sideAMica.name;
        }
        const sideBMica = settings.sunmicaItems?.find(s => s.id === p.backLaminateId);
        if (sideBMica) {
          backMicaName = sideBMica.code ? `${sideBMica.name} [${sideBMica.code}]` : sideBMica.name;
        }
      }

      const fullDetail = `${baseMatName}${frontMicaName ? ` + Front: ${frontMicaName}` : ''}${backMicaName ? ` + Back: ${backMicaName}` : ''}`;

      const row = [
        `"${p.name || 'Unnamed'}"`,
        p.length,
        p.width,
        thickness,
        `"${recipeName}"`,
        `"${fullDetail}"`,
        `"${baseMatName}"`,
        `"${frontMicaName}"`,
        `"${backMicaName}"`,
        p.grain || 'N',
        p.allowRot ? 'Allowed' : 'Locked',
        p.quantity,
        `"${edgesStr}"`
      ].join(',');
      lines.push(row);
    });

    const csvStr = lines.join("\n");
    const encodedUri = encodeURI(csvContent + csvStr);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `carpentry_cutting_list_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addToast(isHindi ? "CSV सफलतापूर्वक डाउनलोड हो गया है!" : "CSV downloaded successfully!", "success");
  };

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ parts, settings }));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `carpentry_workspace_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.removeChild(downloadAnchor);
    addToast(isHindi ? "JSON सफलतापूर्वक एक्सपोर्ट किया गया!" : "JSON exported successfully!", "success");
  };

  const handleExportCNC = () => {
    const lines: string[] = ["# SMART CARPENTRY CNC G-CODE & COORDINATES EXPORT", `# GENERATED: ${new Date().toLocaleString()}`, "# ID,Part Name,X_Start,Y_Start,Width_X,Height_Y,Thickness,Base Plywood,Front Laminate,Back Laminate,Edgeband_TBLR"];
    
    result.layouts.forEach((layout, sheetIdx) => {
      lines.push(`\n# --- SHEET STAGE ${sheetIdx + 1} (${layout.width}x${layout.height}) ---`);
      layout.parts.forEach((p) => {
        const origPart = parts.find(op => op.id === p.id.split('_')[0]);
        let basePlywood = '';
        let frontLaminate = '';
        let backLaminate = '';
        let thickness = 18.0;

        if (origPart) {
          if (origPart.recipeId && settings.recipes) {
            const rec = settings.recipes.find(r => r.id === origPart.recipeId);
            if (rec) {
              const baseMat = settings.stockItems?.find(s => s.id === rec.baseMaterialId);
              basePlywood = baseMat ? baseMat.name : '';
              frontLaminate = settings.sunmicaItems?.find(s => s.id === rec.sideAMicaId)?.name || '';
              backLaminate = settings.sunmicaItems?.find(s => s.id === rec.sideBMicaId)?.name || '';
              thickness = rec.calculatedThickness || 18.0;
            }
          } else {
            const baseMat = settings.stockItems?.find(s => s.id === origPart.materialId);
            basePlywood = baseMat ? baseMat.name : '';
            frontLaminate = settings.sunmicaItems?.find(s => s.id === origPart.frontLaminateId)?.name || '';
            backLaminate = settings.sunmicaItems?.find(s => s.id === origPart.backLaminateId)?.name || '';
            thickness = baseMat ? (baseMat.thickness || 18.0) : 18.0;
          }
        }

        const edgeStr = origPart ? Object.entries(origPart.edges).filter(([_, v]) => v).map(([k]) => k).join('') : '';
        const line = `${p.id},"${p.name}",${p.x},${p.y},${p.w},${p.h},${thickness},"${basePlywood}","${frontLaminate}","${backLaminate}","${edgeStr}"`;
        lines.push(line);
      });
    });

    try {
      navigator.clipboard.writeText(lines.join("\n"));
      addToast(
        isHindi 
          ? "सीएनसी कोआर्डिनेट्स क्लिपबोर्ड पर कॉपी और डाउनलोड हो गए हैं!" 
          : "CNC Coordinates copied to clipboard & downloaded successfully!", 
        "success"
      );
    } catch (e) {
      console.error(e);
    }

    const csvStr = lines.join("\n");
    const fileName = "cnc_coordinates.csv";
    const csvBlob = new Blob([csvStr], { type: "text/csv;charset=utf-8;" });

    try {
      const fileObj = new File([csvBlob], fileName, { type: "text/csv" });
      if (navigator.canShare && navigator.canShare({ files: [fileObj] as any })) {
        navigator.share({
          files: [fileObj],
          title: "CNC Coordinates",
          text: "Here is your CNC coordinates CSV file."
        }).catch((e) => {
          console.log("Share cancelled", e);
          const url = URL.createObjectURL(csvBlob);
          const link = document.createElement("a");
          link.href = url;
          link.download = fileName;
          link.click();
          URL.revokeObjectURL(url);
        });
      } else {
        const url = URL.createObjectURL(csvBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        if (parsed.settings && parsed.parts) {
          setWorkspaceState({
            settings: parsed.settings,
            parts: parsed.parts
          });
          alert(isHindi ? 'कॉन्फ़िगरेशन सफलतापूर्वक आयात कर लिया गया है!' : 'Configuration successfully imported!');
        } else {
          alert(isHindi ? 'त्रुटि: फ़ाइल प्रारूप अमान्य है।' : 'Error: Invalid file format.');
        }
      } catch (err) {
        alert(isHindi ? 'त्रुटि: फ़ाइल पढ़ने में विफल।' : 'Error: Failed to read file.');
      }
    };
    reader.readAsText(file);
  };

  const handlePrint = () => {
    if (result && parts && parts.length > 0) {
      try {
        generatePdfReport(parts, settings, result, language);
        saveJobToStorageAndReset();
      } catch (err) {
        console.error("PDF generation failed:", err);
        alert(language === 'Hindi' ? "पीडीएफ बनाने में त्रुटि: " + (err as Error).message : "Error generating PDF: " + (err as Error).message);
        saveJobToStorageAndReset();
      }
    } else {
      alert(language === 'Hindi' ? "निर्यात करने के लिए कोई डेटा नहीं है।" : "No data to export.");
    }
  };

  const getWinnerAlgo = () => {
    if (!compareResults) return null;
    return [...compareResults].sort((a, b) => {
      if (a.unplacedCount !== b.unplacedCount) return a.unplacedCount - b.unplacedCount;
      if (a.sheetsUsed !== b.sheetsUsed) return a.sheetsUsed - b.sheetsUsed;
      return b.utilization - a.utilization;
    })[0];
  };

  const winner = getWinnerAlgo();

  return {
    appConfig,
    setAppConfig,
    activeUserSuffix,
    isUserSessionsOpen,
    setIsUserSessionsOpen,
    language,
    setLanguage,
    theme,
    setTheme,
    isAboutOpen,
    setIsAboutOpen,
    handleToggleTheme,
    attendanceData,
    setAttendanceData,
    isAttendanceOpen,
    setIsAttendanceOpen,
    activeWorkerPortalId,
    setActiveWorkerPortalId,
    workspaceState,
    setWorkspaceState,
    undo,
    redo,
    canUndo,
    canRedo,
    resetWorkspace,
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
    setResult,
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
    setToasts,
    addToast,
    removeToast,
    handleUndo,
    handleRedo,
    calculateResult,
    handleLanguageToggle,
    handleCompareAlgos,
    saveJobToStorageAndReset,
    handleUpdateJobSettings,
    handleExportCsv,
    handleExportJson,
    handleExportCNC,
    handleImportJson,
    handlePrint,
    winner,
    t,
    isHindi
  };
};
