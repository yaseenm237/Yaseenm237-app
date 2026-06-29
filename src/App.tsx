/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Language, Unit, PartInput, SheetSettings, PackingResult, AlgoComparison } from './types';
import { runPacking, compareAlgorithms, convertMmToUnit, convertToMm } from './utils/packer';
import { generatePdfReport } from './utils/pdfGenerator';
import SettingsModal from './components/SettingsModal';
import CuttingListPanel from './components/CuttingListPanel';
import LayoutVisualizerPanel from './components/LayoutVisualizerPanel';
import ExportCenterModal from './components/ExportCenterModal';
import ReportPreviewModal from './components/ReportPreviewModal';
import EstimateCalculatorModal from './components/EstimateCalculatorModal';
import SavedFilesModal, { SavedJob } from './components/SavedFilesModal';
import ToastContainer, { ToastMessage } from './components/Toast';
import HeaderMenu from './components/HeaderMenu';
import CabinetDesignerModal from './components/CabinetDesignerModal';
import AttendanceModal from './components/AttendanceModal';
import AboutModal from './components/AboutModal';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useHistory } from './hooks/useHistory';
import { Material, AttendanceSettings, AttendanceRecord } from './types';
import { 
  Languages, 
  HelpCircle, 
  Layers, 
  Sparkles, 
  TrendingUp, 
  CheckCircle, 
  Flame, 
  Award, 
  Hammer, 
  RefreshCw,
  Undo2,
  Redo2,
  Settings,
  Calculator,
  Folder,
  Sun,
  Moon,
  Info
} from 'lucide-react';

