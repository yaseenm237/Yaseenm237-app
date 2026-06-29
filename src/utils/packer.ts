/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PartInput, SheetSettings, PackingResult, SheetLayout, PackedPart, Edges, AlgoComparison, DrillHole } from '../types';

// Convert input value to millimeters
export function convertToMm(value: number, unit: 'Inch' | 'CM' | 'MM'): number {
  if (unit === 'Inch') return value * 25.4;
  if (unit === 'CM') return value * 10.0;
  return value;
}

// Convert MM back to selected unit
export function convertMmToUnit(value: number, unit: 'Inch' | 'CM' | 'MM'): number {
  if (unit === 'Inch') return value / 25.4;
  if (unit === 'CM') return value / 10.0;
  return value;
}

// Convert edge banding configuration to summary text (in selected language)
export function getEdgeBandingSummary(edges: Edges, isHindi: boolean): string {
  const { T, B, L, R } = edges;
  if (T && B && L && R) {
    return isHindi ? '🔄 चारों तरफ (All)' : '🔄 All Around';
  }
  if (T && L && !B && !R) {
    return isHindi ? '↖️ L-आकार (Top + Left)' : '↖️ L-Shape (Top + Left)';
  }
  if (T && R && !B && !L) {
    return isHindi ? '↗️ L-आकार (Top + Right)' : '↗️ L-Shape (Top + Right)';
  }
  if (B && L && !T && !R) {
    return isHindi ? '↙️ L-आकार (Bottom + Left)' : '↙️ L-Shape (Bottom + Left)';
  }
  if (B && R && !T && !L) {
    return isHindi ? '↘️ L-आकार (Bottom + Right)' : '↘️ L-Shape (Bottom + Right)';
  }
  if (T && B && !L && !R) {
    return isHindi ? '↕️ दो तरफ (Top + Bottom)' : '↕️ Two Sides (Top + Bottom)';
  }
  if (L && R && !T && !B) {
    return isHindi ? '↔️ दो तरफ (Left + Right)' : '↔️ Two Sides (Left + Right)';
  }

  const list: string[] = [];
  if (T) list.push(isHindi ? 'ऊपर' : 'Top');
  if (B) list.push(isHindi ? 'नीचे' : 'Bottom');
  if (L) list.push(isHindi ? 'बायाँ' : 'Left');
  if (R) list.push(isHindi ? 'दायाँ' : 'Right');

  if (list.length === 0) {
    return isHindi ? '❌ कोई नहीं (None)' : '❌ None';
  }
  return list.join(' + ');
}

// Minimal rectangle interfaces for internal solvers
interface FreeRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface PartToPack {
  id: string;
  name: string;
  origL: number; // in mm
  origW: number; // in mm
  cutL: number;  // in mm (original minus edge banding)
  cutW: number;  // in mm (original minus edge banding)
  grain: 'L' | 'W' | 'N';
  allowRot: boolean;
  edges: Edges;
  drillHoles?: DrillHole[];
}

/**
 * Calculates a positive scoring bonus if placing a part at (posX, posY) makes it physically
 * touch and align with an already-placed identical part.
 */
function getAdjacencyScore(
  posX: number,
  posY: number,
  optW: number,
  optH: number,
  part: PartToPack,
  packedOnThisSheet: PackedPart[]
): number {
  let score = 0;
  for (const other of packedOnThisSheet) {
    // Check if it's the same part type (matching original dimensions or name)
    const isSameType =
      (Math.abs(other.origL - part.origL) < 0.1 && Math.abs(other.origW - part.origW) < 0.1) ||
      other.name === part.name;
    if (!isSameType) continue;

    // 1. Horizontally adjacent (touches left/right edge and aligned vertically at the bottom)
    const touchX = Math.abs(posX - (other.x + other.w)) < 0.5 || Math.abs((posX + optW) - other.x) < 0.5;
    const alignY = Math.abs(posY - other.y) < 0.5;

    // 2. Vertically adjacent (touches bottom/top edge and aligned horizontally at the left)
    const touchY = Math.abs(posY - (other.y + other.h)) < 0.5 || Math.abs((posY + optH) - other.y) < 0.5;
    const alignX = Math.abs(posX - other.x) < 0.5;

    if ((touchX && alignY) || (touchY && alignX)) {
      // Large bonus to group identical parts in clean rows/columns and minimize fragmentation
      score += 25000;
    }
  }
  return score;
}

/**
 * Calculates a look-ahead bonus for spaciousness/capacity to encourage placing the FIRST part 
 * of a set of identical parts in a free rectangle that is large enough to hold multiple of them.
 */
function getSpaciousnessScore(
  fW: number,
  fH: number,
  optW: number,
  optH: number,
  qtyLeft: number,
  K: number
): number {
  if (qtyLeft <= 1) return 0;
  // Calculate how many parts of size (optW, optH) can fit in fW x fH with kerf K
  const cols = Math.floor((fW + K) / (optW + K));
  const rows = Math.floor((fH + K) / (optH + K));
  const maxFit = cols * rows;
  const canGroup = Math.min(qtyLeft, maxFit);
  if (canGroup <= 1) return 0;
  // Return a massive bonus if it can hold more of our identical parts
  return canGroup * 15000;
}

/**
 * 2-D Bin Packing Solver supporting Guillotine and MaxRects strategies
 */
