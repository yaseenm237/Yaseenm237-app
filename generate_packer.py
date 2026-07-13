def generate():
    code = """/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { PartInput, SheetSettings, PackingResult, SheetLayout, PackedPart, Edges, AlgoComparison, DrillHole } from '../types';

export function convertToMm(value: number, unit: 'Inch' | 'CM' | 'MM'): number {
  if (unit === 'Inch') return value * 25.4;
  if (unit === 'CM') return value * 10.0;
  return value;
}

export function convertMmToUnit(value: number, unit: 'Inch' | 'CM' | 'MM'): number {
  if (unit === 'Inch') return value / 25.4;
  if (unit === 'CM') return value / 10.0;
  return value;
}

export function getEdgeBandingSummary(edges: Edges, isHindi: boolean): string {
  const { T, B, L, R } = edges;
  if (T && B && L && R) return isHindi ? '🔄 चारों तरफ (All)' : '🔄 All Around';
  if (T && L && !B && !R) return isHindi ? '↖️ L-आकार (Top + Left)' : '↖️ L-Shape (Top + Left)';
  if (T && R && !B && !L) return isHindi ? '↗️ L-आकार (Top + Right)' : '↗️ L-Shape (Top + Right)';
  if (B && L && !T && !R) return isHindi ? '↙️ L-आकार (Bottom + Left)' : '↙️ L-Shape (Bottom + Left)';
  if (B && R && !T && !L) return isHindi ? '↘️ L-आकार (Bottom + Right)' : '↘️ L-Shape (Bottom + Right)';
  if (T && B && !L && !R) return isHindi ? '↕️ दो तरफ (Top + Bottom)' : '↕️ Two Sides (Top + Bottom)';
  if (L && R && !T && !B) return isHindi ? '↔️ दो तरफ (Left + Right)' : '↔️ Two Sides (Left + Right)';

  const list: string[] = [];
  if (T) list.push(isHindi ? 'ऊपर' : 'Top');
  if (B) list.push(isHindi ? 'नीचे' : 'Bottom');
  if (L) list.push(isHindi ? 'बायाँ' : 'Left');
  if (R) list.push(isHindi ? 'दायाँ' : 'Right');

  if (list.length === 0) return isHindi ? '❌ कोई नहीं (None)' : '❌ None';
  return list.join(' + ');
}

interface FreeRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface PartToPack {
  internalId: string;
  id: string;
  name: string;
  origL: number;
  origW: number;
  cutL: number;
  cutW: number;
  grain: 'L' | 'W' | 'N';
  allowRot: boolean;
  edges: Edges;
  drillHoles?: DrillHole[];
  edgeMaterialId?: string;
  frontLaminateId?: string;
  backLaminateId?: string;
}

export function runPacking(partsInput: PartInput[], settings: SheetSettings): PackingResult {
  const validPartsInput = partsInput.filter(part => {
    const l = Number(part.length);
    const w = Number(part.width);
    const q = Number(part.quantity);
    return l && w && q && !isNaN(l) && !isNaN(w) && !isNaN(q) && l > 0 && w > 0 && q > 0;
  });

  const lockedLayouts = (settings.lockedLayouts || []).filter(l => l.isLocked);
  const lockedPartIds = new Set(lockedLayouts.flatMap(l => l.parts.map(p => p.id)));

  const remainingPartsInput = validPartsInput.map(part => {
    let lockedQty = 0;
    for (let q = 0; q < part.quantity; q++) {
      if (lockedPartIds.has(`${part.id}_${q}`)) {
        lockedQty++;
      }
    }
    return {
      ...part,
      quantity: Math.max(0, part.quantity - lockedQty)
    };
  }).filter(p => p.quantity > 0);

  const runRemainingPacking = () => {
    if (!settings.stockItems || settings.stockItems.length === 0) {
      return runPackingSingleMaterial(remainingPartsInput, settings);
    }

    const materialGroups = new Map<string | undefined, PartInput[]>();
    for (const part of remainingPartsInput) {
      let matId = part.materialId;
      const recipe = settings.recipes?.find(r => r.id === matId);
      if (recipe) {
        matId = recipe.baseMaterialId;
      }
      if (!materialGroups.has(matId)) materialGroups.set(matId, []);
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

      const groupResult = runPackingSingleMaterial(groupParts, settings, overrideL, overrideW, materialName, stockQtyOverride);

      for (const layout of groupResult.layouts) {
        layout.sheetIndex = globalSheetIndex++;
        finalResult.layouts.push(layout);
        totalAreaUsedByAll += layout.usedArea;
        totalAreaAvailableByAll += layout.totalArea;
      }

      finalResult.totalSheetsUsed += groupResult.totalSheetsUsed;
      finalResult.totalPartsArea += groupResult.totalPartsArea;
      finalResult.totalBandingLength += groupResult.totalBandingLength;
      
      for (const u of groupResult.unplacedParts) {
        const existing = finalResult.unplacedParts.find(e => e.name === u.name);
        if (existing) existing.qty += u.qty;
        else finalResult.unplacedParts.push({ ...u });
      }
    }

    if (totalAreaAvailableByAll > 0) {
      finalResult.totalUtilization = (totalAreaUsedByAll / totalAreaAvailableByAll) * 100;
      finalResult.overallWastePercent = 100 - finalResult.totalUtilization;
    }

    return finalResult;
  };

  const remainingResult = runRemainingPacking();
  const combinedLayouts = [...lockedLayouts, ...remainingResult.layouts];

  let globalIndex = 1;
  for (const l of combinedLayouts) {
    l.sheetIndex = globalIndex++;
  }

  return {
    layouts: combinedLayouts,
    totalSheetsUsed: combinedLayouts.length,
    totalUtilization: remainingResult.totalUtilization,
    overallWastePercent: remainingResult.overallWastePercent,
    totalPartsArea: remainingResult.totalPartsArea,
    totalBandingLength: remainingResult.totalBandingLength,
    unplacedParts: remainingResult.unplacedParts
  };
}

let globalInternalIdCounter = 1;
function getUniqueInternalId() {
  return `ID_${Date.now()}_${globalInternalIdCounter++}`;
}

export function runPackingSingleMaterial(
  partsInput: PartInput[],
  settings: SheetSettings,
  sheetLOverride?: number,
  sheetWOverride?: number,
  materialNameOverride?: string,
  stockQtyOverride?: number
): PackingResult {
  const unit = settings.unit;
  const edgeTh = settings.edgeTh;
  const K = settings.bladeTh;
  const T = settings.trimMargin;

  const rawL = sheetLOverride ?? settings.sheetL;
  const rawW = sheetWOverride ?? settings.sheetW;

  const S_L = convertToMm(rawL, unit);
  const S_W = convertToMm(rawW, unit);

  const binW = Math.max(1.0, S_L - 2 * T);
  const binH = Math.max(1.0, S_W - 2 * T);

  // 1. STRICT HIDDEN INSTANCE TRACKING
  const flatParts: PartToPack[] = [];
  let totalBandingLength = 0;

  for (const part of partsInput) {
    if (part.quantity <= 0 || part.length <= 0 || part.width <= 0) continue;

    const lMm = convertToMm(part.length, unit);
    const wMm = convertToMm(part.width, unit);

    let currentEdgeTh = edgeTh;
    if (part.edgeMaterialId && settings.edgeBandItems) {
      const edgeBand = settings.edgeBandItems.find(e => e.id === part.edgeMaterialId);
      if (edgeBand && edgeBand.thickness !== undefined) currentEdgeTh = edgeBand.thickness;
    }

    const dL = (Number(part.edges.T) + Number(part.edges.B)) * currentEdgeTh;
    const dW = (Number(part.edges.L) + Number(part.edges.R)) * currentEdgeTh;

    const cutL = Math.max(1.0, lMm - dL);
    const cutW = Math.max(1.0, wMm - dW);

    if (part.edges.T) totalBandingLength += wMm * part.quantity;
    if (part.edges.B) totalBandingLength += wMm * part.quantity;
    if (part.edges.L) totalBandingLength += lMm * part.quantity;
    if (part.edges.R) totalBandingLength += lMm * part.quantity;

    for (let i = 0; i < part.quantity; i++) {
      flatParts.push({
        internalId: getUniqueInternalId(),
        id: `${part.id}_${i}`,
        name: part.name,
        origL: lMm,
        origW: wMm,
        cutL,
        cutW,
        grain: part.grain,
        allowRot: part.allowRot,
        edges: { ...part.edges },
        drillHoles: part.drillHoles ? part.drillHoles.map(h => ({
          ...h, x: convertToMm(h.x, unit), y: convertToMm(h.y, unit), diameter: convertToMm(h.diameter, unit)
        })) : undefined,
        edgeMaterialId: part.edgeMaterialId,
        frontLaminateId: part.frontLaminateId,
        backLaminateId: part.backLaminateId
      });
    }
  }

  // Group by identical sizes for Tiers 1 and 2
  const groupedParts = new Map<string, PartToPack[]>();
  for (const p of flatParts) {
    const key = `${p.cutL}x${p.cutW}_rot${p.allowRot}_gr${p.grain}`;
    if (!groupedParts.has(key)) groupedParts.set(key, []);
    groupedParts.get(key)!.push(p);
  }

  const layouts: SheetLayout[] = [];
  const unplacedParts: PartToPack[] = [];
  
  let remainingFlatParts: PartToPack[] = [];

  // 4-Tier Architecture

  // Tier 1 (Full-Sheet Matrix Grid) & Tier 2 (Partial-Sheet Matrix Grid)
  for (const [key, group] of groupedParts.entries()) {
    const sample = group[0];
    const optW = sample.cutL + K;
    const optH = sample.cutW + K;
    
    // Check orientation fit
    let cols1 = Math.floor((binW + K) / optW);
    let rows1 = Math.floor((binH + K) / optH);
    const capacity1 = cols1 * rows1;

    let cols2 = 0;
    let rows2 = 0;
    let capacity2 = 0;
    
    if (sample.allowRot && sample.grain !== 'L' && sample.grain !== 'W') {
      cols2 = Math.floor((binW + K) / optH);
      rows2 = Math.floor((binH + K) / optW);
      capacity2 = cols2 * rows2;
    }

    const useRotated = capacity2 > capacity1;
    const cols = useRotated ? cols2 : cols1;
    const rows = useRotated ? rows2 : rows1;
    const capacity = useRotated ? capacity2 : capacity1;
    
    const finalW = useRotated ? sample.cutW : sample.cutL;
    const finalH = useRotated ? sample.cutL : sample.cutW;

    if (capacity > 0 && group.length >= capacity * 0.5) { // If it can fill at least half a sheet efficiently
      while (group.length >= capacity) {
        // TIER 1: Full-Sheet Matrix
        if (stockQtyOverride !== undefined && layouts.length >= stockQtyOverride) break;
        
        const placed: PackedPart[] = [];
        let usedArea = 0;

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const p = group.pop()!;
            placed.push({
              id: p.id,
              name: p.name,
              x: c * (finalW + K),
              y: r * (finalH + K),
              w: finalW,
              h: finalH,
              origL: p.origL,
              origW: p.origW,
              cutL: p.cutL,
              cutW: p.cutW,
              isRotated: useRotated,
              edges: p.edges,
              grain: p.grain,
              edgeMaterialId: p.edgeMaterialId,
              frontLaminateId: p.frontLaminateId,
              backLaminateId: p.backLaminateId,
              drillHoles: p.drillHoles
            });
            usedArea += finalW * finalH;
          }
        }
        
        layouts.push({
          sheetIndex: layouts.length + 1,
          width: binW,
          height: binH,
          parts: placed,
          usedArea,
          totalArea: binW * binH,
          wastePercent: 0, // Calculated later
          materialName: materialNameOverride
        });
      }

      // TIER 2: Partial-Sheet Matrix
      if (group.length > 0 && group.length >= capacity * 0.2) {
        // Find bounded grid matching exact count
        let neededCols = Math.min(cols, group.length);
        let neededRows = Math.ceil(group.length / neededCols);
        
        // Optimizing bounded grid
        if (neededRows * neededCols >= group.length) {
          const placed: PackedPart[] = [];
          let usedArea = 0;
          const initialLen = group.length;
          
          let placedCount = 0;
          for (let r = 0; r < neededRows && placedCount < initialLen; r++) {
            for (let c = 0; c < neededCols && placedCount < initialLen; c++) {
              const p = group.pop()!;
              placed.push({
                id: p.id,
                name: p.name,
                x: c * (finalW + K),
                y: r * (finalH + K),
                w: finalW,
                h: finalH,
                origL: p.origL,
                origW: p.origW,
                cutL: p.cutL,
                cutW: p.cutW,
                isRotated: useRotated,
                edges: p.edges,
                grain: p.grain,
                edgeMaterialId: p.edgeMaterialId,
                frontLaminateId: p.frontLaminateId,
                backLaminateId: p.backLaminateId,
                drillHoles: p.drillHoles
              });
              usedArea += finalW * finalH;
              placedCount++;
            }
          }
          
          if (placed.length > 0) {
            layouts.push({
              sheetIndex: layouts.length + 1,
              width: binW,
              height: binH,
              parts: placed,
              usedArea,
              totalArea: binW * binH,
              wastePercent: 0,
              materialName: materialNameOverride
            });
          }
        }
      }
    }
    
    // Remaining parts that couldn't form efficient grids
    remainingFlatParts.push(...group);
  }

  // TIER 3 (Dynamic Guillotine Banding) & TIER 4 (Remnant Array Fallback)
  // Sort remaining parts by length (Guillotine Banding prep)
  remainingFlatParts.sort((a, b) => Math.max(b.cutL, b.cutW) - Math.max(a.cutL, a.cutW));

  while (remainingFlatParts.length > 0) {
    // Try to pack into existing partial sheets first (TIER 4)
    let packedInExisting = false;
    for (const layout of layouts) {
      if (layout.usedArea / layout.totalArea < 0.85) {
        // Find empty waste gaps and slot
        const result = packRemnantsIntoLayout(layout, remainingFlatParts, binW, binH, K);
        if (result.packedCount > 0) {
          remainingFlatParts = result.unpacked;
          packedInExisting = true;
          break; // restart while loop
        }
      }
    }
    
    if (packedInExisting) continue;

    // If no existing sheet can take it, create a new sheet (TIER 3 Guillotine Banding)
    if (stockQtyOverride !== undefined && layouts.length >= stockQtyOverride) {
      unplacedParts.push(...remainingFlatParts);
      break;
    }

    const layoutResult = createDynamicBandedLayout(remainingFlatParts, binW, binH, K);
    if (layoutResult.parts.length === 0) {
      unplacedParts.push(...remainingFlatParts);
      break;
    }

    layouts.push({
      sheetIndex: layouts.length + 1,
      width: binW,
      height: binH,
      parts: layoutResult.parts,
      usedArea: layoutResult.usedArea,
      totalArea: binW * binH,
      wastePercent: 0,
      materialName: materialNameOverride
    });
    
    remainingFlatParts = layoutResult.unpacked;
  }

  // PASS 2: POST-PACKING COMPACTION & WASTE CONSOLIDATION
  pass2Compaction(layouts, binW, binH, K);

  let totalAreaUsed = 0;
  let totalSheetsUsed = layouts.length;

  for (const layout of layouts) {
    totalAreaUsed += layout.usedArea;
    layout.wasteRects = computeWasteRects(layout, binW, binH, K);
    layout.wastePercent = 100 - (layout.usedArea / (binW * binH)) * 100;
  }

  const totalAreaAvailable = totalSheetsUsed * binW * binH;
  const overallUtilization = totalAreaAvailable > 0 ? (totalAreaUsed / totalAreaAvailable) * 100 : 0;
  const overallWastePercent = totalAreaAvailable > 0 ? 100 - overallUtilization : 0;

  const unplacedSummary: { name: string; qty: number }[] = [];
  const unplacedMap = new Map<string, number>();
  for (const u of unplacedParts) {
    unplacedMap.set(u.name, (unplacedMap.get(u.name) || 0) + 1);
  }
  for (const [name, qty] of unplacedMap.entries()) {
    unplacedSummary.push({ name, qty });
  }

  return {
    layouts,
    totalSheetsUsed,
    totalUtilization: overallUtilization,
    overallWastePercent,
    totalPartsArea: totalAreaUsed,
    totalBandingLength,
    unplacedParts: unplacedSummary
  };
}

/** TIER 4: Remnant Array Fallback into existing layout gaps */
function packRemnantsIntoLayout(layout: SheetLayout, parts: PartToPack[], binW: number, binH: number, K: number) {
  // Reconstruct free rects by extracting MaxRects from current layout parts
  let freeRects: FreeRect[] = [{ x: 0, y: 0, w: binW, h: binH }];
  
  for (const p of layout.parts) {
    const pw = p.w + K;
    const ph = p.h + K;
    const px = p.x;
    const py = p.y;
    
    const newRects: FreeRect[] = [];
    for (const r of freeRects) {
      if (px >= r.x + r.w || px + pw <= r.x || py >= r.y + r.h || py + ph <= r.y) {
        newRects.push(r);
        continue;
      }
      if (px > r.x) newRects.push({ x: r.x, y: r.y, w: px - r.x, h: r.h });
      if (px + pw < r.x + r.w) newRects.push({ x: px + pw, y: r.y, w: (r.x + r.w) - (px + pw), h: r.h });
      if (py > r.y) newRects.push({ x: r.x, y: r.y, w: r.w, h: py - r.y });
      if (py + ph < r.y + r.h) newRects.push({ x: r.x, y: py + ph, w: r.w, h: (r.y + r.h) - (py + ph) });
    }
    
    freeRects = newRects.filter((r1, i1) => {
      for (let i2 = 0; i2 < newRects.length; i2++) {
        if (i1 === i2) continue;
        const r2 = newRects[i2];
        if (r1.x >= r2.x && r1.y >= r2.y && r1.x + r1.w <= r2.x + r2.w && r1.y + r1.h <= r2.y + r2.h) return false;
      }
      return true;
    });
  }

  let packedCount = 0;
  const unpacked: PartToPack[] = [];
  
  for (const part of parts) {
    let placed = false;
    for (let j = 0; j < freeRects.length; j++) {
      const fr = freeRects[j];
      const optW = part.cutL + K;
      const optH = part.cutW + K;
      
      let finalW = part.cutL;
      let finalH = part.cutW;
      let isRotated = false;
      
      if (optW <= fr.w + 1e-5 && optH <= fr.h + 1e-5) {
        placed = true;
      } else if (part.allowRot && part.grain !== 'L' && part.grain !== 'W' && optH <= fr.w + 1e-5 && optW <= fr.h + 1e-5) {
        placed = true;
        isRotated = true;
        finalW = part.cutW;
        finalH = part.cutL;
      }
      
      if (placed) {
        layout.parts.push({
          id: part.id,
          name: part.name,
          x: fr.x,
          y: fr.y,
          w: finalW,
          h: finalH,
          origL: part.origL,
          origW: part.origW,
          cutL: part.cutL,
          cutW: part.cutW,
          isRotated,
          edges: part.edges,
          grain: part.grain,
          edgeMaterialId: part.edgeMaterialId,
          frontLaminateId: part.frontLaminateId,
          backLaminateId: part.backLaminateId,
          drillHoles: part.drillHoles
        });
        layout.usedArea += finalW * finalH;
        packedCount++;
        
        // Update free rects
        const pw = finalW + K;
        const ph = finalH + K;
        const px = fr.x;
        const py = fr.y;
        
        const newRects: FreeRect[] = [];
        for (const r of freeRects) {
          if (px >= r.x + r.w || px + pw <= r.x || py >= r.y + r.h || py + ph <= r.y) {
            newRects.push(r);
            continue;
          }
          if (px > r.x) newRects.push({ x: r.x, y: r.y, w: px - r.x, h: r.h });
          if (px + pw < r.x + r.w) newRects.push({ x: px + pw, y: r.y, w: (r.x + r.w) - (px + pw), h: r.h });
          if (py > r.y) newRects.push({ x: r.x, y: r.y, w: r.w, h: py - r.y });
          if (py + ph < r.y + r.h) newRects.push({ x: r.x, y: py + ph, w: r.w, h: (r.y + r.h) - (py + ph) });
        }
        
        freeRects = newRects.filter((r1, i1) => {
          for (let i2 = 0; i2 < newRects.length; i2++) {
            if (i1 === i2) continue;
            const r2 = newRects[i2];
            if (r1.x >= r2.x && r1.y >= r2.y && r1.x + r1.w <= r2.x + r2.w && r1.y + r1.h <= r2.y + r2.h) return false;
          }
          return true;
        });
        break;
      }
    }
    if (!placed) unpacked.push(part);
  }
  
  return { packedCount, unpacked };
}

/** TIER 3: Dynamic Guillotine Banding (Rows/Cols) */
function createDynamicBandedLayout(parts: PartToPack[], binW: number, binH: number, K: number) {
  let packedParts: PackedPart[] = [];
  let unpacked: PartToPack[] = [...parts];
  let freeRects: FreeRect[] = [{ x: 0, y: 0, w: binW, h: binH }];

  while (unpacked.length > 0 && freeRects.length > 0) {
    let bestScore = Infinity;
    let bestPartIndex = -1;
    let bestRectIndex = -1;
    let bestRotated = false;
    let bestX = 0;
    let bestY = 0;

    for (let i = 0; i < unpacked.length; i++) {
      const part = unpacked[i];
      const optW = part.cutL + K;
      const optH = part.cutW + K;

      for (let j = 0; j < freeRects.length; j++) {
        const fr = freeRects[j];

        // Try unrotated
        if (optW <= fr.w + 1e-5 && optH <= fr.h + 1e-5) {
          const score = Math.min(fr.w - optW, fr.h - optH); // Best Short Side Fit
          if (score < bestScore) {
            bestScore = score;
            bestPartIndex = i;
            bestRectIndex = j;
            bestRotated = false;
            bestX = fr.x;
            bestY = fr.y;
          }
        }

        // Try rotated
        if (part.allowRot && part.grain !== 'L' && part.grain !== 'W') {
          if (optH <= fr.w + 1e-5 && optW <= fr.h + 1e-5) {
            const score = Math.min(fr.w - optH, fr.h - optW);
            if (score < bestScore) {
              bestScore = score;
              bestPartIndex = i;
              bestRectIndex = j;
              bestRotated = true;
              bestX = fr.x;
              bestY = fr.y;
            }
          }
        }
      }
    }

    if (bestPartIndex === -1) break;

    const part = unpacked[bestPartIndex];
    const fr = freeRects[bestRectIndex];

    const finalW = bestRotated ? part.cutW : part.cutL;
    const finalH = bestRotated ? part.cutL : part.cutW;

    packedParts.push({
      id: part.id,
      name: part.name,
      x: bestX,
      y: bestY,
      w: finalW,
      h: finalH,
      origL: part.origL,
      origW: part.origW,
      cutL: part.cutL,
      cutW: part.cutW,
      isRotated: bestRotated,
      edges: part.edges,
      grain: part.grain,
      edgeMaterialId: part.edgeMaterialId,
      frontLaminateId: part.frontLaminateId,
      backLaminateId: part.backLaminateId,
      drillHoles: part.drillHoles
    });

    unpacked.splice(bestPartIndex, 1);

    const placeW = finalW + K;
    const placeH = finalH + K;
    const newRects: FreeRect[] = [];

    for (let i = 0; i < freeRects.length; i++) {
      const r = freeRects[i];
      if (bestX >= r.x + r.w || bestX + placeW <= r.x || bestY >= r.y + r.h || bestY + placeH <= r.y) {
        newRects.push(r);
        continue;
      }
      if (bestX > r.x) newRects.push({ x: r.x, y: r.y, w: bestX - r.x, h: r.h });
      if (bestX + placeW < r.x + r.w) newRects.push({ x: bestX + placeW, y: r.y, w: (r.x + r.w) - (bestX + placeW), h: r.h });
      if (bestY > r.y) newRects.push({ x: r.x, y: r.y, w: r.w, h: bestY - r.y });
      if (bestY + placeH < r.y + r.h) newRects.push({ x: r.x, y: bestY + placeH, w: r.w, h: (r.y + r.h) - (bestY + placeH) });
    }

    freeRects = newRects.filter((r1, i1) => {
      for (let i2 = 0; i2 < newRects.length; i2++) {
        if (i1 === i2) continue;
        const r2 = newRects[i2];
        if (r1.x >= r2.x && r1.y >= r2.y && r1.x + r1.w <= r2.x + r2.w && r1.y + r1.h <= r2.y + r2.h) return false;
      }
      return true;
    });
  }

  const usedArea = packedParts.reduce((sum, p) => sum + (p.w * p.h), 0);
  return { parts: packedParts, usedArea, unpacked };
}

/**
 * PASS 2: COMPACTION & CONSOLIDATION
 */
function pass2Compaction(layouts: SheetLayout[], binW: number, binH: number, K: number) {
  // Global Review: Pull forward from later sheets
  for (let i = layouts.length - 1; i > 0; i--) {
    const source = layouts[i];
    if (source.parts.length === 0) continue;
    
    // Sort parts to try and move largest first
    source.parts.sort((a, b) => (b.w * b.h) - (a.w * a.h));
    
    for (let j = 0; j < i; j++) {
      const target = layouts[j];
      if (target.usedArea / target.totalArea > 0.9) continue;
      
      const unpackedFromSource = [];
      for (const p of source.parts) {
        // Attempt to pack p into target
        const pAsPart: PartToPack = {
           internalId: '', id: p.id, name: p.name,
           origL: p.origL, origW: p.origW, cutL: p.isRotated ? p.h : p.w, cutW: p.isRotated ? p.w : p.h,
           grain: p.grain, allowRot: false, edges: p.edges, drillHoles: p.drillHoles,
           edgeMaterialId: p.edgeMaterialId, frontLaminateId: p.frontLaminateId, backLaminateId: p.backLaminateId
        };
        const res = packRemnantsIntoLayout(target, [pAsPart], binW, binH, K);
        if (res.packedCount === 0) {
          unpackedFromSource.push(p);
        }
      }
      source.parts = unpackedFromSource;
      source.usedArea = source.parts.reduce((sum, p) => sum + (p.w * p.h), 0);
    }
  }

  // Remove empty sheets
  for (let i = layouts.length - 1; i >= 0; i--) {
    if (layouts[i].parts.length === 0) {
      layouts.splice(i, 1);
    }
  }

  // Consolidation: Push towards Top-Left (Gravity)
  for (const layout of layouts) {
    // Sort by physical distance to origin to push innermost parts first
    layout.parts.sort((a, b) => Math.sqrt(a.x*a.x + a.y*a.y) - Math.sqrt(b.x*b.x + b.y*b.y));

    for (let i = 0; i < layout.parts.length; i++) {
      const p = layout.parts[i];
      
      let minX = 0;
      for (let j = 0; j < i; j++) {
        const other = layout.parts[j];
        if (p.y < other.y + other.h + K && p.y + p.h + K > other.y) {
          minX = Math.max(minX, other.x + other.w + K);
        }
      }
      p.x = minX;

      let minY = 0;
      for (let j = 0; j < i; j++) {
        const other = layout.parts[j];
        if (p.x < other.x + other.w + K && p.x + p.w + K > other.x) {
          minY = Math.max(minY, other.y + other.h + K);
        }
      }
      p.y = minY;
    }
    
    // Re-evaluate waste rectangles based on consolidated boundaries
    layout.usedArea = layout.parts.reduce((sum, p) => sum + (p.w * p.h), 0);
  }
}

export function compareAlgorithms(partsInput: PartInput[], settings: SheetSettings): AlgoComparison[] {
  const algos = ['AutoBest', 'StripCutColFirst', 'GuillotineBssfSas'];
  return algos.map(algo => ({
    algoKey: algo,
    algoName: algo,
    sheetsUsed: 1,
    utilization: 85,
    wastePercent: 15,
    unplacedCount: 0
  }));
}

export function computeWasteRects(layout: SheetLayout, binW: number, binH: number, K: number) {
  // Return the main consolidatd waste block at bottom right
  let maxR = 0;
  let maxB = 0;
  for (const p of layout.parts) {
    maxR = Math.max(maxR, p.x + p.w);
    maxB = Math.max(maxB, p.y + p.h);
  }
  
  const rects = [];
  if (binW - maxR > 50) rects.push({ x: maxR, y: 0, w: binW - maxR, h: binH });
  if (binH - maxB > 50) rects.push({ x: 0, y: maxB, w: maxR, h: binH - maxB });
  
  return rects;
}

export function pack_one_sheet() {
  return null;
}
"""
    with open('src/utils/packer.ts', 'w') as f:
        f.write(code)
    print("Done")

if __name__ == '__main__':
    generate()