const TRANSLATIONS = {
  English: {
    title: "Smart Carpentry Optimizer",
    subtitle: "Sahira Interior",
    sheet_l: "Sheet Length",
    sheet_w: "Sheet Width",
    blade_th: "Kerf (mm)",
    trim_m: "Trim (mm)",
    edge_th: "Edge Banding (mm)",
    stock_sh: "Stock Sheets",
    h_name: "Part Name",
    h_l: "Length",
    h_w: "Width",
    h_grain: "Grain",
    h_qty: "Qty",
    h_edges: "Edges",
    btn_generate: "Generate Layout",
    btn_export: "Export CSV",
    add_row: "Add Row",
    btn_pdf: "Print Layout / PDF",
    btn_json: "Export JSON",
    btn_import_json: "Import JSON",
    btn_more_options: "More Options",
    packing_algo: "Packing Algorithm",
    compare_algos: "Compare Algorithms",
    settings: "Sheet & Optimization Settings",
    cut_list: "Cutting List (Parts)",
    presets: "Load Carpentry Preset",
    efficiency: "Material Efficiency",
    waste: "Overall Waste",
    sheets_used: "Sheets Used",
    total_banding: "Total Edge Banding",
    clear_list: "Clear List",
    unplaced_title: "⚠️ Unplaced Parts (Don't Fit)",
    unplaced_desc: "These parts could not be packed into the available sheet stock. Increase available stock sheets or reduce part count.",
    grain_l: "Lengthwise (Grain ↕)",
    grain_w: "Widthwise (Grain ↔)",
    grain_n: "No Grain (Free ♻)",
    allow_rot: "Allow Rotation",
    edge_select_title: "Configure Edge Banding",
    edge_select_desc: "Select which edges of the part should have edge banding applied. Wooden cut size is automatically reduced by banding thickness.",
    save: "Save",
    top: "Top",
    bottom: "Bottom",
    left: "Left",
    right: "Right",
    utilization_score: "Utilization Score",
    sheet_details: "Sheet Details",
    sheet_waste: "Waste",
    sheet_parts_header: "Parts on this Sheet",
    part_size: "Finished Size",
    cut_size: "Cut Size",
    applied_banding: "Edge Banding"
  },
  Hindi: {
    title: "स्मार्ट बढ़ईगिरी ऑप्टिमाइज़र",
    subtitle: "साहिरा इंटीरियर (Sahira Interior)",
    sheet_l: "शीट लंबाई",
    sheet_w: "शीट चौड़ाई",
    blade_th: "ब्लेड मोटाई (mm)",
    trim_m: "ट्रिम (mm)",
    edge_th: "किनारा एजबेंडिंग (mm)",
    stock_sh: "स्टॉक",
    h_name: "पुर्जे का नाम",
    h_l: "लंबाई",
    h_w: "चौड़ाई",
    h_grain: "ग्रेन (Grain)",
    h_qty: "मात्रा",
    h_edges: "किनारा",
    btn_generate: "लेआउट बनाएँ",
    btn_export: "CSV एक्सपोर्ट",
    add_row: "नया जोड़ें",
    btn_pdf: "प्रिंट लेआउट / PDF",
    btn_json: "JSON एक्सपोर्ट",
    btn_import_json: "JSON आयात",
    btn_more_options: "अधिक विकल्प",
    packing_algo: "पैकिंग एल्गोरिथम",
    compare_algos: "एल्गोरिदम तुलना",
    settings: "शीट और अनुकूलन सेटिंग्स",
    cut_list: "कटिंग सूची (पुर्जे)",
    presets: "कारपेंट्री प्रिसैट लोड करें",
    efficiency: "मटीरियल उपयोग दक्षता",
    waste: "कुल वेस्ट (Waste)",
    sheets_used: "कुल लगी शीटें",
    total_banding: "कुल एजबेंडिंग लंबाई",
    clear_list: "सूची साफ़ करें",
    unplaced_title: "⚠️ बिना पैक हुए पुर्जे",
    unplaced_desc: "ये पुर्जे उपलब्ध स्टॉक शीट्स में फिट नहीं हो सके। स्टॉक शीट्स बढ़ाएं या पुर्जों की संख्या कम करें।",
    grain_l: "लंबाई में (ग्रेन ↕)",
    grain_w: "चौड़ाई में (ग्रेन ↔)",
    grain_n: "बिना ग्रेन (स्वतंत्र ♻)",
    allow_rot: "घुमाएँ (Rotation)",
    edge_select_title: "एजबेंडिंग सेट करें",
    edge_select_desc: "चुनें कि पुर्जे के किन किनारों पर एजबेंडिंग लगाई जानी है। एजबेंडिंग लगाने पर वास्तविक लकड़ी काटने की साइज़ मोटाई के अनुसार घट जाएगी।",
    save: "सुरक्षित करें",
    top: "ऊपर (Top)",
    bottom: "नीचे (Bottom)",
    left: "बायाँ (Left)",
    right: "दायाँ (Right)",
    utilization_score: "मटीरियल उपयोग स्कोर",
    sheet_details: "शीट विवरण",
    sheet_waste: "वेस्ट",
    sheet_parts_header: "इस शीट पर पुर्जे",
    part_size: "तैयार साइज़",
    cut_size: "कटिंग साइज़",
    applied_banding: "एजबेंडिंग"
  }
};

const DEFAULT_SETTINGS: SheetSettings = {
  unit: 'Inch',
  sheetL: 96.0,
  sheetW: 48.0,
  bladeTh: 3.0, // standard table saw kerf (3mm)
  trimMargin: 10.0, // standard trim margin (10mm)
  edgeTh: 2.0, // standard edge banding (2mm)
  stock: 5,
  algorithm: 'AutoBest',
  sheetCost: 45.0,
  stockItems: [
    { id: 'mat-plywood', name: '18mm Plywood (प्लाईवुड)', length: 96.0, width: 48.0, cost: 45.0 },
    { id: 'mat-mdf', name: '18mm MDF (एमडीएफ)', length: 96.0, width: 48.0, cost: 35.0 },
    { id: 'mat-melamine', name: '18mm Melamine (मेलामाइन्)', length: 96.0, width: 48.0, cost: 40.0 }
  ],
  edgeBandItems: [
    { id: 'edge-white', name: 'White 0.8mm Edge Band', thickness: 0.8 },
    { id: 'edge-wood', name: 'Woodgrain 2mm Edge Band', thickness: 2.0 }
  ]
};

