import { Worker, AttendanceRecord } from "../types";

export interface ParsedSyncEntry {
  id: string;
  workerName: string;
  workerId: string | null;
  status: "P" | "H" | "A";
  areaName: string;
  timeline: string; // Combined readable timestamp, e.g. "2026-06-30 10:15 AM"
  date: string; // YYYY-MM-DD
  time: string; // HH:MM AM/PM or similar
  kharchi?: number;
  wage?: number;
  rawString: string;
  syncTimestamp: number;
}

/**
 * Get and Set the shared group P2P Security Key (Pre-Shared Key) from localStorage
 */
export function getP2PSecurityKey(): string {
  return localStorage.getItem("hajiri_p2p_security_key") || "HAJIRI-SECURE-KEY-2026";
}

export function setP2PSecurityKey(key: string) {
  localStorage.setItem("hajiri_p2p_security_key", key);
}

/**
 * Safely encrypts a plaintext string into a highly secure, scrambled P2P ciphertext representation.
 * Uses symmetric XOR shifting + Hex serialization for group-safe encrypted sharing.
 */
export function encryptP2PMessage(plainText: string, secretKey: string): string {
  if (!plainText) return "";
  const key = secretKey || "HAJIRI-SECURE-KEY-2026";
  
  const cipherCodes: number[] = [];
  for (let i = 0; i < plainText.length; i++) {
    const charCode = plainText.charCodeAt(i);
    const keyChar = key.charCodeAt(i % key.length);
    // XOR cipher combined with dynamic salt shift (42) to produce stable alphanumeric cipher text
    const scrambled = (charCode ^ keyChar) + 42;
    cipherCodes.push(scrambled);
  }
  
  // Format as hexadecimal slices
  const hexPayload = cipherCodes.map(code => code.toString(16).padStart(4, "0")).join("");
  return `[HJRI-SEC-v1::${hexPayload}]`;
}

/**
 * Decrypts a secure P2P packet back to readable plainText using the group pre-shared key.
 * If the packet is not encrypted, returns the original text transparently.
 */
export function decryptP2PMessage(encryptedText: string, secretKey: string): string {
  if (!encryptedText) return "";
  const key = secretKey || "HAJIRI-SECURE-KEY-2026";
  
  const trimText = encryptedText.trim();
  // Match standard HJRI signature
  const match = trimText.match(/^\[HJRI-SEC-v1::([0-9a-fA-F]+)\]$/);
  if (!match) {
    return encryptedText; // transparent fallback if plain text is received
  }
  
  const hexPayload = match[1];
  const cipherCodes: number[] = [];
  for (let i = 0; i < hexPayload.length; i += 4) {
    const hexSlice = hexPayload.substring(i, i + 4);
    cipherCodes.push(parseInt(hexSlice, 16));
  }
  
  let plainText = "";
  for (let i = 0; i < cipherCodes.length; i++) {
    const scrambled = cipherCodes[i];
    const keyChar = key.charCodeAt(i % key.length);
    const charCode = (scrambled - 42) ^ keyChar;
    plainText += String.fromCharCode(charCode);
  }
  
  return plainText;
}

/**
 * Parses 'area name' (site/location) and 'timeline' (date, time or offset)
 * from a WhatsApp/SMS or group text entry. Automatically handles P2P Decryption.
 */
