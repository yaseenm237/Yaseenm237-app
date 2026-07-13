/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Language = 'English' | 'Hindi';
export type Unit = 'Inch' | 'CM' | 'MM';
export type Grain = 'L' | 'W' | 'N'; // Lengthwise, Widthwise, None

export interface Edges {
  T: boolean; // Top
  B: boolean; // Bottom
  L: boolean; // Left
  R: boolean; // Right
}

export interface DrillHole {
  id: string;
  x: number; // X coordinate from part's top-left
  y: number; // Y coordinate from part's top-left
  diameter: number; // Hole diameter
  label?: string; // Optional label (e.g. 'Hinge', 'Pin')
}

export interface PartInput {
  id: string;
  name: string;
  length: number;
  width: number;
  grain: Grain;
  allowRot: boolean;
  quantity: number;
  edges: Edges;
  materialId?: string; // Links to a specific stock material ID
  edgeMaterialId?: string; // Links to a specific edge banding material
  frontLaminateId?: string; // Links to a specific Sunmica/Laminate material
  backLaminateId?: string;  // Links to a specific Sunmica/Laminate material
  drillHoles?: DrillHole[];
  partNumber?: number;
}

export interface StockItem {
  id: string;
  name: string; // e.g. "18mm Plywood"
  length: number;
  width: number;
  cost: number;
  quantity?: number; // Quantity available in stock
  thickness?: number; // Thickness of base board in mm (e.g. 16 or 18)
  category?: 'Plywood' | 'MDF' | 'WPC' | 'Melamine' | 'Multi-board' | 'Sunmica' | 'Other'; // Material Category
  isOffcut?: boolean; // Whether this is an offcut
}

export interface Worker {
  id: string;
  name: string;
  phone: string; // Worker's phone
  wage: number; // Daily wage
  createdAt: number;
}

export interface AttendanceRecord {
  id: string;
  workerId: string;
  date: string; // YYYY-MM-DD
  timestamp: number;
  status: 'P' | 'H' | 'A'; // Present, Half-day, Absent
  location?: string;
  coordinates?: { lat: number; lng: number };
  wage?: number; // Daily wage on this day
  kharchi?: number; // Advance / Kharchi given on this day
  time?: string; // Time recorded (e.g. 10:15 AM)
}

export interface AttendanceSettings {
  contractorName: string;
  contractorPhone: string;
  workers: Worker[];
  records: AttendanceRecord[];
  isEncrypted?: boolean;
  encryptedBlob?: string;
  passcodeHash?: string;
}

export interface EdgeBandItem {
  id: string;
  name: string;
  thickness?: number; // Thickness of the edge banding in mm
}

export interface SunmicaItem {
  id: string;
  name: string; // e.g. "Glossy White 1.0mm"
  thickness?: number; // Thickness in mm (e.g. 1.0, 0.8)
  cost?: number; // Cost of laminate sheet (legacy)
  code?: string; // Color name, color code, or barcode
}

export interface MaterialRecipe {
  id: string;
  name: string; // e.g. "MOD_KITCHEN_01"
  baseMaterialId: string; // Links to StockItem id
  sideAMicaId: string; // Links to SunmicaItem id or "" for None
  sideBMicaId: string; // Links to SunmicaItem id or "" for None
  calculatedThickness: number; // sum of plywood + laminates
}

export interface SheetSettings {
  unit: Unit;
  sheetL: number;
  sheetW: number;
  bladeTh: number; // Kerf in mm
  trimMargin: number; // Trim in mm
  trimEdges?: { top: boolean; bottom: boolean; left: boolean; right: boolean };
  edgeTh: number; // Edge banding thickness in mm
  stock: number; // Quantity of sheets in stock
  algorithm: string;
  sheetCost: number; // Cost per sheet
  stockItems?: StockItem[]; // List of available sheet materials in stock
  edgeBandItems?: EdgeBandItem[]; // List of available edge banding materials
  sunmicaItems?: SunmicaItem[]; // List of available Sunmica (laminate) materials
  recipes?: MaterialRecipe[]; // Custom Material Recipes (Pressed Panels)
  respectGrain?: boolean; // Whether to strictly respect grain rules
  lockedLayouts?: SheetLayout[]; // List of locked layouts for incremental optimization
}

export interface PackedPart {
  id: string;
  internalId?: string;
  name: string;
  x: number;
  y: number;
  w: number; // Width after packing (could be rotated)
  h: number; // Height after packing (could be rotated)
  origL: number; // Original input length (before subtraction)
  origW: number; // Original input width (before subtraction)
  cutL: number; // Actual cut length (after subtraction)
  cutW: number; // Actual cut width (after subtraction)
  isRotated: boolean;
  edges: Edges;
  grain: Grain;
  edgeMaterialId?: string;
  frontLaminateId?: string;
  backLaminateId?: string;
  drillHoles?: DrillHole[];
  partNumber?: number;

  isSuper?: boolean;
  colCount?: number;
  rowCount?: number;
  innerW?: number;
  innerH?: number;
}

export interface SheetLayout {
  sheetIndex: number;
  width: number; // Available width (after trim)
  height: number; // Available height (after trim)
  parts: PackedPart[];
  usedArea: number;
  totalArea: number;
  wastePercent: number;
  wasteRects?: { x: number; y: number; w: number; h: number }[];
  materialName?: string; // Optional name of the material for this sheet
  isLocked?: boolean; // If this layout is locked (incremental optimization)
}

export interface PackingResult {
  layouts: SheetLayout[];
  totalSheetsUsed: number;
  totalUtilization: number;
  overallWastePercent: number;
  totalPartsArea: number;
  totalBandingLength: number; // Total length of edge banding in mm
  unplacedParts: { name: string; qty: number }[];
}

export interface AlgoComparison {
  algoKey: string;
  algoName: string;
  sheetsUsed: number;
  utilization: number;
  wastePercent: number;
  unplacedCount: number;
}

export interface Material {
  id: string;
  name: string;
  sheetL: number;
  sheetW: number;
  unit: Unit;
  cost: number;
  isCustom?: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  createdAt: number;
  lastActive: number;
}

export interface AppConfig {
  users: UserProfile[];
  activeUserId: string | null;
}

export interface CuttingInstruction {
  stepId: number;
  type: 'TRIM_CUT' | 'RIP_CUT' | 'CROSS_CUT';
  direction: 'HORIZONTAL' | 'VERTICAL';
  position: number; // position in mm
  fenceSetting: number; // fence setting in mm
  advice: string; // advice string in hindi or english
  localName: string; // local vernacular carpentry name
  affectedPartIds: string[];
  triggerVoice: boolean;
}
