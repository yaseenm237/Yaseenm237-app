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
  drillHoles?: DrillHole[];
}

export interface StockItem {
  id: string;
  name: string; // e.g. "18mm Plywood"
  length: number;
  width: number;
  cost: number;
  quantity?: number; // Quantity available in stock
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
}

export interface AttendanceSettings {
  contractorName: string;
  contractorPhone: string;
  workers: Worker[];
  records: AttendanceRecord[];
}

export interface EdgeBandItem {
  id: string;
  name: string;
  thickness?: number; // Thickness of the edge banding in mm
}

export interface SheetSettings {
  unit: Unit;
  sheetL: number;
  sheetW: number;
  bladeTh: number; // Kerf in mm
  trimMargin: number; // Trim in mm
  edgeTh: number; // Edge banding thickness in mm
  stock: number; // Quantity of sheets in stock
  algorithm: string;
  sheetCost: number; // Cost per sheet
  stockItems?: StockItem[]; // List of available sheet materials in stock
  edgeBandItems?: EdgeBandItem[]; // List of available edge banding materials
}

export interface PackedPart {
  id: string;
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
  drillHoles?: DrillHole[];
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