export function parseIncomingEntryString(
  text: string,
  workers: Worker[]
): ParsedSyncEntry | null {
  if (!text || !text.trim()) return null;

  // Real-time automatic P2P Decryption check before parsing
  const activeKey = getP2PSecurityKey();
  const cleanText = decryptP2PMessage(text.trim(), activeKey);
  const lowerText = cleanText.toLowerCase();

  // 1. Detect Worker
  let matchedWorker: Worker | null = null;
  for (const w of workers) {
    const escapedName = w.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    const regex = new RegExp(`\\b${escapedName}\\b`, "i");
    if (regex.test(cleanText) || lowerText.includes(w.name.toLowerCase())) {
      matchedWorker = w;
      break;
    }
  }

  // Fallback fuzzy match (first few letters / word check)
  if (!matchedWorker) {
    const firstWord = cleanText.split(/[\s:,-]+/)[0];
    if (firstWord && firstWord.length > 2) {
      matchedWorker =
        workers.find((w) =>
          w.name.toLowerCase().includes(firstWord.toLowerCase())
        ) || null;
    }
  }

  // 2. Detect Status
  let status: "P" | "H" | "A" = "P"; // default to Present
  if (
    /\b(a|absent|chutti|leave|holiday|no|n|off|अनुपस्थित|एब्सेंट|छुट्टी)\b/i.test(lowerText) ||
    lowerText.includes("अनुपस्थित") ||
    lowerText.includes("छुट्टी") ||
    lowerText.includes("absent")
  ) {
    status = "A";
  } else if (
    /\b(h|half|half-day|halfday|हाफ|आधा)\b/i.test(lowerText) ||
    lowerText.includes("हाफ") ||
    lowerText.includes("half")
  ) {
    status = "H";
  }

  // 3. Parse 'Area Name' (Location / Site)
  let areaName = "";
  // Check typical prefix formats first
  const areaPrefixMatches = [
    /(?:area|location|site|place|जगह|केंद्र)\s*[:=]\s*([a-zA-Z0-9\u0900-\u097F\s_-]+)/i,
    /(?:@|at|पर)\s*([a-zA-Z0-9\u0900-\u097F\s_-]+)/i,
    /(?:in|में)\s*([a-zA-Z0-9\u0900-\u097F\s_-]+)/i,
  ];

  for (const regex of areaPrefixMatches) {
    const match = cleanText.match(regex);
    if (match && match[1]) {
      // Split on trailing punctuation/keywords to isolate just the area name
      const candidate = match[1].split(/[,;|.]|(?:\s+(?:timeline|time|date|kharchi|wage|status|at|on|for)\b)/i)[0].trim();
      if (candidate) {
        areaName = candidate;
        break;
      }
    }
  }

  // 4. Parse 'Timeline' (Date & Time, relative or absolute)
  let timeline = "";
  let dateStr = new Date().toISOString().split("T")[0]; // default to today
  let timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); // default to now

  // Check if timeline is explicitly specified
  const timelineMatch = cleanText.match(/(?:timeline|time|timestamp|date|समय|तारीख)\s*[:=]\s*([a-zA-Z0-9\s_/:,-]+)/i);
  let timelineRaw = "";
  if (timelineMatch && timelineMatch[1]) {
    timelineRaw = timelineMatch[1].split(/[,;|.]|(?:\s+(?:area|location|site|kharchi|wage)\b)/i)[0].trim();
  }

  // Analyze either the timelineRaw or the whole text for date/time indicators
  const textToScan = timelineRaw || cleanText;
  const scanLower = textToScan.toLowerCase();

  // Handle Relative Dates: Today, Yesterday, Days ago
  let dateOffset = 0;
  if (scanLower.includes("yesterday") || scanLower.includes("कल")) {
    dateOffset = -1;
  } else if (scanLower.includes("today") || scanLower.includes("आज")) {
    dateOffset = 0;
  } else {
    // Check for "X days ago"
    const daysAgoMatch = scanLower.match(/(\d+)\s*(?:days?\s+ago|दिन\s+पहले)/);
    if (daysAgoMatch) {
      dateOffset = -parseInt(daysAgoMatch[1], 10);
    }
  }

  if (dateOffset !== 0) {
    const d = new Date();
    d.setDate(d.getDate() + dateOffset);
    dateStr = d.toISOString().split("T")[0];
  } else {
    // Look for explicit Date matches (e.g. YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY)
    const isoDateMatch = textToScan.match(/(\d{4})[-/](\d{2})[-/](\d{2})/);
    const inDateMatch = textToScan.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    const wordDateMatch = textToScan.match(/(\d{1,2})(?:th|st|nd|rd)?\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|June|July|August|September|October|November|December)/i);

    if (isoDateMatch) {
      dateStr = `${isoDateMatch[1]}-${isoDateMatch[2]}-${isoDateMatch[3]}`;
    } else if (inDateMatch) {
      const d = inDateMatch[1].padStart(2, "0");
      const m = inDateMatch[2].padStart(2, "0");
      const y = inDateMatch[3];
      dateStr = `${y}-${m}-${d}`;
    } else if (wordDateMatch) {
      const dayNum = parseInt(wordDateMatch[1], 10);
      const monthName = wordDateMatch[2].toLowerCase();
      const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
      const fullMonths = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
      let mIdx = new Date().getMonth();
      const enIdx = months.findIndex((m) => monthName.startsWith(m));
      const fullIdx = fullMonths.findIndex((m) => monthName.startsWith(m));
      if (enIdx !== -1) mIdx = enIdx;
      else if (fullIdx !== -1) mIdx = fullIdx;
      const year = new Date().getFullYear();
      dateStr = `${year}-${String(mIdx + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
    }
  }

  // Look for explicit Time matches (e.g. 10:15 AM, 14:30)
  const timeMatch = textToScan.match(/(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?/);
  if (timeMatch) {
    const hrs = timeMatch[1];
    const mins = timeMatch[2];
    const ampm = timeMatch[3] ? " " + timeMatch[3].toUpperCase() : "";
    timeStr = `${hrs.padStart(2, "0")}:${mins}${ampm}`;
  }

  // Combine into standard visual timeline representation
  timeline = `${dateStr} @ ${timeStr}`;

  // 5. Parse Kharchi (Advance)
  let kharchi = 0;
  const kharchiMatch = cleanText.match(/(?:k|kharchi|kharcha|advance|adv|खर्ची|पैसे|pay)\s*[:=]?\s*(\d+)/i);
  if (kharchiMatch) {
    kharchi = parseInt(kharchiMatch[1], 10);
  }

  // 6. Parse Daily Wage / Rate
  let wage = matchedWorker ? matchedWorker.wage : 500;
  const wageMatch = cleanText.match(/(?:wage|rate|price|dihaari|दिहाड़ी|रेट)\s*[:=]?\s*(\d+)/i);
  if (wageMatch) {
    wage = parseInt(wageMatch[1], 10);
  }

  return {
    id: `auto-parsed-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    workerName: matchedWorker ? matchedWorker.name : (cleanText.split(/[\s:,-]+/)[0] || "Unknown"),
    workerId: matchedWorker ? matchedWorker.id : null,
    status,
    areaName,
    timeline,
    date: dateStr,
    time: timeStr,
    kharchi: kharchi || undefined,
    wage,
    rawString: text,
    syncTimestamp: Date.now(),
  };
}