export function runPacking(
  partsInput: PartInput[],
  settings: SheetSettings
): PackingResult {
  // If there are no multi-materials or stockItems defined, just use the single runner
  if (!settings.stockItems || settings.stockItems.length === 0) {
    return runPackingSingleMaterial(partsInput, settings);
  }

  // Otherwise, group parts by material
  const materialGroups = new Map<string | undefined, PartInput[]>();
  for (const part of partsInput) {
    const matId = part.materialId;
    if (!materialGroups.has(matId)) {
      materialGroups.set(matId, []);
    }
    materialGroups.get(matId)!.push(part);
  }

  const finalResult: PackingResult = {
    layouts: [],
    totalSheetsUsed: 0,
    totalUtilization: 0,
    overallWastePercent: 0,
    totalPartsArea: 0,
    totalBandingLength: 0,
    unplacedParts: []
  };

  let globalSheetIndex = 1;
  let totalAreaUsedByAll = 0;
  let totalAreaAvailableByAll = 0;

  for (const [matId, groupParts] of materialGroups.entries()) {
    let overrideL: number | undefined;
    let overrideW: number | undefined;
    let materialName: string | undefined;
    let stockQtyOverride: number | undefined;

    if (matId) {
      const stockItem = settings.stockItems.find(s => s.id === matId);
      if (stockItem) {
        overrideL = stockItem.length;
        overrideW = stockItem.width;
        materialName = stockItem.name;
        stockQtyOverride = stockItem.quantity;
      }
    }

    const groupResult = runPackingSingleMaterial(
      groupParts,
      settings,
      overrideL,
      overrideW,
      materialName,
      stockQtyOverride
    );

    // Merge group results into final result
    for (const layout of groupResult.layouts) {
      layout.sheetIndex = globalSheetIndex++;
      finalResult.layouts.push(layout);
      
      totalAreaUsedByAll += layout.usedArea;
      totalAreaAvailableByAll += layout.totalArea;
    }

    finalResult.totalSheetsUsed += groupResult.totalSheetsUsed;
    finalResult.totalPartsArea += groupResult.totalPartsArea;
    finalResult.totalBandingLength += groupResult.totalBandingLength;
    
    // Merge unplaced
    for (const u of groupResult.unplacedParts) {
      const existing = finalResult.unplacedParts.find(e => e.name === u.name);
      if (existing) {
        existing.qty += u.qty;
      } else {
        finalResult.unplacedParts.push({ ...u });
      }
    }
  }

  if (totalAreaAvailableByAll > 0) {
    finalResult.totalUtilization = (totalAreaUsedByAll / totalAreaAvailableByAll) * 100;
    finalResult.overallWastePercent = 100 - finalResult.totalUtilization;
  }

  return finalResult;
}