const INITIAL_PARTS: PartInput[] = [
  {
    id: '1',
    name: 'Wardrobe Side Panel (बायाँ)',
    length: 84.0,
    width: 22.0,
    grain: 'L',
    allowRot: false,
    quantity: 2,
    edges: { T: true, B: true, L: true, R: false },
    materialId: 'mat-plywood'
  },
  {
    id: '2',
    name: 'Wardrobe Shelves (रैक)',
    length: 34.5,
    width: 21.5,
    grain: 'L',
    allowRot: true,
    quantity: 4,
    edges: { T: true, B: false, L: false, R: false },
    materialId: 'mat-mdf'
  },
  {
    id: '3',
    name: 'Drawer Fronts (दराज)',
    length: 11.5,
    width: 33.0,
    grain: 'W',
    allowRot: false,
    quantity: 3,
    edges: { T: true, B: true, L: true, R: true },
    materialId: 'mat-melamine'
  }
];

const getInitialParts = (): PartInput[] => {
  try {
    const session = window.sessionStorage.getItem('carpentry_workspace_session');
    if (session) {
      const parsed = JSON.parse(session);
      if (parsed.parts) return parsed.parts;
    }
    const item = window.localStorage.getItem('carpentry_parts');
    return item ? JSON.parse(item) : INITIAL_PARTS;
  } catch {
    return INITIAL_PARTS;
  }
};