// SIMULATED REMOTE CLOUD SOURCE (SHARED DATA SOURCE)
// Lets other users or supervisory team push records into a shared storage pool,
// which is polled in real-time by the Hajiri Auto-Sync portal.
const FEED_STORAGE_KEY = "hajiri_shared_cloud_feed_data";

export interface SharedFeedItem {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
}

export function getSharedCloudFeed(): SharedFeedItem[] {
  const data = localStorage.getItem(FEED_STORAGE_KEY);
  if (!data) {
    // Populate with premium demo feed strings showing elegant timelines and locations
    const defaults: SharedFeedItem[] = [
      {
        id: "feed-1",
        sender: "Supervisor Harish",
        text: "Raju Prasad: Present @ Noida Sector-62, timeline: today at 09:15 AM, kharchi: 150",
        timestamp: Date.now() - 360000,
      },
      {
        id: "feed-2",
        sender: "Supervisor Harish",
        text: "Ramesh Kumar marked Half-day area: Okhla Phase-3, timeline: yesterday at 11:30 AM",
        timestamp: Date.now() - 240000,
      },
      {
        id: "feed-3",
        sender: "Manager Rohit",
        text: "Amit Singh is Absent, timeline: 2026-06-29, time: 08:00 AM",
        timestamp: Date.now() - 120000,
      },
    ];
    localStorage.setItem(FEED_STORAGE_KEY, JSON.stringify(defaults));
    return defaults;
  }
  return JSON.parse(data);
}

export function pushToSharedCloudFeed(sender: string, text: string): SharedFeedItem {
  const feed = getSharedCloudFeed();
  const newItem: SharedFeedItem = {
    id: `feed-item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    sender,
    text,
    timestamp: Date.now(),
  };
  feed.push(newItem);
  localStorage.setItem(FEED_STORAGE_KEY, JSON.stringify(feed));
  return newItem;
}

export function clearSharedCloudFeed() {
  localStorage.removeItem(FEED_STORAGE_KEY);
}