export function runPackingSingleMaterial(
  partsInput: PartInput[],
  settings: SheetSettings,
  sheetLOverride?: number,
  sheetWOverride?: number,
  materialNameOverride?: string,
  stockQtyOverride?: number
): PackingResult {
  if (settings.algorithm === 'AutoBest') {
    // Rule 2: Multi-pass Dictionary Ka Intejaam (Core Logic)
    const nesting_iteration_pool: Record<string, PackingResult> = {};
    const heuristics = [
      'StripCutColFirst',
      'StripCutRowFirst',
      'GuillotineBssfSas',
      'GuillotineBssfMaxas',
      'MaxRectsBssf'
    ];
    
    let bestHeuristic = heuristics[0];
    let minWaste = Infinity;

    for (let i = 0; i < heuristics.length; i++) {
      const algo = heuristics[i];
      const res = runPackingSingleMaterial(
        partsInput, 
        { ...settings, algorithm: algo }, 
        sheetLOverride, 
        sheetWOverride, 
        materialNameOverride,
        stockQtyOverride
      );
      
      // Store in temporary dictionary
      nesting_iteration_pool[`pheri_${i+1}_${algo}`] = res;
      
      // Rule 3: Analysis aur Selection Logic
      if (res.overallWastePercent < minWaste || 
         (res.overallWastePercent === minWaste && res.totalSheetsUsed < nesting_iteration_pool[`pheri_${heuristics.indexOf(bestHeuristic)+1}_${bestHeuristic}`].totalSheetsUsed)) {
        minWaste = res.overallWastePercent;
        bestHeuristic = algo;
      }
    }
    
    const bestResult = nesting_iteration_pool[`pheri_${heuristics.indexOf(bestHeuristic)+1}_${bestHeuristic}`];
    
    // Rule 4: Hath ke Hath Kachra Clean-up (Garbage Collection)
    for (const key in nesting_iteration_pool) {
      delete nesting_iteration_pool[key];
    }
    
    return bestResult;
  }

  const unit = settings.unit;
  const edgeTh = settings.edgeTh;
  const K = settings.bladeTh; // Kerf in mm
  const T = settings.trimMargin; // Trim in mm

  const rawL = sheetLOverride ?? settings.sheetL;
  const rawW = sheetWOverride ?? settings.sheetW;

  const S_L = convertToMm(rawL, unit);
  const S_W = convertToMm(rawW, unit);

  // usable dimensions for each sheet
  const binW = Math.max(1.0, S_L - 2 * T); // Width along X axis (Sheet Length)
  const binH = Math.max(1.0, S_W - 2 * T); // Height along Y axis (Sheet Width)

  // 1. Prepare parts & adjust dimensions for edge banding
  const flatParts: PartToPack[] = [];
  let totalBandingLength = 0; // Total length of applied banding in mm

  for (const part of partsInput) {
    if (part.quantity <= 0 || part.length <= 0 || part.width <= 0) continue;

    const lMm = convertToMm(part.length, unit);
    const wMm = convertToMm(part.width, unit);

    // Banding counts
    const hasT = part.edges.T;
    const hasB = part.edges.B;
    const hasL = part.edges.L;
    const hasR = part.edges.R;

    // Edge banding reduces the wooden cutting size:
    // T and B reduce the length dimension
    // L and R reduce the width dimension
    let currentEdgeTh = edgeTh;
    if (part.edgeMaterialId && settings.edgeBandItems) {
      const edgeBand = settings.edgeBandItems.find(e => e.id === part.edgeMaterialId);
      if (edgeBand && edgeBand.thickness !== undefined) {
        currentEdgeTh = edgeBand.thickness;
      }
    }

    const dL = (Number(hasT) + Number(hasB)) * currentEdgeTh;
    const dW = (Number(hasL) + Number(hasR)) * currentEdgeTh;

    const cutL = Math.max(1.0, lMm - dL);
    const cutW = Math.max(1.0, wMm - dW);

    // Calculate edge banding lengths for total summary
    // Top & Bottom edges are along width, Left & Right edges are along length
    if (hasT) totalBandingLength += wMm * part.quantity;
    if (hasB) totalBandingLength += wMm * part.quantity;
    if (hasL) totalBandingLength += lMm * part.quantity;
    if (hasR) totalBandingLength += lMm * part.quantity;

    for (let q = 0; q < part.quantity; q++) {
      flatParts.push({
        id: `${part.id}_${q}`,
        name: part.name || `Part ${flatParts.length + 1}`,
        origL: lMm,
        origW: wMm,
        cutL,
        cutW,
        grain: part.grain,
        allowRot: part.allowRot,
        edges: { ...part.edges },
        drillHoles: part.drillHoles ? part.drillHoles.map(h => ({
          ...h,
          x: convertToMm(h.x, unit),
          y: convertToMm(h.y, unit),
          diameter: convertToMm(h.diameter, unit),
        })) : undefined,
      });
    }
  }

  // Sort parts by area descending, then sub-sort by name to group identical parts together
  flatParts.sort((a, b) => {
    const areaA = a.cutL * a.cutW;
    const areaB = b.cutL * b.cutW;
    if (Math.abs(areaA - areaB) > 0.01) {
      return areaB - areaA;
    }
    return a.name.localeCompare(b.name);
  });

  const layouts: SheetLayout[] = [];
  const unplacedPartsMap = new Map<string, { name: string; qty: number }>();
  const totalStockSheets = stockQtyOverride !== undefined ? stockQtyOverride : 9999;

  // Initialize unplaced parts helper
  for (const p of flatParts) {
    const entry = unplacedPartsMap.get(p.name);
    if (entry) {
      entry.qty += 1;
    } else {
      unplacedPartsMap.set(p.name, { name: p.name, qty: 1 });
    }
  }

  // List of remaining parts to pack
  let remainingParts = [...flatParts];

  // Try packing sheet by sheet
  for (let sIdx = 0; sIdx < totalStockSheets; sIdx++) {
    if (remainingParts.length === 0) break;

    const packedOnThisSheet: PackedPart[] = [];
    let freeRects: FreeRect[] = [{ x: 0, y: 0, w: binW, h: binH }];

    const stillToPack: PartToPack[] = [];

    if (settings.algorithm === 'StripCutRowFirst') {
      // --- STRIP-CUT ROW-FIRST (CONTINUOUS HORIZONTAL RIP) ---
      const sheetParts = [...remainingParts];
      // Sort primarily by height (cutW) descending to group similar heights and minimize vertical waste
      sheetParts.sort((a, b) => b.cutW - a.cutW);

      interface RowShelf {
        y: number;
        h: number;
        usedW: number;
        parts: PackedPart[];
      }

      const shelves: RowShelf[] = [];
      let currentY = 0;
      const unplacedThisSheet: PartToPack[] = [];

      for (const part of sheetParts) {
        // Get allowed orientations
        const rectW = part.cutL + K;
        const rectH = part.cutW + K;
        const orientations: { w: number; h: number; rot: boolean }[] = [];

        if (part.grain === 'L') {
          orientations.push({ w: rectW, h: rectH, rot: false });
        } else if (part.grain === 'W') {
          orientations.push({ w: rectH, h: rectW, rot: true });
        } else {
          orientations.push({ w: rectW, h: rectH, rot: false });
          if (part.allowRot) {
            orientations.push({ w: rectH, h: rectW, rot: true });
          }
        }

        // 1. Try to fit in an existing shelf
        let bestShelfIdx = -1;
        let bestOrientation: typeof orientations[0] | null = null;
        let bestShelfFitScore = -Infinity; // Higher is better

        // Collect all currently placed parts on this sheet across all shelves
        const currentlyPlaced: PackedPart[] = [];
        for (const sh of shelves) {
          currentlyPlaced.push(...sh.parts);
        }

        for (let s = 0; s < shelves.length; s++) {
          const sh = shelves[s];
          for (const opt of orientations) {
            const leftoverW = binW - sh.usedW - opt.w;
            if (leftoverW >= -0.01 && opt.h <= sh.h + 0.01) {
              // Fits!
              // Score = minimize height waste and leftover width + adjacency bonus
              const heightWaste = sh.h - opt.h;
              
              // Only allow matching if the height difference is small, to ensure continuous straight rows
              const maxAllowedHeightWaste = Math.min(25.0, sh.h * 0.15);
              if (heightWaste > maxAllowedHeightWaste) {
                continue;
              }

              const score = -(heightWaste * 1000 + leftoverW) + getAdjacencyScore(sh.usedW, sh.y, opt.w, opt.h, part, currentlyPlaced);
              if (score > bestShelfFitScore) {
                bestShelfFitScore = score;
                bestShelfIdx = s;
                bestOrientation = opt;
              }
            }
          }
        }

        if (bestShelfIdx !== -1 && bestOrientation) {
          const sh = shelves[bestShelfIdx];
          const posX = sh.usedW;
          const posY = sh.y;

          sh.parts.push({
            id: part.id,
            name: part.name,
            x: posX,
            y: posY,
            w: bestOrientation.w,
            h: bestOrientation.h,
            origL: part.origL,
            origW: part.origW,
            cutL: part.cutL,
            cutW: part.cutW,
            isRotated: bestOrientation.rot,
            edges: part.edges,
            grain: part.grain,
            drillHoles: transformHoles(part.drillHoles, bestOrientation.rot, part.cutL, part.cutW),
          });

          sh.usedW += bestOrientation.w;

          // Clean up unplaced tracking
          const entry = unplacedPartsMap.get(part.name);
          if (entry) {
            entry.qty -= 1;
            if (entry.qty <= 0) unplacedPartsMap.delete(part.name);
          }
        } else {
          // 2. Try to open a new shelf
          let bestNewOpt: typeof orientations[0] | null = null;
          let minNewShelfHeight = Infinity;

          for (const opt of orientations) {
            if (opt.w <= binW + 0.01 && currentY + opt.h <= binH + 0.01) {
              if (opt.h < minNewShelfHeight) {
                minNewShelfHeight = opt.h;
                bestNewOpt = opt;
              }
            }
          }

          if (bestNewOpt) {
            const shY = currentY;
            const shH = bestNewOpt.h;

            const newShelf: RowShelf = {
              y: shY,
              h: shH,
              usedW: bestNewOpt.w,
              parts: [{
                id: part.id,
                name: part.name,
                x: 0,
                y: shY,
                w: bestNewOpt.w,
                h: bestNewOpt.h,
                origL: part.origL,
                origW: part.origW,
                cutL: part.cutL,
                cutW: part.cutW,
                isRotated: bestNewOpt.rot,
                edges: part.edges,
                grain: part.grain,
                drillHoles: transformHoles(part.drillHoles, bestNewOpt.rot, part.cutL, part.cutW),
              }]
            };

            shelves.push(newShelf);
            currentY += shH;

            // Clean up unplaced tracking
            const entry = unplacedPartsMap.get(part.name);
            if (entry) {
              entry.qty -= 1;
              if (entry.qty <= 0) unplacedPartsMap.delete(part.name);
            }
          } else {
            // Defer to next sheet
            unplacedThisSheet.push(part);
          }
        }
      }

      // Collect all placed parts
      for (const sh of shelves) {
        packedOnThisSheet.push(...sh.parts);
      }

      if (packedOnThisSheet.length === 0) {
        break;
      }

      let sheetUsedArea = 0;
      for (const p of packedOnThisSheet) {
        sheetUsedArea += p.w * p.h;
      }
      const totalArea = binW * binH;
      const wastePercent = ((totalArea - sheetUsedArea) / totalArea) * 100;

      layouts.push({
        sheetIndex: sIdx + 1,
        width: binW,
        height: binH,
        parts: packedOnThisSheet,
        usedArea: sheetUsedArea,
        totalArea,
        wastePercent: Math.max(0, wastePercent),
        wasteRects: computeWasteRects(binW, binH, packedOnThisSheet),
        materialName: materialNameOverride
      });

      remainingParts = unplacedThisSheet;
      continue;
    }

    if (settings.algorithm === 'StripCutColFirst') {
      // --- STRIP-CUT COLUMN-FIRST (CONTINUOUS VERTICAL RIP) ---
      const sheetParts = [...remainingParts];
      // Sort primarily by length (cutL) descending to group similar lengths and define column widths
      sheetParts.sort((a, b) => b.cutL - a.cutL);

      interface ColShelf {
        x: number;
        w: number;
        usedH: number;
        parts: PackedPart[];
      }

      const columns: ColShelf[] = [];
      let currentX = 0;
      const unplacedThisSheet: PartToPack[] = [];

      for (const part of sheetParts) {
        const rectW = part.cutL + K;
        const rectH = part.cutW + K;
        const orientations: { w: number; h: number; rot: boolean }[] = [];

        if (part.grain === 'L') {
          orientations.push({ w: rectW, h: rectH, rot: false });
        } else if (part.grain === 'W') {
          orientations.push({ w: rectH, h: rectW, rot: true });
        } else {
          orientations.push({ w: rectW, h: rectH, rot: false });
          if (part.allowRot) {
            orientations.push({ w: rectH, h: rectW, rot: true });
          }
        }

        // 1. Try to fit in an existing column
        let bestColIdx = -1;
        let bestOrientation: typeof orientations[0] | null = null;
        let bestColFitScore = -Infinity;

        // Collect all currently placed parts on this sheet across all columns
        const currentlyPlaced: PackedPart[] = [];
        for (const col of columns) {
          currentlyPlaced.push(...col.parts);
        }

        for (let c = 0; c < columns.length; c++) {
          const col = columns[c];
          for (const opt of orientations) {
            const leftoverH = binH - col.usedH - opt.h;
            if (leftoverH >= -0.01 && opt.w <= col.w + 0.01) {
              // Fits!
              // Score = minimize width waste and leftover height + adjacency bonus
              const widthWaste = col.w - opt.w;

              // Only allow matching if the width difference is small, to ensure continuous straight columns
              const maxAllowedWidthWaste = Math.min(25.0, col.w * 0.15);
              if (widthWaste > maxAllowedWidthWaste) {
                continue;
              }

              const score = -(widthWaste * 1000 + leftoverH) + getAdjacencyScore(col.x, col.usedH, opt.w, opt.h, part, currentlyPlaced);
              if (score > bestColFitScore) {
                bestColFitScore = score;
                bestColIdx = c;
                bestOrientation = opt;
              }
            }
          }
        }

        if (bestColIdx !== -1 && bestOrientation) {
          const col = columns[bestColIdx];
          const posX = col.x;
          const posY = col.usedH;

          col.parts.push({
            id: part.id,
            name: part.name,
            x: posX,
            y: posY,
            w: bestOrientation.w,
            h: bestOrientation.h,
            origL: part.origL,
            origW: part.origW,
            cutL: part.cutL,
            cutW: part.cutW,
            isRotated: bestOrientation.rot,
            edges: part.edges,
            grain: part.grain,
            drillHoles: transformHoles(part.drillHoles, bestOrientation.rot, part.cutL, part.cutW),
          });

          col.usedH += bestOrientation.h;

          // Clean up unplaced tracking
          const entry = unplacedPartsMap.get(part.name);
          if (entry) {
            entry.qty -= 1;
            if (entry.qty <= 0) unplacedPartsMap.delete(part.name);
          }
        } else {
          // 2. Try to open a new column
          let bestNewOpt: typeof orientations[0] | null = null;
          let minNewColWidth = Infinity;

          for (const opt of orientations) {
            if (opt.h <= binH + 0.01 && currentX + opt.w <= binW + 0.01) {
              if (opt.w < minNewColWidth) {
                minNewColWidth = opt.w;
                bestNewOpt = opt;
              }
            }
          }

          if (bestNewOpt) {
            const colX = currentX;
            const colW = bestNewOpt.w;

            const newCol: ColShelf = {
              x: colX,
              w: colW,
              usedH: bestNewOpt.h,
              parts: [{
                id: part.id,
                name: part.name,
                x: colX,
                y: 0,
                w: bestNewOpt.w,
                h: bestNewOpt.h,
                origL: part.origL,
                origW: part.origW,
                cutL: part.cutL,
                cutW: part.cutW,
                isRotated: bestNewOpt.rot,
                edges: part.edges,
                grain: part.grain,
                drillHoles: transformHoles(part.drillHoles, bestNewOpt.rot, part.cutL, part.cutW),
              }]
            };

            columns.push(newCol);
            currentX += colW;

            // Clean up unplaced tracking
            const entry = unplacedPartsMap.get(part.name);
            if (entry) {
              entry.qty -= 1;
              if (entry.qty <= 0) unplacedPartsMap.delete(part.name);
            }
          } else {
            // Defer to next sheet
            unplacedThisSheet.push(part);
          }
        }
      }

      // Collect all placed parts
      for (const col of columns) {
        packedOnThisSheet.push(...col.parts);
      }

      if (packedOnThisSheet.length === 0) {
        break;
      }

      let sheetUsedArea = 0;
      for (const p of packedOnThisSheet) {
        sheetUsedArea += p.w * p.h;
      }
      const totalArea = binW * binH;
      const wastePercent = ((totalArea - sheetUsedArea) / totalArea) * 100;

      layouts.push({
        sheetIndex: sIdx + 1,
        width: binW,
        height: binH,
        parts: packedOnThisSheet,
        usedArea: sheetUsedArea,
        totalArea,
        wastePercent: Math.max(0, wastePercent),
        wasteRects: computeWasteRects(binW, binH, packedOnThisSheet),
        materialName: materialNameOverride
      });

      remainingParts = unplacedThisSheet;
      continue;
    }

    for (const part of remainingParts) {
      let bestRectIndex = -1;
      let bestShortSideFit = Infinity;
      let bestIsRotated = false;
      let finalW = 0;
      let finalH = 0;

      // Determine dimensions including blade thickness (Kerf)
      const rectW = part.cutL + K;
      const rectH = part.cutW + K;

      // Orientation constraints:
      // Grain 'L': must pack as Length along sheet X-axis. Rotation is false.
      // Grain 'W': must pack as Width along sheet X-axis (rotated initially). Rotation is false.
      // Grain 'N':
      //   - if allowRot: can try both (rectW x rectH) and (rectH x rectW)
      //   - else: can only try (rectW x rectH)
      const orientations: { w: number; h: number; rot: boolean }[] = [];

      if (part.grain === 'L') {
        orientations.push({ w: rectW, h: rectH, rot: false });
      } else if (part.grain === 'W') {
        orientations.push({ w: rectH, h: rectW, rot: true }); // rotate 90 degrees to align grain widthwise
      } else {
        // No grain
        orientations.push({ w: rectW, h: rectH, rot: false });
        if (part.allowRot) {
          orientations.push({ w: rectH, h: rectW, rot: true });
        }
      }

      // Check all orientations and free rects to find best fit
      if (settings.algorithm.startsWith('Guillotine')) {
        // --- GUILLOTINE PACKING (BSSF Heuristic) ---
        let bestScore = Infinity; // We want to minimize the score (shortSideFit - bonuses)
        const qtyLeft = unplacedPartsMap.get(part.name)?.qty || 1;
        for (let r = 0; r < freeRects.length; r++) {
          const f = freeRects[r];
          for (const opt of orientations) {
            if (opt.w <= f.w && opt.h <= f.h) {
              const leftoverW = f.w - opt.w;
              const leftoverH = f.h - opt.h;
              const shortSideFit = Math.min(leftoverW, leftoverH);
              
              const spaciousness = getSpaciousnessScore(f.w, f.h, opt.w, opt.h, qtyLeft, K);
              const adjacency = getAdjacencyScore(f.x, f.y, opt.w, opt.h, part, packedOnThisSheet);
              
              // Snug-fit priority bonus: prioritize filling small existing gaps and channels
              const isSnugW = leftoverW < 12.0;
              const isSnugH = leftoverH < 12.0;
              let snugBonus = 0;
              if (isSnugW && isSnugH) snugBonus += 100000;
              else if (isSnugW || isSnugH) snugBonus += 40000;

              // Rotation preference: only rotate if it is significantly better to fit snug, otherwise maintain non-rotated state
              const rotationPenalty = opt.rot ? 50 : 0;

              const score = shortSideFit - spaciousness - adjacency - snugBonus + rotationPenalty;

              if (score < bestScore) {
                bestScore = score;
                bestRectIndex = r;
                bestIsRotated = opt.rot;
                finalW = opt.w;
                finalH = opt.h;
              }
            }
          }
        }

        if (bestRectIndex !== -1) {
          const f = freeRects[bestRectIndex];
          // Place rectangle at the bottom-left of the free space
          const posX = f.x;
          const posY = f.y;

          packedOnThisSheet.push({
            id: part.id,
            name: part.name,
            x: posX,
            y: posY,
            w: finalW,
            h: finalH,
            origL: part.origL,
            origW: part.origW,
            cutL: part.cutL,
            cutW: part.cutW,
            isRotated: bestIsRotated,
            edges: part.edges,
            grain: part.grain,
            drillHoles: transformHoles(part.drillHoles, bestIsRotated, part.cutL, part.cutW),
          });

          // Split the free rect using SAS (Short Side Split)
          const leftoverW = f.w - finalW;
          const leftoverH = f.h - finalH;

          // Remove the placed free rect
          freeRects.splice(bestRectIndex, 1);

          const isBssfSas = settings.algorithm === 'GuillotineBssfSas';

          // Split heuristic:
          // BssfSas splits along the shorter side of the placed part.
          // BssfMaxas splits along the longer side.
          const doHorizontalSplit = isBssfSas
            ? leftoverW < leftoverH
            : leftoverW >= leftoverH;

          if (doHorizontalSplit) {
            // Horizontal split
            if (leftoverW > 0.01) {
              freeRects.push({
                x: f.x + finalW,
                y: f.y,
                w: leftoverW,
                h: finalH,
              });
            }
            if (leftoverH > 0.01) {
              freeRects.push({
                x: f.x,
                y: f.y + finalH,
                w: f.w,
                h: leftoverH,
              });
            }
          } else {
            // Vertical split
            if (leftoverW > 0.01) {
              freeRects.push({
                x: f.x + finalW,
                y: f.y,
                w: leftoverW,
                h: f.h,
              });
            }
            if (leftoverH > 0.01) {
              freeRects.push({
                x: f.x,
                y: f.y + finalH,
                w: finalW,
                h: leftoverH,
              });
            }
          }

          // Clean up unplaced tracking
          const entry = unplacedPartsMap.get(part.name);
          if (entry) {
            entry.qty -= 1;
            if (entry.qty <= 0) unplacedPartsMap.delete(part.name);
          }
        } else {
          stillToPack.push(part);
        }
      } else {
        // --- MAXRECTS PACKING (Best Short Side Fit) ---
        let bestScore = Infinity; // We want to minimize the score (shortSideFit - bonuses)
        const qtyLeft = unplacedPartsMap.get(part.name)?.qty || 1;
        for (let r = 0; r < freeRects.length; r++) {
          const f = freeRects[r];
          for (const opt of orientations) {
            if (opt.w <= f.w && opt.h <= f.h) {
              const leftoverW = f.w - opt.w;
              const leftoverH = f.h - opt.h;
              const shortSideFit = Math.min(leftoverW, leftoverH);
              
              const spaciousness = getSpaciousnessScore(f.w, f.h, opt.w, opt.h, qtyLeft, K);
              const adjacency = getAdjacencyScore(f.x, f.y, opt.w, opt.h, part, packedOnThisSheet);
              
              // Snug-fit priority bonus: prioritize filling small existing gaps and channels
              const isSnugW = leftoverW < 12.0;
              const isSnugH = leftoverH < 12.0;
              let snugBonus = 0;
              if (isSnugW && isSnugH) snugBonus += 100000;
              else if (isSnugW || isSnugH) snugBonus += 40000;

              // Rotation preference: only rotate if it is significantly better to fit snug, otherwise maintain non-rotated state
              const rotationPenalty = opt.rot ? 50 : 0;

              const score = shortSideFit - spaciousness - adjacency - snugBonus + rotationPenalty;

              if (score < bestScore) {
                bestScore = score;
                bestRectIndex = r;
                bestIsRotated = opt.rot;
                finalW = opt.w;
                finalH = opt.h;
              }
            }
          }
        }

        if (bestRectIndex !== -1) {
          const f = freeRects[bestRectIndex];
          const posX = f.x;
          const posY = f.y;

          packedOnThisSheet.push({
            id: part.id,
            name: part.name,
            x: posX,
            y: posY,
            w: finalW,
            h: finalH,
            origL: part.origL,
            origW: part.origW,
            cutL: part.cutL,
            cutW: part.cutW,
            isRotated: bestIsRotated,
            edges: part.edges,
            grain: part.grain,
            drillHoles: transformHoles(part.drillHoles, bestIsRotated, part.cutL, part.cutW),
          });

          // Update free rects: split any overlapping free rects with the newly placed part
          const newFreeRects: FreeRect[] = [];
          for (const freeR of freeRects) {
            if (
              posX < freeR.x + freeR.w &&
              posX + finalW > freeR.x &&
              posY < freeR.y + freeR.h &&
              posY + finalH > freeR.y
            ) {
              // Overlap exists! Split freeR into up to 4 subdivisions
              if (posX > freeR.x) {
                newFreeRects.push({
                  x: freeR.x,
                  y: freeR.y,
                  w: posX - freeR.x,
                  h: freeR.h,
                });
              }
              if (posX + finalW < freeR.x + freeR.w) {
                newFreeRects.push({
                  x: posX + finalW,
                  y: freeR.y,
                  w: freeR.x + freeR.w - (posX + finalW),
                  h: freeR.h,
                });
              }
              if (posY > freeR.y) {
                newFreeRects.push({
                  x: freeR.x,
                  y: freeR.y,
                  w: freeR.w,
                  h: posY - freeR.y,
                });
              }
              if (posY + finalH < freeR.y + freeR.h) {
                newFreeRects.push({
                  x: freeR.x,
                  y: posY + finalH,
                  w: freeR.w,
                  h: freeR.y + freeR.h - (posY + finalH),
                });
              }
            } else {
              // No overlap, keep as is
              newFreeRects.push(freeR);
            }
          }

          // Clean up free rects by removing any that are completely contained within other free rects
          freeRects = [];
          for (let i = 0; i < newFreeRects.length; i++) {
            let isContained = false;
            for (let j = 0; j < newFreeRects.length; j++) {
              if (i === j) continue;
              const rA = newFreeRects[i];
              const rB = newFreeRects[j];
              // Check if rA is inside rB
              if (
                rA.x >= rB.x &&
                rA.y >= rB.y &&
                rA.x + rA.w <= rB.x + rB.w &&
                rA.y + rA.h <= rB.y + rB.h
              ) {
                isContained = true;
                break;
              }
            }
            if (!isContained) {
              freeRects.push(newFreeRects[i]);
            }
          }

          // Clean up unplaced tracking
          const entry = unplacedPartsMap.get(part.name);
          if (entry) {
            entry.qty -= 1;
            if (entry.qty <= 0) unplacedPartsMap.delete(part.name);
          }
        } else {
          stillToPack.push(part);
        }
      }
    }

    // Save this layout if parts were successfully placed
    if (packedOnThisSheet.length > 0) {
      let sheetUsedArea = 0;
      for (const p of packedOnThisSheet) {
        // Area packed (including blade kerf)
        sheetUsedArea += p.w * p.h;
      }

      const totalArea = binW * binH;
      const wastePercent = ((totalArea - sheetUsedArea) / totalArea) * 100;

      layouts.push({
        sheetIndex: sIdx + 1,
        width: binW,
        height: binH,
        parts: packedOnThisSheet,
        usedArea: sheetUsedArea,
        totalArea,
        wastePercent: Math.max(0, wastePercent),
        wasteRects: computeWasteRects(binW, binH, packedOnThisSheet),
        materialName: materialNameOverride
      });

      // Update remaining list for next sheet
      remainingParts = stillToPack;
    } else {
      // Nothing fits on this sheet at all, break to avoid infinite loop
      break;
    }
  }

  // Calculate final statistics
  const totalSheetsUsed = layouts.length;
  let totalPartsArea = 0;
  for (const part of flatParts) {
    if (!unplacedPartsMap.has(part.name) || (unplacedPartsMap.get(part.name)?.qty || 0) < flatParts.filter(x => x.name === part.name).length) {
      totalPartsArea += part.cutL * part.cutW;
    }
  }

  const rawSheetArea = S_L * S_W;
  const totalRawAreaUsed = totalSheetsUsed * rawSheetArea;

  // Material utilization = (Total cutting area of parts placed) / (Raw sheets area used) * 100
  const totalUtilization = totalRawAreaUsed > 0 ? (totalPartsArea / totalRawAreaUsed) * 100 : 0;
  const overallWastePercent = 100 - totalUtilization;

  const unplacedParts = Array.from(unplacedPartsMap.values()).filter(p => p.qty > 0);

  return {
    layouts,
    totalSheetsUsed,
    totalUtilization: Math.max(0, Math.min(100, totalUtilization)),
    overallWastePercent: Math.max(0, Math.min(100, overallWastePercent)),
    totalPartsArea,
    totalBandingLength,
    unplacedParts,
  };
}

