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

export interface PartInput {
  id: string;
  name: string;
  length: number;
  width: number;
  grain: Grain;
  allowRot: boolean;
  quantity: number;
  edges: Edges;
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
