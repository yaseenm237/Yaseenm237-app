import * as Comlink from 'comlink';
import { runPacking, convertToMm, compareAlgorithms } from './utils/packer';
import { KDTree } from './utils/KdTree';

// Bitwise helper: check if pixel rectangular area is unoccupied
function isAreaEmpty(
  startX: number,
  startY: number,
  w: number,
  h: number,
  gridWidth: number,
  gridHeight: number,
  grid: Uint32Array
): boolean {
  if (startX < 0 || startY < 0 || startX + w > gridWidth || startY + h > gridHeight) {
    return false;
  }
  for (let y = startY; y < startY + h; y++) {
    const rowOffset = y * gridWidth;
    for (let x = startX; x < startX + w; x++) {
      const bitIndex = rowOffset + x;
      const wordIndex = bitIndex >> 5;
      const bit = 1 << (bitIndex & 31);
      if ((grid[wordIndex] & bit) !== 0) {
        return false;
      }
    }
  }
  return true;
}

// Bitwise helper: mark rectangular area as occupied in our grid
function markOccupied(
  startX: number,
  startY: number,
  w: number,
  h: number,
  gridWidth: number,
  gridHeight: number,
  grid: Uint32Array
) {
  const endY = Math.min(gridHeight, startY + h);
  const endX = Math.min(gridWidth, startX + w);
  for (let y = Math.max(0, startY); y < endY; y++) {
    const rowOffset = y * gridWidth;
    for (let x = Math.max(0, startX); x < endX; x++) {
      const bitIndex = rowOffset + x;
      const wordIndex = bitIndex >> 5;
      grid[wordIndex] |= (1 << (bitIndex & 31));
    }
  }
}

/**
 * Perform micro-nesting using an ultra-fast bitwise pixel grid.
 * This takes any remaining unplaced parts and tries to pack them into empty space 
 * on existing sheets, utilizing pixel-level collision detection.
 */
function performMicroNesting(
  layouts: any[],
  unplacedPartsList: any[],
  settings: any,
  allPartsInput: any[]
): any[] {
  // Deep copy layouts so we don't mutate input objects
  const newLayouts = JSON.parse(JSON.stringify(layouts));
  
  // Convert unplaced parts list to a flat list of individual pieces to pack
  const flatUnplaced: any[] = [];
  const unit = settings.unit || 'Inch';
  const edgeTh = settings.edgeTh || 2.0;
  const K = settings.bladeTh || 3.0; // Kerf in mm

  for (const item of unplacedPartsList) {
    const origPart = allPartsInput.find(p => p.name === item.name);
    if (!origPart) continue;
    
    const lMm = convertToMm(origPart.length, unit);
    const wMm = convertToMm(origPart.width, unit);
    
    // Adjust for edge banding
    const hasT = origPart.edges?.T;
    const hasB = origPart.edges?.B;
    const hasL = origPart.edges?.L;
    const hasR = origPart.edges?.R;
    
    let currentEdgeTh = edgeTh;
    if (origPart.edgeMaterialId && settings.edgeBandItems) {
      const edgeBand = settings.edgeBandItems.find((e: any) => e.id === origPart.edgeMaterialId);
      if (edgeBand && edgeBand.thickness !== undefined) {
        currentEdgeTh = edgeBand.thickness;
      }
    }
    
    const dL = (Number(hasT) + Number(hasB)) * currentEdgeTh;
    const dW = (Number(hasL) + Number(hasR)) * currentEdgeTh;
    
    const cutL = Math.max(1.0, lMm - dL);
    const cutW = Math.max(1.0, wMm - dW);
    
    // Width and height with kerf
    const optW = cutL + K;
    const optH = cutW + K;
    
    for (let q = 0; q < item.qty; q++) {
      flatUnplaced.push({
        id: `${origPart.id}_micro_${q}_${Math.random().toString(36).substring(2, 6)}`,
        name: origPart.name,
        origL: lMm,
        origW: wMm,
        cutL,
        cutW,
        optW,
        optH,
        grain: origPart.grain || 'N',
        allowRot: origPart.allowRot ?? true,
        edges: origPart.edges || { T: false, B: false, L: false, R: false },
        drillHoles: origPart.drillHoles
      });
    }
  }
  
  if (flatUnplaced.length === 0) {
    return newLayouts;
  }
  
  // Sort descending by area to optimize packing efficiency
  flatUnplaced.sort((a, b) => (b.cutL * b.cutW) - (a.cutL * a.cutW));
  
  const scale = 10; // 10mm (1cm) per cell for fast & precise pixel-level packing
  
  for (const part of flatUnplaced) {
    let placed = false;
    
    for (const layout of newLayouts) {
      const binW = layout.width;
      const binH = layout.height;
      
      const gridWidth = Math.ceil(binW / scale);
      const gridHeight = Math.ceil(binH / scale);
      const wordCount = Math.ceil((gridWidth * gridHeight) / 32);
      const grid = new Uint32Array(wordCount);
      
      // Mark existing parts on this layout as occupied
      for (const p of layout.parts) {
        const px = Math.floor(p.x / scale);
        const py = Math.floor(p.y / scale);
        const pw = Math.ceil(p.w / scale);
        const ph = Math.ceil(p.h / scale);
        markOccupied(px, py, pw, ph, gridWidth, gridHeight, grid);
      }
      
      // Mark trim margins of the sheet as occupied
      const T = settings.trimMargin || 0;
      if (T > 0) {
        const trimCells = Math.ceil(T / scale);
        markOccupied(0, 0, trimCells, gridHeight, gridWidth, gridHeight, grid);
        markOccupied(gridWidth - trimCells, 0, trimCells, gridHeight, gridWidth, gridHeight, grid);
        markOccupied(0, 0, gridWidth, trimCells, gridWidth, gridHeight, grid);
        markOccupied(0, gridHeight - trimCells, gridWidth, trimCells, gridWidth, gridHeight, grid);
      }
      
      // Determine possible orientations based on grain / allowRot
      const orientations: { w: number, h: number, rot: boolean }[] = [];
      const strictlyRespect = settings.respectGrain ?? true;
      
      if (strictlyRespect) {
        if (part.grain === 'L') {
          orientations.push({ w: part.optW, h: part.optH, rot: false });
        } else if (part.grain === 'W') {
          orientations.push({ w: part.optH, h: part.optW, rot: true });
        } else {
          orientations.push({ w: part.optW, h: part.optH, rot: false });
          if (part.allowRot) {
            orientations.push({ w: part.optH, h: part.optW, rot: true });
          }
        }
      } else {
        orientations.push({ w: part.optW, h: part.optH, rot: false });
        if (part.allowRot) {
          orientations.push({ w: part.optH, h: part.optW, rot: true });
        }
      }
      
      let bestX = -1;
      let bestY = -1;
      let bestRot = false;
      let bestW = 0;
      let bestH = 0;
      
      // Standard Bottom-Left scan (or top-left depending on Y/X layout)
      outerScan: for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
          for (const opt of orientations) {
            const gw = Math.ceil(opt.w / scale);
            const gh = Math.ceil(opt.h / scale);
            
            if (isAreaEmpty(x, y, gw, gh, gridWidth, gridHeight, grid)) {
              bestX = x * scale;
              bestY = y * scale;
              bestRot = opt.rot;
              bestW = opt.w;
              bestH = opt.h;
              break outerScan;
            }
          }
        }
      }
      
      if (bestX !== -1) {
        // Place part in this sheet layout
        layout.parts.push({
          id: part.id,
          name: part.name,
          x: bestX,
          y: bestY,
          w: bestW,
          h: bestH,
          origL: part.origL,
          origW: part.origW,
          cutL: part.cutL,
          cutW: part.cutW,
          isRotated: bestRot,
          edges: part.edges,
          grain: part.grain,
          drillHoles: part.drillHoles
        });
        
        // Update layout statistics
        layout.usedArea += part.cutL * part.cutW;
        layout.wastePercent = ((layout.totalArea - layout.usedArea) / layout.totalArea) * 100;
        
        placed = true;
        break; // Successfully placed, move to next unplaced part
      }
    }
    
    if (placed) {
      // Decrement the quantity in our unplacedPartsList
      const unplacedItem = unplacedPartsList.find(u => u.name === part.name);
      if (unplacedItem) {
        unplacedItem.qty--;
      }
    }
  }
  
  return newLayouts;
}