/**
 * Compare all algorithms and return comparison summaries
 */
export function compareAlgorithms(
  partsInput: PartInput[],
  settings: SheetSettings
): AlgoComparison[] {
  const algos = [
    { key: 'StripCutRowFirst', name: 'Strip-Cut Row-First (Continuous Horizontal)' },
    { key: 'StripCutColFirst', name: 'Strip-Cut Column-First (Continuous Vertical)' },
    { key: 'GuillotineBssfSas', name: 'Guillotine BSSF SAS (Table Saw)' },
    { key: 'GuillotineBssfMaxas', name: 'Guillotine BSSF MAXAS (Alternative)' },
    { key: 'MaxRectsBssf', name: 'MaxRects BSSF (CNC Router / High Density)' },
  ];

  return algos.map(algo => {
    const res = runPacking(partsInput, { ...settings, algorithm: algo.key });
    const unplacedCount = res.unplacedParts.reduce((sum, p) => sum + p.qty, 0);
    return {
      algoKey: algo.key,
      algoName: algo.name,
      sheetsUsed: res.totalSheetsUsed,
      utilization: res.totalUtilization,
      wastePercent: res.overallWastePercent,
      unplacedCount,
    };
  });
}

function transformHoles(holes: DrillHole[] | undefined, isRotated: boolean, cutL: number, cutW: number): DrillHole[] | undefined {
  if (!holes || holes.length === 0) return undefined;
  return holes.map(h => {
    if (isRotated) {
      // 90 degrees clockwise rotation: x_new = cutW - y_old, y_new = x_old
      return { ...h, x: cutW - h.y, y: h.x };
    }
    return { ...h };
  });
}

