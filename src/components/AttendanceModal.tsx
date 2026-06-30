import React, { useState, useEffect, useRef } from "react";
import {
  Language,
  Worker,
  AttendanceRecord,
  AttendanceSettings,
} from "../types";
import {
  X,
  Users,
  Calendar,
  PlusCircle,
  CheckCircle,
  Smartphone,
  Info,
  Share2,
  QrCode,
  MapPin,
  DollarSign,
  Clock,
  Send,
  RefreshCw,
  FileText,
  Check,
  Trash2,
  HelpCircle,
  TrendingUp,
  MessageSquare,
  AlertTriangle,
  Play,
  ArrowRight,
  Clipboard,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  parseIncomingEntryString,
  getSharedCloudFeed,
  pushToSharedCloudFeed,
  clearSharedCloudFeed,
  SharedFeedItem,
  ParsedSyncEntry,
  getP2PSecurityKey,
  setP2PSecurityKey,
  encryptP2PMessage,
  decryptP2PMessage
} from "../utils/autoSyncService";

interface AttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  attendanceData: AttendanceSettings;
  onUpdateData: (data: AttendanceSettings) => void;
}

// Demo Locations for Simulation
const DEMO_LOCATIONS = [
  "Okhla Phase-3",
  "Noida Sector-62",
  "Badarpur Industrial Area",
  "Faridabad Sector-15",
  "Gurugram Phase-1",
  "Kirti Nagar Timber Market",
  "Mayapuri Industrial Area"
];