const getInitialSettings = (): SheetSettings => {
  try {
    const session = window.sessionStorage.getItem('carpentry_workspace_session');
    let loadedSettings = DEFAULT_SETTINGS;
    if (session) {
      const parsed = JSON.parse(session);
      if (parsed.settings) loadedSettings = { ...DEFAULT_SETTINGS, ...parsed.settings };
    } else {
      const item = window.localStorage.getItem('carpentry_settings');
      if (item) {
        loadedSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(item) };
      }
    }
    if (!loadedSettings.stockItems || loadedSettings.stockItems.length === 0) {
      loadedSettings.stockItems = [ ...DEFAULT_SETTINGS.stockItems! ];
    }
    return loadedSettings;
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export default function App() {
  const [language, setLanguage] = useLocalStorage<Language>('carpentry_language', 'English');
  const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('carpentry_theme', 'light');
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

  const [attendanceData, setAttendanceData] = useLocalStorage<AttendanceSettings>('carpentry_attendance', {
    contractorName: '',
    contractorPhone: '',
    workers: [],
    records: []
  });
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);
  
  // Single-source design history state
  const {
    state: workspaceState,
    set: setWorkspaceState,
    undo,
    redo,
    canUndo,
    canRedo
  } = useHistory<{ parts: PartInput[]; settings: SheetSettings }>({
    parts: getInitialParts(),
    settings: getInitialSettings()
  });

  const { parts, settings } = workspaceState;

  // Wrapped setters to maintain full backward compatibility with child components
  const setParts = (updater: PartInput[] | ((prev: PartInput[]) => PartInput[])) => {
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
  };

  const setSettings = (updater: SheetSettings | ((prev: SheetSettings) => SheetSettings)) => {
    setWorkspaceState((curr) => {
      const nextSettings = typeof updater === 'function' ? updater(curr.settings) : updater;
      return {
        ...curr,
        settings: nextSettings
      };
    });
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const workerAuth = params.get('workerAuth');
    const recordAttendance = params.get('recordAttendance');
    
    if (recordAttendance) {
      try {
        const payload = JSON.parse(atob(recordAttendance));
        if (payload.w && payload.s && payload.d) {
          const newRecord: AttendanceRecord = {
            id: `r-${Date.now()}`,
            workerId: payload.w,
            status: payload.s,
            date: payload.d,
            timestamp: payload.t || Date.now()
          };
          setAttendanceData(prev => ({
            ...prev,
            records: [...(prev.records || []), newRecord]
          }));
          alert(language === 'Hindi' ? 'हाजिरी सफलतापूर्वक दर्ज की गई!' : 'Attendance recorded successfully!');
          window.history.replaceState({}, document.title, window.location.pathname);
          setIsAttendanceOpen(true);
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, [setAttendanceData, language]);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCabinetDesignerOpen, setIsCabinetDesignerOpen] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<'saving' | 'saved' | 'idle'>('idle');

  // Synchronize state with LocalStorage and SessionStorage (Autosave Indicator)
  useEffect(() => {
    setAutosaveStatus('saving');
    try {
      window.localStorage.setItem('carpentry_parts', JSON.stringify(parts));
      window.localStorage.setItem('carpentry_settings', JSON.stringify(settings));
      window.sessionStorage.setItem('carpentry_workspace_session', JSON.stringify({ parts, settings }));
    } catch (error) {
      console.warn("Failed to persist carpentry states:", error);
    }

    const timer = setTimeout(() => {
      setAutosaveStatus('saved');
    }, 600);

    return () => clearTimeout(timer);
  }, [parts, settings]);

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
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isReportPreviewOpen, setIsReportPreviewOpen] = useState<boolean>(false);
  const [isCalcOpen, setIsCalcOpen] = useState<boolean>(false);
  const [isSavedFilesOpen, setIsSavedFilesOpen] = useState<boolean>(false);
  const [savedJobs, setSavedJobs] = useLocalStorage<SavedJob[]>('carpentry_saved_jobs', []);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const isFirstMount = useRef(true);
  const skipAutosaveToast = useRef(false);

  // Lock body scroll when any modal is open to prevent touch scroll leakage to the background panel
  useEffect(() => {
    const isAnyModalOpen = 
      isExportOpen || 
      isReportPreviewOpen || 
      isCalcOpen || 
      isSavedFilesOpen || 
      isAboutOpen || 
      isAttendanceOpen || 
      isSettingsOpen || 
      isCabinetDesignerOpen;

    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [
    isExportOpen, 
    isReportPreviewOpen, 
    isCalcOpen, 
    isSavedFilesOpen, 
    isAboutOpen, 
    isAttendanceOpen, 
    isSettingsOpen, 
    isCabinetDesignerOpen
  ]);

  const t = TRANSLATIONS[language];
  const isHindi = language === 'Hindi';

  const addToast = useCallback((message: string, type: 'success' | 'info' = 'success') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

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

  // Trigger auto-save toast feedback when parts or settings change (debounced)
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }

    if (skipAutosaveToast.current) {
      skipAutosaveToast.current = false;
      return;
    }

    const timer = setTimeout(() => {
      // Auto-save is now silent as requested
    }, 1200);

    return () => clearTimeout(timer);
  }, [parts, settings, isHindi, addToast]);

  // Automatically recalculate cutting list on input changes
  useEffect(() => {
    const updatedResult = runPacking(parts, settings);
    setResult(updatedResult);

    // If algorithm comparisons exist, refresh them too
    if (compareResults) {
      const comp = compareAlgorithms(parts, settings);
      setCompareResults(comp);
    }
  }, [parts, settings]);

  const handleLanguageToggle = () => {
    setLanguage(prev => prev === 'English' ? 'Hindi' : 'English');
  };

  const handleCompareAlgos = () => {
    setIsComparing(true);
    setTimeout(() => {
      const comp = compareAlgorithms(parts, settings);
      setCompareResults(comp);
      setIsComparing(false);
    }, 400); // short delay to show loading state
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
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Part Name,Length,Width,Grain,Rotation,Quantity,Edges(TBLR)\n";

    const lines: string[] = ["Part Name,Length,Width,Grain,Rotation,Quantity,Edges(TBLR)"];

    parts.forEach(p => {
      if (p.quantity <= 0) return;
      const edgesStr = Object.entries(p.edges)
        .filter(([_, active]) => active)
        .map(([name, _]) => name)
        .join('');
      
      const line = `"${p.name || 'Unnamed'}",${p.length},${p.width},${p.grain},${p.allowRot ? 'Y' : 'N'},${p.quantity},"${edgesStr}"`;
      csvContent += line + "\n";
      lines.push(line);
    });

    try {
      navigator.clipboard.writeText(lines.join("\n"));
      addToast(
        isHindi 
          ? "सीएसवी डेटा आपके क्लिपबोर्ड पर कॉपी और डाउनलोड हो गया है!" 
          : "CSV Data copied to clipboard & downloaded successfully!", 
        "success"
      );
    } catch (e) {
      console.error(e);
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `cutting_list_${settings.algorithm}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    saveJobToStorageAndReset();
  };

  // JSON Export trigger
  const handleExportJson = () => {
    const configData = {
      settings,
      parts
    };
    const jsonStr = JSON.stringify(configData, null, 2);
    
    try {
      navigator.clipboard.writeText(jsonStr);
      addToast(
        isHindi 
          ? "कॉन्फ़िगरेशन JSON आपके क्लिपबोर्ड पर कॉपी और डाउनलोड हो गया है!" 
          : "Configuration JSON copied to clipboard & downloaded successfully!", 
        "success"
      );
    } catch (e) {
      console.error(e);
    }

    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(jsonStr);

    const link = document.createElement("a");
    link.setAttribute("href", dataUri);
    link.setAttribute("download", `carpentry_optimizer_config.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    saveJobToStorageAndReset();
  };

  const handleExportCNC = () => {
    if (!result) {
      addToast(
        isHindi ? "कोई लेआउट नहीं है। कृपया पहले पैक करें।" : "No layout to export. Please pack first.",
        "error"
      );
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "SheetIndex,PartId,PartName,PartX(mm),PartY(mm),PartW(mm),PartH(mm),Rotated,HoleLabel,HoleGlobalX(mm),HoleGlobalY(mm),HoleDia(mm)\n";

    const lines: string[] = ["SheetIndex,PartId,PartName,PartX(mm),PartY(mm),PartW(mm),PartH(mm),Rotated,HoleLabel,HoleGlobalX(mm),HoleGlobalY(mm),HoleDia(mm)"];

    result.layouts.forEach(layout => {
      layout.parts.forEach(p => {
        if (!p.drillHoles || p.drillHoles.length === 0) {
          // Export part without holes
          const line = `${layout.sheetIndex},"${p.id}","${p.name}",${p.x.toFixed(2)},${p.y.toFixed(2)},${p.w.toFixed(2)},${p.h.toFixed(2)},${p.isRotated ? 'Y' : 'N'},,,,`;
          csvContent += line + "\n";
          lines.push(line);
        } else {
          p.drillHoles.forEach(h => {
            const hGlobalX = p.x + h.x;
            const hGlobalY = p.y + h.y;
            const line = `${layout.sheetIndex},"${p.id}","${p.name}",${p.x.toFixed(2)},${p.y.toFixed(2)},${p.w.toFixed(2)},${p.h.toFixed(2)},${p.isRotated ? 'Y' : 'N'},"${h.label || 'Hole'}",${hGlobalX.toFixed(2)},${hGlobalY.toFixed(2)},${h.diameter.toFixed(2)}`;
            csvContent += line + "\n";
            lines.push(line);
          });
        }
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

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "cnc_coordinates.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // JSON Import trigger
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

  // Print report trigger
  const handlePrint = () => {
    if (result && parts && parts.length > 0) {
      try {
        generatePdfReport(parts, settings, result, language);
        saveJobToStorageAndReset();
      } catch (err) {
        console.error("PDF generation failed, falling back to window.print:", err);
        window.print();
        saveJobToStorageAndReset();
      }
    } else {
      window.print();
    }
  };

  // Find the winning algorithm (lowest sheet count, highest utilization)
  const getWinnerAlgo = () => {
    if (!compareResults) return null;
    return [...compareResults].sort((a, b) => {
      // First sort by unplaced count ascending
      if (a.unplacedCount !== b.unplacedCount) return a.unplacedCount - b.unplacedCount;
      // Then sort by sheets used ascending
      if (a.sheetsUsed !== b.sheetsUsed) return a.sheetsUsed - b.sheetsUsed;
      // Then sort by utilization descending
      return b.utilization - a.utilization;
    })[0];
  };

  const winner = getWinnerAlgo();

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
              {(settings.stockItems || []).map((item, idx) => (
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
                <RefreshCw size={14} className={isComparing ? 'animate-spin' : ''} />
                {isComparing ? (isHindi ? 'गणना हो रही है...' : 'Solving...') : t.compare_algos}
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
                        onClick={() => setSettings({ ...settings, algorithm: c.algoKey })}
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
          <section id="bento-visualizer" className="flex flex-col">
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
      />

      {/* About App Modal */}
      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
        isHindi={isHindi}
      />

      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