/**
 * Computes non-overlapping waste rectangles by taking a full sheet and subtracting placed parts.
 * Uses a coordinate compression grid-merging algorithm to consolidate waste into the largest possible pieces.
 */
export function computeWasteRects(
  binW: number,
  binH: number,
  parts: PackedPart[]
): { x: number; y: number; w: number; h: number }[] {

  const tolerance = 0.1; // 0.1 mm tolerance

  // 1. Collect all unique X coordinates (boundaries)
  const uniqueX = [0, binW];
  for (const p of parts) {
    uniqueX.push(p.x);
    uniqueX.push(p.x + p.w);
  }
  uniqueX.sort((a, b) => a - b);
  const xs: number[] = [];
  for (const x of uniqueX) {
    if (xs.length === 0 || x - xs[xs.length - 1] > tolerance) {
      xs.push(x);
    } else {
      // Keep the larger coordinate on collision to be safe
      xs[xs.length - 1] = x;
    }
  }

  // 2. Collect all unique Y coordinates (boundaries)
  const uniqueY = [0, binH];
  for (const p of parts) {
    uniqueY.push(p.y);
    uniqueY.push(p.y + p.h);
  }
  uniqueY.sort((a, b) => a - b);
  const ys: number[] = [];
  for (const y of uniqueY) {
    if (ys.length === 0 || y - ys[ys.length - 1] > tolerance) {
      ys.push(y);
    } else {
      ys[ys.length - 1] = y;
    }
  }

  const numX = xs.length - 1;
  const numY = ys.length - 1;
  if (numX <= 0 || numY <= 0) {
    return [];
  }

  // 3. Create a 2D array indicating whether each grid cell is covered by a part
  const covered: boolean[][] = Array.from({ length: numX }, () => Array(numY).fill(false));

  for (let i = 0; i < numX; i++) {
    for (let j = 0; j < numY; j++) {
      const centerX = (xs[i] + xs[i + 1]) / 2;
      const centerY = (ys[j] + ys[j + 1]) / 2;

      // Check if this cell's center lies inside any placed part
      for (const p of parts) {
        if (
          centerX >= p.x - tolerance &&
          centerX <= p.x + p.w + tolerance &&
          centerY >= p.y - tolerance &&
          centerY <= p.y + p.h + tolerance
        ) {
          covered[i][j] = true;
          break;
        }
      }
    }
  }

  // 4. Greedily find and extract the largest non-overlapping empty rectangles
  const waste: { x: number; y: number; w: number; h: number }[] = [];

  for (let i = 0; i < numX; i++) {
    for (let j = 0; j < numY; j++) {
      if (covered[i][j]) continue;

      let bestArea = 0;
      let bestDi = 1;
      let bestDj = 1;

      // Scan all possible sizes (di, dj) starting at cell (i, j)
      for (let di = 1; i + di <= numX; di++) {
        for (let dj = 1; j + dj <= numY; dj++) {
          // Check if the entire sub-grid of cells is empty
          let allEmpty = true;
          for (let c = i; c < i + di; c++) {
            for (let r = j; r < j + dj; r++) {
              if (covered[c][r]) {
                allEmpty = false;
                break;
              }
            }
            if (!allEmpty) break;
          }

          if (allEmpty) {
            const w = xs[i + di] - xs[i];
            const h = ys[j + dj] - ys[j];
            const area = w * h;
            
            if (area > bestArea) {
              bestArea = area;
              bestDi = di;
              bestDj = dj;
            } else if (Math.abs(area - bestArea) < 0.1) {
              // Tie-breaker: maximize the minimum side of the waste rect to prefer chunkier, more reusable parts over thin strips
              const currentMin = Math.min(w, h);
              const bestMin = Math.min(xs[i + bestDi] - xs[i], ys[j + bestDj] - ys[j]);
              if (currentMin > bestMin) {
                bestDi = di;
                bestDj = dj;
              }
            }
          } else {
            // For a fixed width `di`, if `dj` fails, then any larger height will also fail
            break;
          }
        }
      }

      // Mark the selected cells as covered
      for (let c = i; c < i + bestDi; c++) {
        for (let r = j; r < j + bestDj; r++) {
          covered[c][r] = true;
        }
      }

      // Add the physical consolidated rectangle to the waste list
      waste.push({
        x: xs[i],
        y: ys[j],
        w: xs[i + bestDi] - xs[i],
        h: ys[j + bestDj] - ys[j]
      });
    }
  }

  // Filter out tiny pieces of waste (under 5mm) to reduce visualization noise
  return waste.filter(r => r.w >= 5 && r.h >= 5);
}