// Helper to parse a single WhatsApp/SMS string into a structured AttendanceRecord
export const formatWhatsAppStringToAttendanceRecord = (
  rawInput: string,
  workersList: Worker[]
): AttendanceRecord | null => {
  if (!rawInput || !rawInput.trim()) return null;

  // Real-time automatic P2P Decryption check
  const activeKey = getP2PSecurityKey();
  const text = decryptP2PMessage(rawInput.trim(), activeKey);
  const lowerText = text.toLowerCase();

  // 1. Detect Worker using Regex or Substring match
  let matchedWorker: Worker | null = null;
  for (const w of workersList) {
    const escapedName = w.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    const nameRegex = new RegExp(`\\b${escapedName}\\b`, "i");
    if (nameRegex.test(text) || lowerText.includes(w.name.toLowerCase())) {
      matchedWorker = w;
      break;
    }
  }

  // Fallback to first word regex matching
  if (!matchedWorker) {
    const firstWordMatch = text.match(/^([a-zA-Z\u0900-\u097F]+)/);
    if (firstWordMatch && firstWordMatch[1]) {
      const candidate = firstWordMatch[1].toLowerCase();
      matchedWorker = workersList.find((w) =>
        w.name.toLowerCase().includes(candidate)
      ) || null;
    }
  }

  if (!matchedWorker) return null;

  // 2. Extract Attendance Status
  let status: "P" | "H" | "A" = "P";
  if (
    /\b(a|absent|chutti|leave|holiday|no|n|off|अनुपस्थित|एब्सेंट|छुट्टी)\b/i.test(lowerText) ||
    lowerText.includes("अनुपस्थित") ||
    lowerText.includes("छुट्टी")
  ) {
    status = "A";
  } else if (
    /\b(h|half|half-day|halfday|हाफ|आधा)\b/i.test(lowerText) ||
    lowerText.includes("हाफ")
  ) {
    status = "H";
  }

  // 3. Extract Location using Regex
  let location = "";
  const locationRegex = /(?:@|at|location|site|जगह|place|पर|में)\s*([a-zA-Z0-9\u0900-\u097F\s_-]+)/i;
  const locMatch = text.match(locationRegex);
  if (locMatch && locMatch[1]) {
    location = locMatch[1].split(/[,;|.]|(?:\s+(?:time|date|kharchi|wage|status)\b)/i)[0].trim();
  }

  // 4. Extract Time using Regex
  let time = "";
  const timeRegex = /(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)/i;
  const timeMatch = text.match(timeRegex);
  if (timeMatch) {
    time = timeMatch[1];
  } else {
    time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  // 5. Extract Date using Regex (supporting relative today/yesterday or absolute DD/MM/YYYY)
  let dateStr = new Date().toISOString().split("T")[0];
  let dateOffset = 0;
  if (lowerText.includes("yesterday") || lowerText.includes("कल")) {
    dateOffset = -1;
  } else if (lowerText.includes("today") || lowerText.includes("आज")) {
    dateOffset = 0;
  } else {
    const daysAgoMatch = lowerText.match(/(\d+)\s*(?:days?\s+ago|दिन\s+पहले)/i);
    if (daysAgoMatch) {
      dateOffset = -parseInt(daysAgoMatch[1], 10);
    }
  }

  if (dateOffset !== 0) {
    const d = new Date();
    d.setDate(d.getDate() + dateOffset);
    dateStr = d.toISOString().split("T")[0];
  } else {
    const dateMatch = text.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (dateMatch) {
      const day = dateMatch[1].padStart(2, "0");
      const month = dateMatch[2].padStart(2, "0");
      const year = dateMatch[3];
      dateStr = `${year}-${month}-${day}`;
    }
  }

  // 6. Extract Kharchi using Regex
  let kharchi = 0;
  const kharchiRegex = /(?:k|kharchi|kharcha|advance|adv|खर्ची|पैसे|pay)\s*[:=]?\s*(\d+)/i;
  const kharchiMatch = text.match(kharchiRegex);
  if (kharchiMatch) {
    kharchi = parseInt(kharchiMatch[1], 10);
  }

  // 7. Extract Custom Wage using Regex
  let wage = matchedWorker.wage;
  const wageRegex = /(?:wage|rate|price|dihaari|दिहाड़ी|रेट)\s*[:=]?\s*(\d+)/i;
  const wageMatch = text.match(wageRegex);
  if (wageMatch) {
    wage = parseInt(wageMatch[1], 10);
  }

  const record: AttendanceRecord = {
    id: `r-utility-${matchedWorker.id}-${dateStr}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    workerId: matchedWorker.id,
    date: dateStr,
    timestamp: Date.now(),
    status,
    location: location || undefined,
    wage,
    kharchi: kharchi || undefined,
    time,
  };

  return record;
};

// Helper to parse WhatsApp text
const parseWhatsAppText = (text: string, workersList: Worker[]): any[] => {
  if (!text) return [];

  // Real-time automatic P2P Decryption check for the entire text block
  const activeKey = getP2PSecurityKey();
  const decryptedBlock = decryptP2PMessage(text.trim(), activeKey);

  const lines = decryptedBlock.split("\n");
  const results: any[] = [];

  lines.forEach((line) => {
    if (!line.trim()) return;

    // Clean timestamp and sender header if present (WhatsApp Group Export Formats)
    // E.g., "[10:15 AM] Raju:" or "Raju:"
    let cleanLine = line.replace(/^\[[^\]]+\]\s*[^:]+:/i, "");
    cleanLine = cleanLine.replace(/^[a-zA-Z0-9\s+_-]+:\s*/, "");

    // 1. Detect Worker Name (Case-insensitive matching)
    let matchedWorker: Worker | null = null;
    for (const w of workersList) {
      const escapedName = w.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
      const regex = new RegExp(`\\b${escapedName}\\b`, "i");
      if (regex.test(line) || line.toLowerCase().includes(w.name.toLowerCase())) {
        matchedWorker = w;
        break;
      }
    }

    if (!matchedWorker) {
      // Fuzzy match first word
      const words = cleanLine.trim().split(/\s+/);
      if (words.length > 0) {
        const potentialName = words[0].toLowerCase();
        matchedWorker = workersList.find((w) =>
          w.name.toLowerCase().includes(potentialName)
        ) || null;
      }
    }

    // 2. Detect Attendance Status
    let status: "P" | "H" | "A" | null = null;
    const lLower = line.toLowerCase();
    
    if (
      /\b(p|present|presnt|presnet|aaya|yes|y|presente|haazir|हाजिर|उपस्थित|प्रेजेंट)\b/i.test(lLower) ||
      lLower.includes("उपस्थित") ||
      lLower.includes("प्रेजेंट") ||
      lLower.includes("aaya")
    ) {
      status = "P";
    } else if (
      /\b(h|half|half-day|halfday|हाफ|आधा)\b/i.test(lLower) ||
      lLower.includes("हाफ") ||
      lLower.includes("half")
    ) {
      status = "H";
    } else if (
      /\b(a|absent|chutti|leave|holiday|no|n|off|अनुपस्थित|एब्सेंट|छुट्टी)\b/i.test(lLower) ||
      lLower.includes("अनुपस्थित") ||
      lLower.includes("छुट्टी") ||
      lLower.includes("absent")
    ) {
      status = "A";
    }

    // 3. Detect Location / Area Name
    let location = "";
    const locMatch = line.match(/(?:@|at|location|site|जगह|place)\s*([a-zA-Z0-9\u0900-\u097F\s_-]+)/i);
    if (locMatch) {
      location = locMatch[1].trim().split(/[,;|]/)[0].trim();
    }

    // 4. Detect Kharchi (Advance)
    let kharchi = 0;
    const kharchiMatch = line.match(/(?:k|kharchi|kharcha|advance|adv|खर्ची|पैसे|pay)\s*[:=]?\s*(\d+)/i);
    if (kharchiMatch) {
      kharchi = parseInt(kharchiMatch[1], 10);
    }

    // 5. Detect Daily Wage / Rate (If custom rate mentioned)
    let wage = matchedWorker ? matchedWorker.wage : 500;
    const wageMatch = line.match(/(?:wage|rate|price|dihaari|दिहाड़ी|रेट)\s*[:=]?\s*(\d+)/i);
    if (wageMatch) {
      wage = parseInt(wageMatch[1], 10);
    } else {
      // Find another isolated 3-digit number which is not the kharchi
      const numbers = [...line.matchAll(/\b\d{3,4}\b/g)].map((m) => parseInt(m[0], 10));
      const filtered = numbers.filter((n) => n !== kharchi);
      if (filtered.length > 0) {
        wage = filtered[0];
      }
    }

    // 6. Detect Time
    let time = "";
    const timeMatch = line.match(/(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)/);
    if (timeMatch) {
      time = timeMatch[1];
    } else {
      const now = new Date();
      time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }

    // 7. Detect Date (Defaults to today, otherwise extracts date phrase)
    let dateStr = new Date().toISOString().split("T")[0];
    const dateMatch = line.match(/(\d{1,2})(?:th|st|nd|rd)?\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|June|July|August|September|October|November|December|जनवरी|फ़रवरी|मार्च|अप्रैल|मई|जून|जुलाई|अगस्त|सितंबर|अक्टूबर|नवंबर|दिसंबर)/i);
    if (dateMatch) {
      const dayNum = parseInt(dateMatch[1], 10);
      const monthName = dateMatch[2].toLowerCase();
      
      const monthsEn = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
      const monthsFull = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
      const monthsHi = ["जनवरी", "फ़रवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"];
      let mIdx = new Date().getMonth(); 
      
      const enIdx = monthsEn.findIndex((m) => monthName.startsWith(m));
      const fullIdx = monthsFull.findIndex((m) => monthName.startsWith(m));
      const hiIdx = monthsHi.findIndex((m) => monthName.startsWith(m) || m.startsWith(monthName));
      
      if (enIdx !== -1) mIdx = enIdx;
      else if (fullIdx !== -1) mIdx = fullIdx;
      else if (hiIdx !== -1) mIdx = hiIdx;

      const year = new Date().getFullYear();
      dateStr = `${year}-${String(mIdx + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
    }

    results.push({
      id: `parsed-${Date.now()}-${Math.random()}`,
      worker: matchedWorker,
      workerId: matchedWorker ? matchedWorker.id : null,
      workerName: matchedWorker ? matchedWorker.name : (cleanLine.trim().split(/\s+/)[0] || "Unknown"),
      status,
      wage,
      kharchi,
      location,
      time,
      date: dateStr,
      raw: line,
    });
  });

  return results;
};

// Calendar Helpers for Monthly Grid
const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

const getDatesForMonth = (yearMonth: string) => {
  const [year, month] = yearMonth.split("-").map(Number);
  const daysCount = getDaysInMonth(year, month - 1);
  const dates: string[] = [];
  for (let d = 1; d <= daysCount; d++) {
    dates.push(`${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  return dates;
};

export default function AttendanceModal({
  isOpen,
  onClose,
  language,
  attendanceData,
  onUpdateData,
}: AttendanceModalProps) {
  const isHindi = language === "Hindi";
  const [activeTab, setActiveTab] = useState<"contractor" | "parser" | "worker">("contractor");

  // Date/Month navigation (defaults to current month)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  // Contractor Add/Edit worker states
  const [showAddWorker, setShowAddWorker] = useState(false);
  const [newWorkerName, setNewWorkerName] = useState("");
  const [newWorkerPhone, setNewWorkerPhone] = useState("");
  const [newWorkerWage, setNewWorkerWage] = useState("");
  const [selectedWorkerForQR, setSelectedWorkerForQR] = useState<Worker | null>(null);

  // Day manual edit popup states
  const [editingDay, setEditingDay] = useState<{ workerId: string; date: string } | null>(null);
  const [editingRecord, setEditingRecord] = useState({
    status: "" as "P" | "H" | "A" | "",
    wage: 500,
    kharchi: 0,
    location: "",
    time: "",
  });

  // Clipboard Paste Parser States
  const [pastedText, setPastedText] = useState("");
  const [parsedResults, setParsedResults] = useState<any[]>([]);

  // Simulation States
  const [simulatedMessages, setSimulatedMessages] = useState<any[]>([
    {
      id: "init-1",
      sender: "System",
      text: isHindi
        ? "व्हाट्सएप ग्रुप 'Carpentry Site Team' सिंक के लिए तैयार है।"
        : "WhatsApp group 'Carpentry Site Team' is ready to sync.",
      timestamp: Date.now() - 60000,
      isSystem: true,
    },
  ]);
  const [simulatorLog, setSimulatorLog] = useState<string[]>([
    "🟢 System initialized. Ready to parse incoming group chats.",
  ]);
  const [isAutoSimulating, setIsAutoSimulating] = useState(false);
  const simTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-Sync Service Module States
  const [isAutoSyncEnabled, setIsAutoSyncEnabled] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<string>("Never");
  const [sharedCloudFeed, setSharedCloudFeedState] = useState<SharedFeedItem[]>([]);
  const processedFeedIdsRef = useRef<Set<string>>(new Set());
  const [newFeedMessageSender, setNewFeedMessageSender] = useState("Supervisor Harish");
  const [newFeedMessageText, setNewFeedMessageText] = useState("");
  const [autoSyncLogs, setAutoSyncLogs] = useState<string[]>([
    "🔄 [Auto-Sync]: Service initialized. Standing by for shared data source streams...",
  ]);
  const syncTimerRef = useRef<NodeJS.Timeout | null>(null);

  // P2P End-to-End Cryptography States
  const [p2pKey, setP2PKeyState] = useState<string>(getP2PSecurityKey());
  const [isP2PEncryptEnabled, setIsP2PEncryptEnabled] = useState<boolean>(true);

  // Worker app self-view auth payload state
  const [workerAuthPayload, setWorkerAuthPayload] = useState<{
    w: string;
    n: string;
    cp: string;
    wage?: number;
  } | null>(null);

  // Worker inputs inside their self-view
  const [workerLocation, setWorkerLocation] = useState("");
  const [workerKharchi, setWorkerKharchi] = useState("");
  const [workerCustomWage, setWorkerCustomWage] = useState("");

  // Track notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const workerAuth = params.get("workerAuth");
    if (workerAuth) {
      try {
        const payload = JSON.parse(atob(workerAuth));
        setWorkerAuthPayload(payload);
        setActiveTab("worker");
      } catch (e) {
        console.error("Invalid worker auth link");
      }
    }
  }, [isOpen]);

  // Load initial feed and populate processedFeedIdsRef
  useEffect(() => {
    const initialFeed = getSharedCloudFeed();
    setSharedCloudFeedState(initialFeed);
    initialFeed.forEach(item => {
      processedFeedIdsRef.current.add(item.id);
    });
  }, []);

  // Background Auto-Sync Service polling
  useEffect(() => {
    if (!isAutoSyncEnabled) {
      if (syncTimerRef.current) {
        clearInterval(syncTimerRef.current);
        syncTimerRef.current = null;
      }
      return;
    }

    const performSyncCheck = () => {
      const currentFeed = getSharedCloudFeed();
      setSharedCloudFeedState(currentFeed);

      const unprocessedItems = currentFeed.filter(item => !processedFeedIdsRef.current.has(item.id));
      if (unprocessedItems.length === 0) {
        const now = new Date();
        setLastSyncTime(now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
        return;
      }

      let updatedRecords = [...(attendanceData.records || [])];
      let hasUpdates = false;
      const logs: string[] = [];

      unprocessedItems.forEach(item => {
        processedFeedIdsRef.current.add(item.id);
        const parsed = parseIncomingEntryString(item.text, attendanceData.workers || []);

        if (parsed) {
          logs.push(`📥 [Feed Received] from ${item.sender}: "${item.text}"`);
          if (parsed.workerId) {
            // Remove previous record on the same date for this worker to prevent duplicates
            updatedRecords = updatedRecords.filter(
              (r) => !(r.workerId === parsed.workerId && r.date === parsed.date)
            );

            const newRecord: AttendanceRecord = {
              id: `r-autosync-${parsed.workerId}-${parsed.date}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              workerId: parsed.workerId,
              date: parsed.date,
              timestamp: Date.now(),
              status: parsed.status,
              wage: parsed.wage,
              kharchi: parsed.kharchi,
              location: parsed.areaName || undefined,
              time: parsed.time || undefined,
            };
            updatedRecords.push(newRecord);
            hasUpdates = true;

            logs.push(
              `⚡ [Parsed Match] Worker: "${parsed.workerName}" | Status: ${parsed.status} | Area Name: "${parsed.areaName || "Not Specified"}" | Timeline: "${parsed.timeline}"`
            );
            logs.push(`✅ [Auto-Sync Success] Matched worker card successfully updated in local database!`);
          } else {
            logs.push(`⚠️ [Parsed Skip] No matching worker found for name: "${parsed.workerName}"`);
          }
        } else {
          logs.push(`❌ [Parsed Fail] Unable to decode incoming string: "${item.text}"`);
        }
      });

      if (hasUpdates) {
        onUpdateData({
          ...attendanceData,
          records: updatedRecords,
        });
        triggerToast(
          isHindi
            ? "नया डेटा क्लाउड फ़ीड से ऑटो-सिंक किया गया!"
            : "New records auto-synced from shared cloud feed!"
        );
      }

      setAutoSyncLogs(prev => [...prev, ...logs]);
      const now = new Date();
      setLastSyncTime(now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    };

    // Run immediately
    performSyncCheck();

    // Set polling interval (8 seconds)
    syncTimerRef.current = setInterval(performSyncCheck, 8000);

    return () => {
      if (syncTimerRef.current) {
        clearInterval(syncTimerRef.current);
        syncTimerRef.current = null;
      }
    };
  }, [isAutoSyncEnabled, attendanceData.workers, attendanceData.records, isHindi]);

  // Clean simulation and sync timers on unmount
  useEffect(() => {
    return () => {
      if (simTimerRef.current) clearInterval(simTimerRef.current);
      if (syncTimerRef.current) clearInterval(syncTimerRef.current);
    };
  }, []);

  if (!isOpen) return null;

  // Handle worker registration
  const handleAddWorker = () => {
    if (!newWorkerName || !newWorkerPhone) return;
    const newWorker: Worker = {
      id: `w-${Date.now()}`,
      name: newWorkerName,
      phone: newWorkerPhone,
      wage: parseFloat(newWorkerWage) || 500,
      createdAt: Date.now(),
    };
    onUpdateData({
      ...attendanceData,
      workers: [...(attendanceData.workers || []), newWorker],
    });
    setNewWorkerName("");
    setNewWorkerPhone("");
    setNewWorkerWage("");
    setShowAddWorker(false);
    triggerToast(isHindi ? "नया मजदूर सफलतापूर्वक जोड़ा गया!" : "Worker added successfully!");
  };

  // Generate QR/Worker link
  const getWorkerLink = (worker: Worker) => {
    const baseUrl = window.location.origin + window.location.pathname;
    const payload = btoa(
      JSON.stringify({
        w: worker.id,
        n: worker.name,
        cp: attendanceData.contractorPhone || "",
        wage: worker.wage,
      })
    );
    return `${baseUrl}?workerAuth=${payload}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    triggerToast(isHindi ? "लिंक कॉपी हो गया!" : "Link copied!");
  };

  const handleDeleteWorker = (workerId: string) => {
    if (confirm(isHindi ? "क्या आप इस मजदूर को हटाना चाहते हैं?" : "Are you sure you want to delete this worker?")) {
      onUpdateData({
        ...attendanceData,
        workers: (attendanceData.workers || []).filter((w) => w.id !== workerId),
        records: (attendanceData.records || []).filter((r) => r.workerId !== workerId),
      });
      triggerToast(isHindi ? "मजदूर हटाया गया!" : "Worker deleted!");
    }
  };

  // Calendar Helpers for Monthly Grid
  const datesForMonth = getDatesForMonth(selectedMonth);

  // Manual save for single-day attendance record
  const handleOpenEditDay = (workerId: string, date: string) => {
    const existing = (attendanceData.records || []).find(
      (r) => r.workerId === workerId && r.date === date
    );
    const worker = (attendanceData.workers || []).find((w) => w.id === workerId);
    
    setEditingDay({ workerId, date });
    setEditingRecord({
      status: existing ? existing.status : "",
      wage: existing && existing.wage !== undefined ? existing.wage : (worker ? worker.wage : 500),
      kharchi: existing && existing.kharchi !== undefined ? existing.kharchi : 0,
      location: existing && existing.location ? existing.location : "",
      time: existing && existing.time ? existing.time : "09:30 AM",
    });
  };

  const handleSaveDayRecord = () => {
    if (!editingDay) return;
    const { workerId, date } = editingDay;
    
    // Filter out any existing record for this worker & date
    let updatedRecords = (attendanceData.records || []).filter(
      (r) => !(r.workerId === workerId && r.date === date)
    );

    if (editingRecord.status !== "") {
      const newRecord: AttendanceRecord = {
        id: `r-${workerId}-${date}-${Date.now()}`,
        workerId,
        date,
        timestamp: Date.now(),
        status: editingRecord.status,
        wage: editingRecord.wage,
        kharchi: editingRecord.kharchi,
        location: editingRecord.location || undefined,
        time: editingRecord.time || undefined,
      };
      updatedRecords.push(newRecord);
    }

    onUpdateData({
      ...attendanceData,
      records: updatedRecords,
    });

    setEditingDay(null);
    triggerToast(isHindi ? "हाजिरी अपडेट हो गई!" : "Attendance updated!");
  };

  // Parsing clipboard pasted WhatsApp text
  const handlePasteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setPastedText(val);
    const parsed = parseWhatsAppText(val, attendanceData.workers || []);
    setParsedResults(parsed);
  };

  const handleSyncParsedResults = () => {
    if (parsedResults.length === 0) return;

    let updatedRecords = [...(attendanceData.records || [])];

    parsedResults.forEach((res) => {
      if (!res.workerId || !res.status) return;

      // Filter out existing record on that day for that worker to prevent duplicate
      updatedRecords = updatedRecords.filter(
        (r) => !(r.workerId === res.workerId && r.date === res.date)
      );

      const record: AttendanceRecord = {
        id: `r-parsed-${res.workerId}-${res.date}-${Date.now()}-${Math.random()}`,
        workerId: res.workerId,
        date: res.date,
        timestamp: Date.now(),
        status: res.status,
        wage: res.wage,
        kharchi: res.kharchi,
        location: res.location || undefined,
        time: res.time || undefined,
      };
      updatedRecords.push(record);
    });

    onUpdateData({
      ...attendanceData,
      records: updatedRecords,
    });

    setPastedText("");
    setParsedResults([]);
    triggerToast(
      isHindi
        ? "व्हाट्सएप हाजिरी सफलतापूर्वक सिंक की गई!"
        : "WhatsApp attendance successfully synced!"
    );
  };

  // Receive a simulated live message & run algorithm
  const handleSimulateMessage = () => {
    const workers = attendanceData.workers || [];
    if (workers.length === 0) {
      triggerToast(
        isHindi
          ? "कृपया पहले ठेकेदार डैशबोर्ड में मजदूर जोड़ें!"
          : "Please add workers in Contractor Dashboard first!"
      );
      return;
    }

    // Pick a random worker
    const worker = workers[Math.floor(Math.random() * workers.length)];
    const statuses: ("P" | "H" | "A")[] = ["P", "P", "H", "A"];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const location = DEMO_LOCATIONS[Math.floor(Math.random() * DEMO_LOCATIONS.length)];
    const kharchi = Math.random() > 0.4 ? [50, 100, 150, 200][Math.floor(Math.random() * 4)] : 0;
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const dateStr = new Date().toISOString().split("T")[0];

    // Generate formatted message string
    let msgText = `${worker.name} `;
    if (status === "P") {
      msgText += `Present @ ${location}`;
    } else if (status === "H") {
      msgText += `Half-day @ ${location}`;
    } else {
      msgText += `Absent (Chutti)`;
    }

    if (kharchi > 0 && status !== "A") {
      msgText += ` kharchi ${kharchi}`;
    }

    // Add random daily wage occasionally
    if (Math.random() > 0.7 && status !== "A") {
      const customRate = worker.wage + (Math.random() > 0.5 ? 50 : -50);
      msgText += ` wage ${customRate}`;
    }

    const fullMessageLine = `[${time}] ${worker.name}: ${msgText}`;

    // Append to live feed
    const newMsgObj = {
      id: `sim-${Date.now()}`,
      sender: worker.name,
      text: msgText,
      timestamp: Date.now(),
      isSystem: false,
    };
    setSimulatedMessages((prev) => [...prev, newMsgObj]);

    // Algorithmic parser log
    const logLines = [
      `🔍 [PARSER ENGINE]: New incoming WhatsApp message detected!`,
      `💬 Raw Text: "${fullMessageLine}"`,
      `🧠 Step 1: Matching Name... -> Found "${worker.name}" (ID: ${worker.id})`,
      `🧠 Step 2: Extracting Status... -> Detected status: ${status === "P" ? "P (Present)" : status === "H" ? "H (Half-day)" : "A (Absent)"}`,
    ];

    if (status !== "A") {
      logLines.push(`🧠 Step 3: Extracting Location... -> Detected site: "${location}"`);
      if (kharchi > 0) {
        logLines.push(`🧠 Step 4: Extracting Kharchi... -> Detected advance: ₹${kharchi}`);
      }
    }

    logLines.push(`💾 Step 5: Updating Local Database state in real-time...`);
    logLines.push(`✅ Saved: ${worker.name} marked ${status} at ${location} (Kharchi: ₹${kharchi})`);

    setSimulatorLog((prev) => [...prev, ...logLines]);

    // Automatically sync directly to local records
    let updatedRecords = (attendanceData.records || []).filter(
      (r) => !(r.workerId === worker.id && r.date === dateStr)
    );

    // Parse values from message text to match the simulated values
    const parsedResultsArray = parseWhatsAppText(fullMessageLine, workers);
    if (parsedResultsArray.length > 0) {
      const pRes = parsedResultsArray[0];
      const record: AttendanceRecord = {
        id: `r-sim-sync-${worker.id}-${dateStr}-${Date.now()}`,
        workerId: worker.id,
        date: dateStr,
        timestamp: Date.now(),
        status: pRes.status || "P",
        wage: pRes.wage,
        kharchi: pRes.kharchi,
        location: pRes.location || undefined,
        time: pRes.time || undefined,
      };
      updatedRecords.push(record);
    }

    onUpdateData({
      ...attendanceData,
      records: updatedRecords,
    });

    triggerToast(
      isHindi
        ? `सिम्युलेटर: ${worker.name} की हाजिरी दर्ज हुई!`
        : `Simulator: ${worker.name} attendance recorded!`
    );
  };

  // Auto Simulator Interval
  const toggleAutoSimulation = () => {
    if (isAutoSimulating) {
      if (simTimerRef.current) {
        clearInterval(simTimerRef.current);
        simTimerRef.current = null;
      }
      setIsAutoSimulating(false);
      setSimulatorLog((prev) => [...prev, "🛑 Auto Simulation stopped by contractor."]);
    } else {
      setIsAutoSimulating(true);
      setSimulatorLog((prev) => [...prev, "⚡ Auto-Sync Simulation Mode Enabled. Messages will auto-stream!"]);
      // Run once immediately
      handleSimulateMessage();
      // Set interval
      simTimerRef.current = setInterval(() => {
        handleSimulateMessage();
      }, 5000); // Receive simulated message every 5 seconds
    }
  };

  // Individual Worker Calculations
  const calculateWorkerMonthStats = (worker: Worker) => {
    const workerRecords = (attendanceData.records || []).filter(
      (r) => r.workerId === worker.id && r.date.startsWith(selectedMonth)
    );

    let totalEarned = 0;
    let totalPaid = 0;
    let presentCount = 0;
    let halfCount = 0;
    let absentCount = 0;

    workerRecords.forEach((r) => {
      const dayWage = r.wage !== undefined ? r.wage : worker.wage;
      const dayKharchi = r.kharchi !== undefined ? r.kharchi : 0;

      if (r.status === "P") {
        totalEarned += dayWage;
        presentCount++;
      } else if (r.status === "H") {
        totalEarned += dayWage * 0.5;
        halfCount++;
      } else if (r.status === "A") {
        absentCount++;
      }
      totalPaid += dayKharchi;
    });

    const netPayable = totalEarned - totalPaid;

    return {
      totalEarned,
      totalPaid,
      netPayable,
      presentCount,
      halfCount,
      absentCount,
    };
  };

  // General Month calculation
  const getSelectedMonthDisplay = () => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const date = new Date(y, m - 1);
    return date.toLocaleDateString(isHindi ? "hi-IN" : "en-US", {
      month: "long",
      year: "numeric",
    });
  };

  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const d = new Date(y, m - 2, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const d = new Date(y, m, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  // Status colors helper
  const getStatusBadgeStyles = (status: string) => {
    switch (status) {
      case "P":
        return "bg-emerald-500 text-white font-black hover:bg-emerald-600 border-2 border-red-400 ring-2 ring-emerald-500/20 shadow-md";
      case "H":
        return "bg-amber-500 text-white font-black hover:bg-amber-600 border-2 border-red-500 ring-2 ring-amber-500/20 shadow-md";
      case "A":
        return "bg-rose-500 text-white font-black hover:bg-rose-600 border-2 border-red-700 ring-2 ring-rose-500/20 shadow-md";
      default:
        return "bg-slate-200 text-slate-600 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300";
    }
  };

  // Worker view self-attendance submit
  const handleWorkerSendSelf = (status: "P" | "H" | "A") => {
    if (!workerAuthPayload) return;
    const today = new Date().toISOString().split("T")[0];
    
    // Build clean whatsapp attendance format
    let text = `${workerAuthPayload.n} ${status === "P" ? "Present" : status === "H" ? "Half-day" : "Absent"}`;
    if (workerLocation && status !== "A") {
      text += ` @ ${workerLocation}`;
    }
    if (workerKharchi && parseFloat(workerKharchi) > 0 && status !== "A") {
      text += ` kharchi ${workerKharchi}`;
    }
    if (workerCustomWage && parseFloat(workerCustomWage) > 0 && status !== "A") {
      text += ` wage ${workerCustomWage}`;
    }

    text += ` | Date: ${today}`;

    // Apply P2P Encryption if enabled
    let finalPayload = text;
    if (isP2PEncryptEnabled) {
      finalPayload = encryptP2PMessage(text, p2pKey);
    }

    // Open WhatsApp
    window.open(
      `https://wa.me/${workerAuthPayload.cp}?text=${encodeURIComponent(finalPayload)}`,
      "_blank"
    );
    triggerToast(
      isP2PEncryptEnabled
        ? (isHindi ? "गोपनीय मेसेज व्हाट्सएप पर खुल रहा है..." : "Opening Secure Encrypted Message on WhatsApp...")
        : (isHindi ? "व्हाट्सएप मेसेज खुल रहा है..." : "Opening WhatsApp...")
    );
  };

  const handlePushToSharedFeed = () => {
    if (!newFeedMessageText.trim()) return;
    
    // Encrypt simulated message if P2P encryption is toggled
    let finalText = newFeedMessageText;
    if (isP2PEncryptEnabled) {
      finalText = encryptP2PMessage(newFeedMessageText, p2pKey);
    }

    const newItem = pushToSharedCloudFeed(newFeedMessageSender, finalText);
    setSharedCloudFeedState(getSharedCloudFeed());
    setNewFeedMessageText("");
    triggerToast(isHindi ? "नया संदेश साझा डेटा स्रोत में भेजा गया!" : "New string pushed to shared data source!");
    
    if (isP2PEncryptEnabled) {
      setAutoSyncLogs(prev => [
        ...prev,
        `📥 [P2P Encrypted] Secure ciphertext generated with key "${p2pKey}": "${finalText}"`
      ]);
    } else {
      setAutoSyncLogs(prev => [...prev, `📤 [Client Sent] New shared message pushed by ${newFeedMessageSender}: "${newItem.text}"`]);
    }
  };

  const handleClearSharedFeed = () => {
    clearSharedCloudFeed();
    setSharedCloudFeedState([]);
    setAutoSyncLogs(prev => [...prev, "🧹 [Auto-Sync]: Shared Cloud Database cleared by administrator."]);
    triggerToast(isHindi ? "साझा डेटा साफ़ किया गया!" : "Shared data source cleared!");
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-slate-900 text-white font-bold py-3 px-6 rounded-xl shadow-2xl z-[100] border border-slate-700 flex items-center gap-2 animate-in slide-in-from-top-5">
          <CheckCircle2 size={18} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="bg-slate-50 dark:bg-slate-900 w-full max-w-6xl h-[95vh] md:h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-2xl">
              <Calendar size={26} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                {isHindi ? "हाजिरी पोर्टल (Hajiri Portal)" : "Hajiri Portal (Attendance)"}
                <span className="text-xs bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-black px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-800 uppercase tracking-wider">
                  {isHindi ? "ऑटो-सिंक" : "Auto-Sync Engine"}
                </span>
              </h2>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {isHindi
                  ? "मजदूरों की 30-दिन की हाजिरी और व्हाट्सएप ऑटो-सिंक प्रणाली (ऑफ़लाइन काम करने वाला)"
                  : "30-Day Worker Cards & WhatsApp Group Sync Algorithm (Offline Ready)"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-slate-100 hover:bg-rose-500 hover:text-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 border-b-4 border-b-slate-300 dark:border-b-slate-950 shadow-sm active:translate-y-[2px] active:border-b transition-all duration-75 text-slate-600 dark:text-slate-300 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-slate-100 dark:bg-slate-950 px-6 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-2.5 bg-slate-200 dark:bg-slate-900/60 p-1.5 rounded-2xl border border-slate-300 dark:border-slate-850">
            <button
              onClick={() => setActiveTab("contractor")}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "contractor"
                  ? "bg-indigo-600 text-white shadow-md border-b-4 border-indigo-800 -translate-y-0.5 active:translate-y-0 active:border-b-2"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Users size={16} />
              {isHindi ? "ठेकेदार डैशबोर्ड (Cards)" : "Contractor Dashboard"}
            </button>
            <button
              onClick={() => setActiveTab("parser")}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "parser"
                  ? "bg-indigo-600 text-white shadow-md border-b-4 border-indigo-800 -translate-y-0.5 active:translate-y-0 active:border-b-2"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <MessageSquare size={16} />
              {isHindi ? "व्हाट्सएप ऑटो-सिंक (Sync)" : "WhatsApp Sync Engine"}
            </button>
          </div>

          {/* Month Navigator (Only shown in Contractor Tab) */}
          {activeTab === "contractor" && (
            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 shadow-sm">
              <button
                onClick={handlePrevMonth}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-800 border-b-4 border-b-slate-300 dark:border-b-slate-950 active:translate-y-[2px] active:border-b transition-all duration-75 cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs sm:text-sm font-black text-indigo-600 dark:text-indigo-400 min-w-[130px] text-center font-mono bg-indigo-50/50 dark:bg-indigo-950/20 px-3 py-1 rounded-lg">
                {getSelectedMonthDisplay()}
              </span>
              <button
                onClick={handleNextMonth}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-800 border-b-4 border-b-slate-300 dark:border-b-slate-950 active:translate-y-[2px] active:border-b transition-all duration-75 cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50 dark:bg-slate-900">
          
          {/* TAB 1: CONTRACTOR DASHBOARD */}
          {activeTab === "contractor" && (
            <div className="space-y-6">
              
              {/* Overall Monthly stats metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-850 shadow-sm flex flex-col justify-between">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    {isHindi ? "कुल मजदूर" : "Active Workers"}
                  </span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                      {attendanceData.workers?.length || 0}
                    </span>
                    <span className="text-xs text-slate-400">Active</span>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-850 shadow-sm flex flex-col justify-between">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 text-emerald-600">
                    {isHindi ? "कुल कमाया हुआ" : "Total Wages Earned"}
                  </span>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-2xl font-black text-emerald-600">
                      ₹
                      {(attendanceData.workers || [])
                        .reduce((acc, w) => acc + calculateWorkerMonthStats(w).totalEarned, 0)
                        .toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-850 shadow-sm flex flex-col justify-between">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 text-amber-600">
                    {isHindi ? "कुल खर्ची / एडवांस" : "Total Advances Paid"}
                  </span>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-2xl font-black text-amber-600 animate-pulse">
                      ₹
                      {(attendanceData.workers || [])
                        .reduce((acc, w) => acc + calculateWorkerMonthStats(w).totalPaid, 0)
                        .toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-850 shadow-sm flex flex-col justify-between">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 text-rose-600">
                    {isHindi ? "कुल लंबित भुगतान" : "Pending Net Balance"}
                  </span>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-2xl font-black text-rose-600">
                      ₹
                      {(attendanceData.workers || [])
                        .reduce((acc, w) => acc + calculateWorkerMonthStats(w).netPayable, 0)
                        .toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Add New Worker Form Trigger */}
              <div className="flex justify-between items-center bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Users size={18} className="text-slate-500" />
                  <span className="font-black text-slate-700 dark:text-slate-300">
                    {isHindi ? "मजदूर प्रबन्धन (Workers Setup)" : "Worker Setup & Monthly Cards"}
                  </span>
                </div>
                <button
                  onClick={() => setShowAddWorker(!showAddWorker)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 transition-all border-b-4 border-indigo-800 active:translate-y-[2px] active:border-b-2 shadow-[0_3px_0_0_rgba(79,70,229,0.2)] cursor-pointer"
                >
                  <PlusCircle size={14} />
                  {isHindi ? "नया मजदूर जोड़ें" : "Add Worker"}
                </button>
              </div>

              {showAddWorker && (
                <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-indigo-200 dark:border-indigo-900/50 shadow-md animate-in slide-in-from-top-4 duration-200">
                  <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-1">
                    <Users size={16} className="text-indigo-600" />
                    {isHindi ? "नया मजदूर की जानकारी भरें" : "Enter New Worker Info"}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-black text-slate-600 dark:text-slate-400 mb-1">
                        {isHindi ? "मजदूर का नाम" : "Worker Name"} *
                      </label>
                      <input
                        type="text"
                        value={newWorkerName}
                        onChange={(e) => setNewWorkerName(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-bold"
                        placeholder="e.g. Raju Prasad"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-600 dark:text-slate-400 mb-1">
                        {isHindi ? "व्हाट्सएप नंबर (कंट्री कोड के बिना)" : "WhatsApp Phone"} *
                      </label>
                      <input
                        type="tel"
                        value={newWorkerPhone}
                        onChange={(e) => setNewWorkerPhone(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-bold"
                        placeholder="e.g. 9876543210"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-600 dark:text-slate-400 mb-1">
                        {isHindi ? "डिफ़ॉल्ट दैनिक दिहाड़ी (₹)" : "Default Daily Wage (₹)"}
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={newWorkerWage}
                          onChange={(e) => setNewWorkerWage(e.target.value)}
                          className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-bold"
                          placeholder="e.g. 500"
                        />
                        <button
                          onClick={handleAddWorker}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold px-5 rounded-xl text-sm transition-all border-b-4 border-indigo-800 active:translate-y-[2px] active:border-b-2 shadow-[0_3px_0_0_rgba(79,70,229,0.2)] cursor-pointer"
                        >
                          {isHindi ? "सुरक्षित" : "Save"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* WORKERS MONTHLY CARDS GRID */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {attendanceData.workers?.length > 0 ? (
                  attendanceData.workers.map((worker) => {
                    const stats = calculateWorkerMonthStats(worker);
                    return (
                      <div
                        key={worker.id}
                        className="bg-white dark:bg-slate-950 rounded-3xl p-5 border border-slate-200 dark:border-slate-800/80 shadow-md hover:shadow-lg transition-all flex flex-col justify-between"
                      >
                        {/* Card Header */}
                        <div>
                          <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-850 pb-3">
                            <div>
                              <h3 className="text-lg font-black text-slate-850 dark:text-slate-100 flex items-center gap-1.5">
                                {worker.name}
                                <span className="text-xs bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold px-2 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-900">
                                  ₹{worker.wage}/{isHindi ? "दिन" : "day"}
                                </span>
                              </h3>
                              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                {worker.phone}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() => setSelectedWorkerForQR(worker)}
                                className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded-lg transition-colors border border-indigo-100 dark:border-indigo-900 flex items-center gap-1 text-[10px] font-black"
                                title="Worker setup link"
                              >
                                <QrCode size={12} />
                                {isHindi ? "सेटअप" : "Setup Link"}
                              </button>
                              <button
                                onClick={() => handleDeleteWorker(worker.id)}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors border border-rose-100 dark:border-rose-950 flex items-center justify-center"
                                title="Delete worker"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>

                          {/* Quick Worker stats inside card */}
                          <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-850 my-3 text-center">
                            <div>
                              <span className="block text-[10px] font-bold text-slate-500">
                                {isHindi ? "कमाया" : "Earned"}
                              </span>
                              <span className="text-xs font-black text-slate-800 dark:text-slate-100">
                                ₹{stats.totalEarned}
                              </span>
                              <span className="block text-[8px] font-semibold text-emerald-600">
                                ({stats.presentCount}P • {stats.halfCount}H)
                              </span>
                            </div>
                            <div>
                              <span className="block text-[10px] font-bold text-slate-500">
                                {isHindi ? "खर्ची" : "Advance"}
                              </span>
                              <span className="text-xs font-black text-rose-500">
                                ₹{stats.totalPaid}
                              </span>
                            </div>
                            <div className="border-l border-slate-200 dark:border-slate-800">
                              <span className="block text-[10px] font-bold text-slate-500">
                                {isHindi ? "कुल देय" : "Net Bal"}
                              </span>
                              <span className={`text-xs font-black ${stats.netPayable >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                ₹{stats.netPayable}
                              </span>
                            </div>
                          </div>

                          {/* 30-Day Grid Layout */}
                          <div>
                            <span className="block text-[10px] font-black text-slate-400 mb-2 tracking-wider uppercase">
                              {isHindi ? "30-दिन की हाजिरी कार्ड (कैलेंडर)" : "30-Day Attendance Card (Grid)"}
                            </span>
                            <div className="grid grid-cols-7 sm:grid-cols-10 gap-1.5">
                              {datesForMonth.map((dateStr) => {
                                const dayNum = parseInt(dateStr.split("-")[2], 10);
                                const record = (attendanceData.records || []).find(
                                  (r) => r.workerId === worker.id && r.date === dateStr
                                );
                                
                                const hasKharchi = record && record.kharchi && record.kharchi > 0;
                                const hasLocation = record && record.location;

                                return (
                                  <button
                                    key={dateStr}
                                    onClick={() => handleOpenEditDay(worker.id, dateStr)}
                                    className={`relative h-10 rounded-lg flex flex-col items-center justify-center text-xs font-bold border transition-all hover:scale-105 active:scale-95 ${
                                      record
                                        ? getStatusBadgeStyles(record.status)
                                        : "bg-slate-50 hover:bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800"
                                    }`}
                                    title={`${dateStr}: ${record ? `Status ${record.status}` : "No entry"}`}
                                  >
                                    <span className={`text-[10px] ${record?.status === "A" ? "text-red-600 dark:text-red-400 font-extrabold scale-110 drop-shadow-sm" : ""}`}>
                                      {dayNum}
                                    </span>
                                    {record && (
                                      <span className={`text-[8px] leading-none absolute top-0.5 right-1 ${record.status === "A" ? "text-red-100 dark:text-red-200 font-black" : ""}`}>
                                        {record.status}
                                      </span>
                                    )}

                                    {/* Indicators */}
                                    <div className="absolute bottom-0.5 flex gap-0.5 justify-center">
                                      {hasKharchi && (
                                        <span className="w-1.5 h-1.5 bg-rose-500 rounded-full" title={`Kharchi ₹${record.kharchi}`} />
                                      )}
                                      {hasLocation && (
                                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" title={`Site: ${record.location}`} />
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Helper tip in cards */}
                        <p className="text-[9px] text-slate-400 mt-3 italic">
                          * {isHindi ? "तारीख दबाकर हाजिरी, दिहाड़ी, खर्ची और लोकेशन बदलें" : "Click any day square to update daily attendance, custom rate, location or kharchi."}
                        </p>
                      </div>
                    );
                  })
                ) : (
                  <div className="xl:col-span-2 text-center p-12 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400">
                    <Users size={48} className="mx-auto mb-2 text-slate-300" />
                    <p className="text-sm font-bold">
                      {isHindi ? "कोई मजदूर नहीं मिला" : "No workers added to Hajiri Pilot yet."}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {isHindi ? "नया मजदूर जोड़ें बटन दबाकर शुरुआत करें।" : "Click 'Add Worker' to start tracking daily attendance."}
                    </p>
                  </div>
                )}
              </div>

              {/* INDIVIDUAL DAY EDIT MODAL / POPUP OVERLAY */}
              {editingDay && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
                  <div className="bg-white dark:bg-slate-950 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-sm w-full space-y-4 shadow-2xl animate-in zoom-in-95">
                    <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-850 pb-2">
                      <h3 className="font-black text-slate-850 dark:text-slate-100 text-sm">
                        {isHindi ? "हाजिरी विवरण संपादित करें" : "Edit Day Attendance Details"}
                      </h3>
                      <button
                        onClick={() => setEditingDay(null)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <div className="text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900/60 flex justify-between">
                      <span>Worker ID: {editingDay.workerId}</span>
                      <span>Date: {editingDay.date}</span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-black text-slate-600 dark:text-slate-400 mb-1">
                          {isHindi ? "हाजिरी स्थिति (Status)" : "Attendance Status"}
                        </label>
                        <div className="grid grid-cols-4 gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
                          {(["P", "H", "A", ""] as const).map((st) => (
                            <button
                              key={st}
                              type="button"
                              onClick={() => setEditingRecord({ ...editingRecord, status: st })}
                              className={`py-1.5 text-xs font-black rounded-lg transition-all ${
                                editingRecord.status === st
                                  ? st === "P"
                                    ? "bg-emerald-600 text-white"
                                    : st === "H"
                                    ? "bg-amber-500 text-white"
                                    : st === "A"
                                    ? "bg-rose-500 text-white"
                                    : "bg-slate-700 text-white"
                                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                              }`}
                            >
                              {st === "P"
                                ? isHindi
                                  ? "P (उपस्थित)"
                                  : "P"
                                : st === "H"
                                ? isHindi
                                  ? "H (हाफ)"
                                  : "H"
                                : st === "A"
                                ? isHindi
                                  ? "A (छुट्टी)"
                                  : "A"
                                : isHindi
                                ? "हटाएं"
                                : "Clear"}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-black text-slate-600 dark:text-slate-400 mb-1">
                            {isHindi ? "दैनिक दिहाड़ी (Wage)" : "Wage for Day (₹)"}
                          </label>
                          <input
                            type="number"
                            value={editingRecord.wage}
                            onChange={(e) =>
                              setEditingRecord({
                                ...editingRecord,
                                wage: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-full p-2 border rounded-xl text-xs font-bold dark:bg-slate-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-black text-slate-600 dark:text-slate-400 mb-1">
                            {isHindi ? "आज की खर्ची (Advance)" : "Kharchi / Advance (₹)"}
                          </label>
                          <input
                            type="number"
                            value={editingRecord.kharchi}
                            onChange={(e) =>
                              setEditingRecord({
                                ...editingRecord,
                                kharchi: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-full p-2 border rounded-xl text-xs font-bold dark:bg-slate-900 dark:text-white text-rose-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-black text-slate-600 dark:text-slate-400 mb-1">
                          {isHindi ? "लोकेशन / साइट नाम" : "Location / Site Name"}
                        </label>
                        <div className="relative">
                          <MapPin size={14} className="absolute left-2.5 top-3 text-slate-400" />
                          <input
                            type="text"
                            value={editingRecord.location}
                            onChange={(e) =>
                              setEditingRecord({ ...editingRecord, location: e.target.value })
                            }
                            className="w-full pl-8 pr-2 py-2 border rounded-xl text-xs font-bold dark:bg-slate-900 dark:text-white"
                            placeholder="e.g. Okhla Phase-3"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-black text-slate-600 dark:text-slate-400 mb-1">
                          {isHindi ? "समय (Time)" : "Time recorded"}
                        </label>
                        <div className="relative">
                          <Clock size={14} className="absolute left-2.5 top-3 text-slate-400" />
                          <input
                            type="text"
                            value={editingRecord.time}
                            onChange={(e) =>
                              setEditingRecord({ ...editingRecord, time: e.target.value })
                            }
                            className="w-full pl-8 pr-2 py-2 border rounded-xl text-xs font-bold dark:bg-slate-900 dark:text-white"
                            placeholder="e.g. 09:30 AM"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => setEditingDay(null)}
                        className="flex-1 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-black border-b-4 border-slate-300 dark:border-b-slate-950 active:translate-y-[2px] active:border-b-2 shadow-sm cursor-pointer transition-all duration-75"
                      >
                        {isHindi ? "रद्द करें" : "Cancel"}
                      </button>
                      <button
                        onClick={handleSaveDayRecord}
                        className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black border-b-4 border-indigo-800 active:translate-y-[2px] active:border-b-2 shadow-[0_3px_0_0_rgba(79,70,229,0.2)] flex items-center justify-center gap-1.5 cursor-pointer transition-all duration-75"
                      >
                        <Check size={14} />
                        {isHindi ? "सुरक्षित करें" : "Save Record"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: WHATSAPP AUTO SYNC ENGINE & ALGORITHM */}
          {activeTab === "parser" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Auto-Sync Background Service Control Center */}
              <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-5 rounded-3xl border border-indigo-500/20 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl relative">
                    <RefreshCw className={`text-indigo-400 ${isAutoSyncEnabled ? "animate-spin" : ""}`} size={24} />
                    {isAutoSyncEnabled && (
                      <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-black text-slate-100 text-base flex items-center gap-2">
                      {isHindi ? "पृष्ठभूमि ऑटो-सिंक सेवा" : "Background Auto-Sync Service"}
                      <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full border ${
                        isAutoSyncEnabled 
                          ? "bg-emerald-950 text-emerald-400 border-emerald-800" 
                          : "bg-slate-800 text-slate-400 border-slate-700"
                      }`}>
                        {isAutoSyncEnabled ? (isHindi ? "सक्रिय" : "Active") : (isHindi ? "बंद" : "Disabled")}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {isHindi
                        ? "स्वचालिक रूप से साझा डेटा स्रोत की जाँच करता है और मजदूर कार्ड को तुरंत अपडेट करता है।"
                        : "Periodically checks shared data source and instantly synchronizes matched worker cards."}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-start md:self-auto">
                  <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-2 px-4 text-xs font-mono text-slate-300">
                    <span className="text-slate-500">Last Checked: </span>
                    <span className="text-indigo-300 font-bold">{lastSyncTime}</span>
                  </div>
                  <button
                    onClick={() => setIsAutoSyncEnabled(!isAutoSyncEnabled)}
                    className={`font-black text-xs px-5 py-3 rounded-xl transition-all border-b-4 active:translate-y-[2px] active:border-b-2 shadow-md cursor-pointer duration-75 ${
                      isAutoSyncEnabled
                        ? "bg-amber-500 hover:bg-amber-400 border-amber-700 text-white shadow-[0_3px_0_0_rgba(245,158,11,0.2)]"
                        : "bg-indigo-600 hover:bg-indigo-500 border-indigo-800 text-white shadow-[0_3px_0_0_rgba(79,70,229,0.2)]"
                    }`}
                  >
                    {isAutoSyncEnabled ? (isHindi ? "सिंक रोकें" : "Pause Auto-Sync") : (isHindi ? "सिंक चालू करें" : "Resume Auto-Sync")}
                  </button>
                </div>
              </div>

              {/* P2P Group Cryptography Key Configurator */}
              <div className="bg-gradient-to-r from-slate-900 to-slate-950 p-5 rounded-3xl border border-slate-800/80 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 -mt-3">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
                    <span className="text-xl">🔒</span>
                  </div>
                  <div>
                    <h3 className="font-black text-slate-100 text-sm flex items-center gap-2">
                      {isHindi ? "P2P एंड-टू-एंड ग्रुप डिक्रिप्शन" : "P2P Group Cryptography (End-to-End)"}
                      <span className="bg-indigo-950 text-indigo-400 border border-indigo-800 text-[9px] uppercase font-bold px-2 py-0.5 rounded-full">
                        {isHindi ? "सुरक्षित एक्टिव" : "SECURE ACTIVE"}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {isHindi
                        ? "व्हाट्सएप ग्रुप से प्राप्त ताला बंद (encrypted) मेसेज को असली डेटा में बदलने की चाबी।"
                        : "Symmetric key used to transparently decode scrambled WhatsApp messages from group feeds."}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="flex flex-col gap-1 w-full md:w-64">
                    <label className="text-[10px] text-slate-400 font-bold">
                      {isHindi ? "ग्रुप साझा गुप्त कुंजी (Pre-Shared Key)" : "Group Pre-Shared Key"}
                    </label>
                    <input
                      type="text"
                      value={p2pKey}
                      onChange={(e) => {
                        const val = e.target.value;
                        setP2PKeyState(val);
                        setP2PSecurityKey(val);
                        setAutoSyncLogs(prev => [...prev, `🔑 [P2P Cryptography] Decryption key updated to: "${val}"`]);
                      }}
                      className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-indigo-400 font-bold focus:ring-1 focus:ring-indigo-500 outline-none"
                      placeholder="HAJIRI-SECURE-KEY-2026"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left Column: Clipboard paste block & Parser results */}
                <div className="lg:col-span-7 bg-white dark:bg-slate-950 p-5 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-850 pb-3">
                    <Clipboard className="text-indigo-600" size={20} />
                    <div>
                      <h3 className="font-black text-slate-850 dark:text-slate-100">
                        {isHindi ? "व्हाट्सएप चैट पेस्ट करें" : "Clipboard Group Import"}
                      </h3>
                      <p className="text-[11px] font-medium text-slate-500">
                        {isHindi ? "व्हाट्सएप ग्रुप से मेसेज कॉपी करके यहाँ डालें" : "Paste text copied from your WhatsApp worker group chat."}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400">
                      {isHindi ? "व्हाट्सएप संदेश बॉक्स (Paste WhatsApp Messages Here)" : "WhatsApp Messages Area"}
                    </label>
                    <textarea
                      value={pastedText}
                      onChange={handlePasteChange}
                      rows={6}
                      className="w-full p-4 border border-slate-300 dark:border-slate-700 rounded-2xl text-xs font-mono bg-slate-50 dark:bg-slate-900 text-slate-850 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder={
                        isHindi
                          ? `राजू: राजू Present @ ओखला kharchi 100\nरमेश: Ramesh Half-day @ नोएडा wage 600\nअमित: Amit Present @ बदरपुर\n\n(यहाँ व्हाट्सएप चैट का कोई भी फॉर्मेट कॉपी-पेस्ट करें)`
                          : `Raju: Raju Present @ Okhla kharchi 100\nRamesh: Ramesh Half-day @ Noida wage 600\nAmit: Amit Present @ Badarpur\n\n(Paste any copied WhatsApp format here to trigger the smart parser)`
                      }
                    />
                  </div>

                  {/* Examples for the user */}
                  <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-3.5 rounded-2xl border border-indigo-100/60 dark:border-indigo-900/60 space-y-1.5">
                    <span className="block text-[11px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
                      💡 {isHindi ? "सपोर्टेड फ़ॉर्मेट (Supported Detection Patterns)" : "Supported Detection Patterns"}
                    </span>
                    <ul className="text-[10px] text-slate-600 dark:text-slate-400 list-disc list-inside space-y-1 font-bold">
                      <li><code className="text-indigo-600 dark:text-indigo-400 bg-indigo-50 px-1 rounded font-mono">WorkerName Present @ SiteName</code> (Status + Location)</li>
                      <li><code className="text-indigo-600 dark:text-indigo-400 bg-indigo-50 px-1 rounded font-mono">WorkerName P kharchi 150 @ SiteName</code> (Kharchi + Location)</li>
                      <li><code className="text-indigo-600 dark:text-indigo-400 bg-indigo-50 px-1 rounded font-mono">WorkerName Half wage 600 @ Noida</code> (Status + Custom wage + Site)</li>
                    </ul>
                  </div>

                  {/* Parse results list preview */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase">
                        {isHindi ? "एल्गोरिथम डिटेक्शन प्रीव्यू" : "Algorithmic Detection Preview"}
                      </span>
                      <span className="text-xs bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-md">
                        {parsedResults.length} {isHindi ? "डिटेक्टेड" : "Detected"}
                      </span>
                    </div>

                    {parsedResults.length > 0 ? (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-2xl p-2 bg-slate-50 dark:bg-slate-900/40">
                        {parsedResults.map((res, idx) => (
                          <div
                            key={res.id || idx}
                            className={`p-3 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs font-bold transition-all ${
                              res.workerId
                                ? "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                                : "bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/60"
                            }`}
                          >
                            <div>
                              <div className="flex items-center gap-1.5">
                                {res.workerId ? (
                                  <span className="text-slate-850 dark:text-slate-100 font-black text-sm">
                                    {res.workerName}
                                  </span>
                                ) : (
                                  <span className="text-rose-600 dark:text-rose-400 font-black flex items-center gap-1">
                                    <AlertTriangle size={12} />
                                    {res.workerName} ({isHindi ? "नाम नहीं मिला" : "Worker Missing"})
                                  </span>
                                )}
                                <span className="text-[10px] text-slate-400">Date: {res.date}</span>
                              </div>
                              <p className="text-[10px] text-slate-500 font-medium italic mt-0.5">
                                "{res.raw}"
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-1.5 items-center">
                              {res.status && (
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-black border ${
                                    res.status === "P"
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : res.status === "H"
                                      ? "bg-amber-50 text-amber-700 border-amber-200"
                                      : "bg-rose-50 text-rose-700 border-rose-200"
                                  }`}
                                >
                                  {res.status === "P" ? "P" : res.status === "H" ? "H" : "A"}
                                </span>
                              )}

                              {res.wage > 0 && (
                                <span className="bg-slate-100 dark:bg-slate-850 px-1.5 py-0.5 rounded text-[10px] text-slate-600 dark:text-slate-300">
                                  ₹{res.wage}/day
                                </span>
                              )}

                              {res.kharchi > 0 && (
                                <span className="bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded text-[10px] border border-rose-100">
                                  Kharchi: ₹{res.kharchi}
                                </span>
                              )}

                              {res.location && (
                                <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded text-[10px] border border-indigo-100 flex items-center gap-0.5">
                                  <MapPin size={10} />
                                  {res.location}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}

                        <button
                          onClick={handleSyncParsedResults}
                          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold py-3.5 rounded-2xl flex items-center justify-center gap-2 mt-4 border-b-4 border-indigo-800 active:translate-y-[2px] active:border-b-2 shadow-[0_4px_0_0_rgba(79,70,229,0.3)] cursor-pointer transition-all duration-75"
                        >
                          <CheckCircle size={18} />
                          {isHindi ? "सभी हाजिरी सेव करें (Sync To Cards)" : "Sync All Checked to Cards"}
                        </button>
                      </div>
                    ) : (
                      <div className="p-8 text-center text-slate-400 text-xs border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                        {isHindi
                          ? "यहाँ कोई मैसेज डिटेक्शन नहीं हुआ है। बॉक्स में टेक्स्ट पेस्ट करें।"
                          : "No parsed items yet. Paste group text above to auto-detect names and statuses."}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Shared Cloud Feed & Diagnostic logs */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                  
                  {/* Shared Remote Cloud Feed (Shared Data Source) */}
                  <div className="bg-slate-900 rounded-3xl p-4 border border-slate-850 shadow-xl flex flex-col h-[350px]">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-2.5 mb-2.5 shrink-0">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-black text-xs shadow-md">
                          ☁️
                        </div>
                        <div>
                          <span className="block text-xs font-black text-slate-100">
                            {isHindi ? "साझा क्लाउड डेटा स्रोत" : "Shared Cloud Data Source"}
                          </span>
                          <span className="block text-[9px] text-indigo-400 font-bold">
                            {isHindi ? "सिमुलेटेड टीम डेटाबेस" : "Simulated Team Feed"}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={handleClearSharedFeed}
                        className="bg-slate-850 hover:bg-rose-900 text-slate-300 hover:text-white font-black text-[10px] px-3 py-2 rounded-xl border border-slate-700 border-b-4 border-b-slate-950 active:translate-y-[2px] active:border-b-2 shadow-sm cursor-pointer transition-all duration-75"
                      >
                        {isHindi ? "मैसेज साफ़ करें" : "Clear Feed"}
                      </button>
                    </div>

                    {/* Shared source entries stream */}
                    <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                      {sharedCloudFeed.length > 0 ? (
                        sharedCloudFeed.map((item) => {
                          const isEncrypted = item.text.trim().startsWith("[HJRI-SEC-v1::");
                          const decodedText = isEncrypted 
                            ? decryptP2PMessage(item.text, p2pKey) 
                            : item.text;
                          const parsed = parseIncomingEntryString(item.text, attendanceData.workers || []);
                          return (
                            <div key={item.id} className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800 text-xs text-slate-300 space-y-2 animate-in fade-in duration-150">
                              <div className="flex justify-between items-center text-[10px]">
                                <span className="font-black text-indigo-400 flex items-center gap-1">
                                  {item.sender}
                                  {isEncrypted && (
                                    <span className="bg-indigo-950/80 text-indigo-400 text-[8px] font-black px-1.5 py-0.2 rounded border border-indigo-800">
                                      🔒 SECURE
                                    </span>
                                  )}
                                </span>
                                <span className="text-[9px] text-slate-500 font-mono">
                                  {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </span>
                              </div>
                              
                              <div className="space-y-1 bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                                {isEncrypted && (
                                  <div className="flex items-center gap-1 text-[9px] text-indigo-400 font-black uppercase mb-1">
                                    <span>🛡️ Public Group View (Scrambled):</span>
                                  </div>
                                )}
                                <p className="font-mono text-[10px] text-slate-400 break-all select-all">
                                  "{item.text}"
                                </p>
                                {isEncrypted && (
                                  <div className="pt-1.5 mt-1.5 border-t border-slate-800/80">
                                    <span className="text-[9px] text-emerald-400 font-black uppercase block mb-1">
                                      🔓 Decrypted (Inside App View):
                                    </span>
                                    <p className="font-bold text-slate-100 text-[11px]">
                                      "{decodedText}"
                                    </p>
                                  </div>
                                )}
                              </div>

                              {/* Algorithmic breakdown */}
                              <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-900/30 p-2 rounded-xl border border-slate-800/60 font-semibold font-sans">
                                <div className="space-y-1">
                                  <span className="text-slate-500 block uppercase text-[8px] tracking-wider font-bold">📍 Parsed Area:</span>
                                  {parsed?.areaName ? (
                                    <span className="text-emerald-400 font-bold truncate block">
                                      {parsed.areaName}
                                    </span>
                                  ) : (
                                    <span className="text-slate-500 italic block">None</span>
                                  )}
                                </div>
                                <div className="space-y-1">
                                  <span className="text-slate-500 block uppercase text-[8px] tracking-wider font-bold">📅 Parsed Timeline:</span>
                                  {parsed?.timeline ? (
                                    <span className="text-amber-400 font-bold block truncate font-mono">
                                      {parsed.timeline}
                                    </span>
                                  ) : (
                                    <span className="text-slate-500 italic block">None</span>
                                  )}
                                </div>
                                <div className="space-y-1 col-span-2 pt-1 border-t border-slate-800/50 flex justify-between items-center text-[9px]">
                                  <span className="text-slate-500 font-bold">Match: {parsed?.workerId ? `✅ ${parsed.workerName}` : "❌ Unrecognized"}</span>
                                  <span className={`px-1 py-0.2 rounded font-black ${
                                    parsed?.status === 'P' ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-900' :
                                    parsed?.status === 'H' ? 'text-amber-400 bg-amber-950/40 border border-amber-900' :
                                    'text-rose-400 bg-rose-950/40 border border-rose-900'
                                  }`}>
                                    {parsed?.status || 'P'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center p-8 text-slate-500 text-xs italic">
                          No messages in shared cloud feed. Push a test entry below!
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Simulator tool: Push Custom Message to Shared Feed */}
                  <div className="bg-white dark:bg-slate-950 rounded-3xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                    <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1">
                      <span>🚀</span>
                      {isHindi ? "नया संदेश भेजें (Simulate Device)" : "Push Simulated Entry"}
                    </h4>
                    
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newFeedMessageSender}
                        onChange={(e) => setNewFeedMessageSender(e.target.value)}
                        placeholder="Sender"
                        className="w-[35%] p-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-bold focus:ring-1 focus:ring-indigo-500 outline-none"
                      />
                      <input
                        type="text"
                        value={newFeedMessageText}
                        onChange={(e) => setNewFeedMessageText(e.target.value)}
                        placeholder={
                          attendanceData.workers && attendanceData.workers.length > 0 
                            ? `${attendanceData.workers[0].name} marked Present @ Noida Sector-62 timeline: yesterday`
                            : "Enter freeform message text..."
                        }
                        className="flex-1 p-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-bold focus:ring-1 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-[9px] text-slate-400 font-bold italic">
                        * Supports freeform texts with dates/times & location markers.
                      </span>
                      <button
                        onClick={handlePushToSharedFeed}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs py-2 px-4 rounded-xl border-b-4 border-indigo-800 active:translate-y-[2px] active:border-b-2 shadow-[0_3px_0_0_rgba(79,70,229,0.2)] cursor-pointer transition-all duration-75"
                      >
                        {isHindi ? "क्लाउड में भेजें" : "Push to Cloud Source"}
                      </button>
                    </div>
                  </div>

                  {/* Auto-Sync Console Logs / Terminal */}
                  <div className="bg-slate-950 rounded-3xl p-4 border border-slate-850 shadow-md flex-1 flex flex-col min-h-[220px]">
                    <div className="flex items-center justify-between border-b border-slate-900 pb-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <span className="text-[10px] font-bold font-mono text-slate-500 ml-2">
                          hajiri_autosync_service_core.sh
                        </span>
                      </div>
                      <button 
                        onClick={() => setAutoSyncLogs(["🔄 [Auto-Sync]: Logs cleared."])}
                        className="text-[9px] text-slate-500 hover:text-slate-300 font-mono underline"
                      >
                        Clear logs
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto font-mono text-[10px] text-slate-400 space-y-1 bg-black/40 p-2 rounded-xl border border-slate-900 max-h-[160px] select-all">
                      {autoSyncLogs.map((line, idx) => (
                        <p key={idx} className={
                          line.startsWith("❌") ? "text-rose-500" : 
                          line.startsWith("✅") ? "text-emerald-400 font-bold" : 
                          line.startsWith("⚡") ? "text-amber-400" :
                          line.startsWith("📥") ? "text-indigo-400" :
                          "text-slate-400 font-medium"
                        }>
                          {line}
                        </p>
                      ))}
                    </div>
                  </div>

                </div>

              </div>

            </div>
          )}

          {/* TAB 3: INDIVIDUAL WORKER SELF ATTENDANCE PANEL */}
          {activeTab === "worker" && (
            <div className="max-w-md mx-auto space-y-6">
              {workerAuthPayload ? (
                <div className="bg-white dark:bg-slate-950 p-6 rounded-3xl shadow-lg border border-slate-200 dark:border-slate-850 text-center space-y-5">
                  <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <Users size={32} />
                  </div>
                  <div>
                    <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                      {isHindi ? "मजदूर पैनल (Hajiri Portal)" : "Worker Direct Access Portal"}
                    </span>
                    <h3 className="text-2xl font-black text-slate-850 dark:text-slate-100 mt-1">
                      {workerAuthPayload.n}
                    </h3>
                    {workerAuthPayload.wage && (
                      <p className="text-xs text-slate-500 font-bold mt-0.5">
                        Daily Wage Rate: ₹{workerAuthPayload.wage} / day
                      </p>
                    )}
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-850 pt-4 space-y-4 text-left">
                    
                    {/* Location Field */}
                    <div>
                      <label className="block text-xs font-black text-slate-600 dark:text-slate-400 mb-1">
                        📍 {isHindi ? "अपनी जगह का नाम भरें (Site Location)" : "Enter Current Site / Location"}
                      </label>
                      <input
                        type="text"
                        value={workerLocation}
                        onChange={(e) => setWorkerLocation(e.target.value)}
                        placeholder="e.g. Noida Sector-62"
                        className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Kharchi input */}
                      <div>
                        <label className="block text-xs font-black text-slate-600 dark:text-slate-400 mb-1">
                          💵 {isHindi ? "एडवांस / खर्ची" : "Advance / Kharchi"}
                        </label>
                        <input
                          type="number"
                          value={workerKharchi}
                          onChange={(e) => setWorkerKharchi(e.target.value)}
                          placeholder="e.g. 100"
                          className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-900 dark:text-white text-rose-500"
                        />
                      </div>
                      {/* Daily wage change */}
                      <div>
                        <label className="block text-xs font-black text-slate-600 dark:text-slate-400 mb-1">
                          ⚙️ {isHindi ? "दैनिक रेट बदलें" : "Custom Rate"}
                        </label>
                        <input
                          type="number"
                          value={workerCustomWage}
                          onChange={(e) => setWorkerCustomWage(e.target.value)}
                          placeholder={`Default: ₹${workerAuthPayload.wage || 500}`}
                          className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* P2P Encryption Toggle for Workers */}
                  <div className="bg-gradient-to-br from-indigo-50 to-slate-100 dark:from-slate-950 dark:to-indigo-950/20 p-4 rounded-3xl border border-indigo-200/50 dark:border-indigo-500/10 space-y-3 shadow-sm">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-base p-1.5 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-xl">🔒</span>
                        <div>
                          <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">
                            {isHindi ? "P2P एंड-टू-एंड एन्क्रिप्शन" : "P2P End-to-End Encryption"}
                          </h4>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">
                            {isHindi ? "व्हाट्सएप ग्रुप के लिए मेसेज को गुप्त बनाएं।" : "Scramble messages for public WhatsApp groups."}
                          </p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={isP2PEncryptEnabled}
                        onChange={(e) => setIsP2PEncryptEnabled(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 dark:bg-slate-900"
                      />
                    </div>

                    {isP2PEncryptEnabled && (
                      <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800/80">
                        <label className="text-[10px] text-slate-500 dark:text-slate-400 block font-bold">
                          🔑 {isHindi ? "समूह गुप्त सुरक्षा कुंजी (Pre-Shared Key)" : "Group Pre-Shared Key"}
                        </label>
                        <input
                          type="text"
                          value={p2pKey}
                          onChange={(e) => {
                            const val = e.target.value;
                            setP2PKeyState(val);
                            setP2PSecurityKey(val);
                          }}
                          className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 font-mono focus:ring-1 focus:ring-indigo-500 outline-none font-bold"
                          placeholder="Default: HAJIRI-SECURE-KEY-2026"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-3.5 pt-2">
                    <button
                      onClick={() => handleWorkerSendSelf("P")}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-2xl font-black text-base border-b-4 border-emerald-800 active:translate-y-[2px] active:border-b-2 shadow-[0_4px_0_0_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 cursor-pointer transition-all duration-75"
                    >
                      <CheckCircle size={20} />
                      {isHindi ? "पूरी हाजिरी भेजें (Present)" : "Send Full Attendance"}
                    </button>
                    <button
                      onClick={() => handleWorkerSendSelf("H")}
                      className="w-full bg-amber-500 hover:bg-amber-400 text-white py-4 rounded-2xl font-black text-base border-b-4 border-amber-700 active:translate-y-[2px] active:border-b-2 shadow-[0_4px_0_0_rgba(245,158,11,0.3)] flex items-center justify-center gap-2 cursor-pointer transition-all duration-75"
                    >
                      {isHindi ? "आधा दिन भेजें (Half Day)" : "Send Half Day"}
                    </button>
                    <button
                      onClick={() => handleWorkerSendSelf("A")}
                      className="w-full bg-rose-500 hover:bg-rose-400 text-white py-4 rounded-2xl font-black text-base border-b-4 border-rose-700 active:translate-y-[2px] active:border-b-2 shadow-[0_4px_0_0_rgba(244,63,94,0.3)] flex items-center justify-center gap-2 cursor-pointer transition-all duration-75"
                    >
                      {isHindi ? "छुट्टी दर्ज करें (Absent)" : "Send Leave/Absent"}
                    </button>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500 text-center">
                    <Info size={14} className="inline mr-1 text-indigo-500" />
                    {isHindi
                      ? "यह ठेकेदार के व्हाट्सएप ग्रुप पर ऑटो-सिंक होने वाला मैसेज भेजेगा।"
                      : "This opens WhatsApp to send a pre-formatted message to the Contractor."}
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 text-center max-w-sm mx-auto space-y-4">
                  <Smartphone size={40} className="mx-auto text-indigo-500" />
                  <h3 className="font-black text-slate-800 dark:text-slate-100">
                    {isHindi ? "मजदूर लिंक अनुपलब्ध" : "Direct Access Offline"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isHindi
                      ? "ठेकेदार डैशबोर्ड में ' सेटअप' बटन दबाकर क्यूआर कोड स्कैन करें या लिंक शेयर करें।"
                      : "Scan QR code or click 'Setup Link' in Contractor Dashboard to access worker self-entry portal."}
                  </p>
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