const engine = {
  async runPackingJS(parts: any, settings: any) {
    try {
      console.log("[Worker] Running JS optimizer with Micro-Nesting...");
      
      // Phase 1: Macro Nesting (MaxRects & Guillotine handled via runPacking)
      const res = runPacking(parts, settings);
      
      // Phase 2: Micro-Nesting (Pixel-level packing for any unplaced parts)
      if (res.unplacedParts && res.unplacedParts.length > 0) {
        console.log(`[Worker] Micro-nesting running for ${res.unplacedParts.length} unplaced part types...`);
        const originalUnplacedCount = res.unplacedParts.reduce((sum: number, p: any) => sum + p.qty, 0);
        
        res.layouts = performMicroNesting(res.layouts, res.unplacedParts, settings, parts);
        
        // Filter out fully nested parts (qty <= 0)
        res.unplacedParts = res.unplacedParts.filter((p: any) => p.qty > 0);
        const finalUnplacedCount = res.unplacedParts.reduce((sum: number, p: any) => sum + p.qty, 0);
        console.log(`[Worker] Micro-nesting placed ${originalUnplacedCount - finalUnplacedCount} pieces!`);
        
        // Re-calculate totals after micro nesting
        let totalPartsArea = 0;
        let totalRawAreaUsed = 0;
        
        for (const layout of res.layouts) {
          totalRawAreaUsed += layout.totalArea;
          for (const p of layout.parts) {
            totalPartsArea += p.cutL * p.cutW;
          }
        }
        
        res.totalPartsArea = totalPartsArea;
        res.totalSheetsUsed = res.layouts.length;
        const totalUtilization = totalRawAreaUsed > 0 ? (totalPartsArea / totalRawAreaUsed) * 100 : 0;
        res.totalUtilization = totalUtilization;
        res.overallWastePercent = Math.max(0, Math.min(100, 100 - totalUtilization));
      }
      
      return { status: 'success', result: res };
    } catch (error) {
      console.error("[Worker] Error in runPackingJS:", error);
      return {
        status: 'error',
        error: String(error),
      };
    }
  },
  async compareAlgorithmsJS(parts: any, settings: any) {
    try {
      console.log("[Worker] Running algorithm comparison...");
      const res = compareAlgorithms(parts, settings);
      return { status: 'success', result: res };
    } catch (error) {
      console.error("[Worker] Error in compareAlgorithmsJS:", error);
      return { status: 'error', error: String(error) };
    }
  }
};

Comlink.expose(engine);
