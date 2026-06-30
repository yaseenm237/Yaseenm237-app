/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from 'jspdf';
import { PartInput, SheetSettings, PackingResult, PackedPart, SheetLayout } from '../types';
import { convertToMm, convertMmToUnit } from './packer';

/**
 * Maps common Hindi terminology in carpentry to professional English translations
 * and strips any non-ASCII characters to avoid jsPDF Helvetica render block issues.
 */
function sanitizeText(str: string): string {
  if (!str) return '';
  let clean = str;
  // Replace typical Devanagari/Hindi additions with clean English terms
  clean = clean.replace(/बायाँ\/दायाँ/g, 'Left/Right');
  clean = clean.replace(/बायाँ/g, 'Left');
  clean = clean.replace(/दायाँ/g, 'Right');
  clean = clean.replace(/ऊपर\/नीचे/g, 'Top/Bottom');
  clean = clean.replace(/खाँचे/g, 'Slots');
  clean = clean.replace(/दरवाजे/g, 'Doors');
  clean = clean.replace(/किवाड़/g, 'Doors');
  clean = clean.replace(/दराज बाहरी/g, 'Drawer Outer');
  clean = clean.replace(/दराज/g, 'Drawer');
  clean = clean.replace(/दराज़/g, 'Drawer');
  clean = clean.replace(/रैक/g, 'Rack');
  clean = clean.replace(/साइड पैनल/g, 'Side Panel');
  clean = clean.replace(/नीचे का बोर्ड/g, 'Bottom Board');
  clean = clean.replace(/साइड्स/g, 'Sides');
  clean = clean.replace(/अलमारी रैक/g, 'Cabinet Rack');

  // Strip out any remaining non-ASCII characters (e.g. general Devanagari ranges)
  clean = clean.replace(/[^\x00-\x7F]/g, '');

  // Strip empty parentheses like "()", "( )", "(-)" or trailing/leading dashes/slashes inside parentheses
  clean = clean.replace(/\(\s*[\/\-]?\s*\)/g, '');
  
  // Clean up any double spaces and trim
  clean = clean.replace(/\s+/g, ' ').trim();
  return clean;
}

/**
 * Formats a raw value in millimeters into the target unit with nice formatting
 */
function formatDim(valueMm: number, unit: 'Inch' | 'CM' | 'MM'): string {
  const val = convertMmToUnit(valueMm, unit);
  return `${val.toFixed(1)}${unit === 'Inch' ? '"' : ' ' + unit}`;
}

/**
 * Generates and downloads a complete, highly-polished workshop blueprint PDF.
 */
export function generatePdfReport(
  parts: PartInput[],
  settings: SheetSettings,
  result: PackingResult,
  language: 'English' | 'Hindi'
) {
  const isHindi = language === 'Hindi';
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin; // 180mm

  let currentPageNum = 1;

  // Add standard header/footer layout to a page
  const addHeaderFooter = (pageTitle: string) => {
    // Primary Header Background Band
    doc.setFillColor(30, 41, 59); // slate-800
    doc.rect(0, 0, pageWidth, 12, 'F');

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text("SMART CARPENTRY SYSTEM  |  WORKSHOP BLUEPRINT", margin, 7.5);

    doc.setFont('helvetica', 'normal');
    doc.text(pageTitle.toUpperCase(), pageWidth - margin, 7.5, { align: 'right' });

    // Bottom Footer Line
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    // Footer text
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, margin, pageHeight - 8);
    doc.text(`Page ${currentPageNum}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
  };

  // Helper to draw vertical double-headed arrow vectors for grain indicators
  const drawVerticalGrainArrow = (x: number, y: number, len = 3.5) => {
    doc.setDrawColor(14, 165, 233); // sky-500
    doc.setLineWidth(0.2);
    // Vertical stem line
    doc.line(x, y - len / 2, x, y + len / 2);
    // Top arrow head
    doc.line(x - 0.5, y - len / 2 + 0.5, x, y - len / 2);
    doc.line(x + 0.5, y - len / 2 + 0.5, x, y - len / 2);
    // Bottom arrow head
    doc.line(x - 0.5, y + len / 2 - 0.5, x, y + len / 2);
    doc.line(x + 0.5, y + len / 2 - 0.5, x, y + len / 2);
  };

  // Helper to draw horizontal double-headed arrow vectors for grain indicators
  const drawHorizontalGrainArrow = (x: number, y: number, len = 3.5) => {
    doc.setDrawColor(14, 165, 233); // sky-500
    doc.setLineWidth(0.2);
    // Horizontal stem line
    doc.line(x - len / 2, y, x + len / 2, y);
    // Left arrow head
    doc.line(x - len / 2 + 0.5, y - 0.5, x - len / 2, y);
    doc.line(x - len / 2 + 0.5, y + 0.5, x - len / 2, y);
    // Right arrow head
    doc.line(x + len / 2 - 0.5, y - 0.5, x + len / 2, y);
    doc.line(x + len / 2 - 0.5, y + 0.5, x + len / 2, y);
  };

  // Helper to draw text inside part outlines with automatic sizing and positioning
  const drawCenteredText = (
    text: string,
    rx: number,
    ry: number,
    rw: number,
    rh: number,
    fontSize = 8,
    color = [30, 41, 59]
  ) => {
    doc.setFontSize(fontSize);
    doc.setTextColor(color[0], color[1], color[2]);
    const textWidth = doc.getTextWidth(text);
    
    if (textWidth < rw - 2 && fontSize >= 4) {
      const tx = rx + (rw - textWidth) / 2;
      const ty = ry + rh / 2 + (fontSize * 0.35) / 2; // Approximate text height adjustment
      doc.text(text, tx, ty);
    } else if (fontSize > 4) {
      drawCenteredText(text, rx, ry, rw, rh, fontSize - 1, color);
    }
  };

  // --- PAGE 1: PROJECT METRICS & CUT LIST SUMMARY ---
  addHeaderFooter(isHindi ? "परियोजना सारांश (Summary)" : "Project Summary");

  let y = 24;

  // Main Report Title block
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text("Cutting & Optimization Report", margin, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(
    isHindi 
      ? "यह रिपोर्ट स्वचालित पैकिंग अनुकूलन एल्गोरिदम और सामग्री विनिर्देशों के आधार पर तैयार की गई है।"
      : "This technical layout report was computed using industrial 2D nesting models to minimize wood waste.",
    margin,
    y
  );
  y += 10;

  // Key stats Bento Boxes
  // We draw 3 columns: Sheets Nested, Efficiency %, Total Waste
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.3);

  // Box 1: Sheets Used
  doc.setFillColor(248, 250, 252); // slate-50
  doc.rect(margin, y, 56, 22, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text("SHEETS NESTED", margin + 4, y + 6);
  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.text(`${result.totalSheetsUsed} Sheets`, margin + 4, y + 15);

  // Box 2: Efficiency (Setting fill color explicitly to avoid last-state bleed)
  doc.setFillColor(248, 250, 252); // slate-50
  doc.rect(margin + 62, y, 56, 22, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text("EFFICIENCY SCORE", margin + 62 + 4, y + 6);
  doc.setFontSize(14);
  doc.setTextColor(16, 185, 129); // emerald-500
  doc.text(`${result.totalUtilization.toFixed(1)}%`, margin + 62 + 4, y + 15);

  // Box 3: Total Waste (Setting fill color explicitly to avoid last-state bleed)
  doc.setFillColor(248, 250, 252); // slate-50
  doc.rect(margin + 124, y, 56, 22, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text("OVERALL WASTE", margin + 124 + 4, y + 6);
  doc.setFontSize(14);
  doc.setTextColor(79, 70, 229); // indigo-600
  doc.text(`${result.overallWastePercent.toFixed(1)}%`, margin + 124 + 4, y + 15);

  y += 28;

  // Settings & Parameters details block
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("Material & Saw Settings", margin, y);
  y += 5;

  doc.setDrawColor(241, 245, 249); // slate-100
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105); // slate-600

  // Column 1
  doc.setFont('helvetica', 'bold');
  doc.text("Stock Material:", margin, y);
  doc.setFont('helvetica', 'normal');
  const hasMultiple = (settings.stockItems?.length || 0) > 1;
  doc.text(hasMultiple ? 'Multiple boards' : `${settings.sheetL} x ${settings.sheetW} ${settings.unit}`, margin + 28, y);

  doc.setFont('helvetica', 'bold');
  doc.text("Blade Kerf (Th.):", margin, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${settings.bladeTh} mm`, margin + 28, y + 5);

  // Column 2
  doc.setFont('helvetica', 'bold');
  doc.text("Trim Margin:", margin + 65, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`${settings.trimMargin} mm`, margin + 65 + 32, y);

  doc.setFont('helvetica', 'bold');
  doc.text("Banding Thickness:", margin + 65, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${settings.edgeTh} mm`, margin + 65 + 32, y + 5);

  // Column 3
  doc.setFont('helvetica', 'bold');
  doc.text("Algorithm:", margin + 130, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`${settings.algorithm}`, margin + 130 + 18, y);

  doc.setFont('helvetica', 'bold');
  doc.text("Est. Sheet Cost:", margin + 130, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(`$${settings.sheetCost.toFixed(2)}`, margin + 130 + 24, y + 5);

  y += 16;

  // Primary Cutting List Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(isHindi ? "कटिंग सूची (Required Cutting List)" : "Required Cutting List", margin, y);
  y += 5;

  doc.setDrawColor(241, 245, 249);
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  // Table Header
  doc.setFillColor(241, 245, 249); // slate-100
  doc.rect(margin, y, contentWidth, 7, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85); // slate-700
  
  doc.text("PART ID / NAME", margin + 4, y + 4.8);
  if (hasMultiple) {
    doc.text("MATERIAL", margin + 45, y + 4.8);
  }
  doc.text("QTY", margin + 70, y + 4.8);
  doc.text("DIMENSIONS", margin + 85, y + 4.8);
  doc.text("GRAIN TYPE", margin + 120, y + 4.8);
  doc.text("EDGE BANDING (T-B-L-R)", margin + 145, y + 4.8);
  
  y += 7;

  // Table rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);

  // Group parts by identical properties
  const groupedGlobalParts = new Map<string, typeof parts[0] & { totalQty: number, displayNames: Set<string> }>();
  parts.forEach(p => {
    if (p.quantity <= 0) return;
    const matName = p.materialId ? (settings.stockItems?.find(s => s.id === p.materialId)?.name || 'Default') : 'Default';
    
    // Create a key based on identical properties, ignoring names for grouping if everything else is identical
    const edgesKey = [p.edges.T, p.edges.B, p.edges.L, p.edges.R].join('-');
    const key = `${p.length}x${p.width}_${p.grain}_${matName}_${edgesKey}`;
    
    if (!groupedGlobalParts.has(key)) {
      groupedGlobalParts.set(key, { ...p, totalQty: 0, displayNames: new Set() });
    }
    const group = groupedGlobalParts.get(key)!;
    group.totalQty += p.quantity;
    group.displayNames.add(p.name || 'Part');
  });

  Array.from(groupedGlobalParts.values()).forEach((part, index) => {
    // Check page overflow for global parts list
    if (y > 270) {
      doc.addPage();
      currentPageNum++;
      addHeaderFooter(isHindi ? 'आवश्यक कटिंग सूची (जारी)' : 'Required Cutting List (Cont.)');
      y = 25;
      
      // redraw table header
      doc.setFillColor(241, 245, 249);
      doc.rect(margin, y, contentWidth, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      doc.text("PART ID / NAME", margin + 4, y + 4.8);
      if (hasMultiple) {
        doc.text("MATERIAL", margin + 45, y + 4.8);
      }
      doc.text("QTY", margin + 70, y + 4.8);
      doc.text("DIMENSIONS", margin + 85, y + 4.8);
      doc.text("GRAIN TYPE", margin + 120, y + 4.8);
      doc.text("EDGE BANDING (T-B-L-R)", margin + 145, y + 4.8);
      y += 8;
    }

    // Zebra striping
    if (index % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, y, contentWidth, 6.5, 'F');
    }

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    // Sanitize part names to cleanly translate and remove Devanagari characters
    const names = Array.from(part.displayNames).map(sanitizeText).join(', ');
    const displayName = names.length > 25 ? names.substring(0, 22) + '...' : names;
    doc.text(displayName, margin + 4, y + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    
    if (hasMultiple) {
      let matName = "Default";
      if (part.materialId) {
        const stockItem = settings.stockItems?.find(s => s.id === part.materialId);
        if (stockItem) matName = stockItem.name;
      }
      doc.text(sanitizeText(matName), margin + 45, y + 4.5);
    }

    doc.text(`${part.totalQty}`, margin + 70, y + 4.5);
    doc.text(`${part.length} x ${part.width} ${settings.unit}`, margin + 85, y + 4.5);

    // Grain - Standard labels without unicode rendering issues
    let grainStr = "None";
    if (part.grain === 'L') grainStr = "Vertical";
    if (part.grain === 'W') grainStr = "Horizontal";
    doc.text(grainStr, margin + 120, y + 4.5);

    // Edges T B L R
    const edgesText = [
      part.edges.T ? 'Top' : '',
      part.edges.B ? 'Bot' : '',
      part.edges.L ? 'Left' : '',
      part.edges.R ? 'Right' : ''
    ].filter(Boolean).join(', ') || 'None';
    doc.text(edgesText, margin + 145, y + 4.5);

    y += 6.5;
  });

  // Check if there are unplaced parts
  if (result.unplacedParts && result.unplacedParts.length > 0) {
    y += 5;
    doc.setFillColor(254, 242, 242); // light red
    doc.setDrawColor(254, 202, 202);
    doc.rect(margin, y, contentWidth, 12, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 38, 38);
    doc.setFontSize(8.5);
    doc.text("WARNING: UNPLACED PARTS - FAILED TO FIT WITHIN STOCK SHEETS LIMITS", margin + 4, y + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(127, 29, 29);
    doc.setFontSize(7.5);
    const maxUnplaced = 15;
    let unplacedStr = result.unplacedParts.slice(0, maxUnplaced).map(p => `${sanitizeText(p.name)} (x${p.qty})`).join(', ');
    if (result.unplacedParts.length > maxUnplaced) {
      unplacedStr += `, ... and ${result.unplacedParts.length - maxUnplaced} more`;
    }
    doc.text(`Unplaced pieces: ${unplacedStr}`, margin + 4, y + 9);
    y += 15;
  }

  // --- PAGES 2+: DETAILED SHEET LAYOUTS ---
  result.layouts.forEach((layout) => {
    doc.addPage();
    currentPageNum++;
    
    addHeaderFooter(isHindi ? `शीट #${layout.sheetIndex} कटिंग विवरण` : `Sheet #${layout.sheetIndex} Cutting Map`);
    
    let sy = 24;

    // Sheet Info Banner
    doc.setFillColor(241, 245, 249); // slate-100
    doc.rect(margin, sy, contentWidth, 12, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    
    let sheetTitle = `SHEET #${layout.sheetIndex} LAYOUT MAP`;
    if (layout.materialName) {
      sheetTitle += ` (${layout.materialName})`;
    }
    doc.text(sheetTitle, margin + 4, sy + 7.5);

    const sheetEff = ((layout.usedArea / layout.totalArea) * 100).toFixed(1);
    doc.setFontSize(8.5);
    doc.setTextColor(79, 70, 229); // Indigo
    doc.text(
      `Efficiency: ${sheetEff}%  |  Waste: ${layout.wastePercent.toFixed(1)}%`,
      pageWidth - margin - 4,
      sy + 7.5,
      { align: 'right' }
    );

    sy += 18;

    // List of major 'reusable' offcut dimensions within this sheet
    // Find waste pieces >= 250mm on both width and height as major reusable offcuts
    const majorOffcuts = layout.wasteRects?.filter(w => w.w >= 250 && w.h >= 250) || [];
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(isHindi ? "प्रमुख पुन: प्रयोज्य कतरन (Major Reusable Offcuts)" : "Major Reusable Offcuts (Leftovers)", margin, sy);
    sy += 5;

    doc.setDrawColor(241, 245, 249);
    doc.line(margin, sy, pageWidth - margin, sy);
    sy += 4;

    if (majorOffcuts.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(16, 185, 129); // emerald-600
      
      const offcutStrings = majorOffcuts.map((off, index) => {
        return `Offcut #${index + 1}: ${formatDim(off.w, settings.unit)} x ${formatDim(off.h, settings.unit)}`;
      });
      
      // Clean ASCII dash list instead of unicode checkmarks which render as quotes
      doc.text(`*  ${offcutStrings.join('    |    ')}`, margin + 2, sy);
    } else {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text("No large reusable offcut pieces leftover from this sheet (all waste is minor scrap).", margin + 2, sy);
    }

    sy += 8;

    // DRAW THE LAYOUT MAP GRAPHICALLY
    // Center the graphic if it's smaller than the max width
    const maxDrawWidth = contentWidth; // 190mm
    const maxDrawHeight = 140; // Increased to 140mm for a much larger, clearer 2D graph

    // Compute raw sizes in mm using the specific layout's usable width + trim margins
    const T = settings.trimMargin; // in mm
    const rawLMm = layout.width + (2 * T);
    const rawWMm = layout.height + (2 * T);

    // Compute layout scaling
    const scale = Math.min(maxDrawWidth / rawLMm, maxDrawHeight / rawWMm);
    const sheetDrawW = rawLMm * scale;
    const sheetDrawH = rawWMm * scale;

    const drawX = margin + (maxDrawWidth - sheetDrawW) / 2;
    const drawY = sy;

    // Draw the outer Sheet frame (Waste / Raw dimensions)
    doc.setFillColor(248, 250, 252); // slate-50 background for the sheet
    doc.setDrawColor(148, 163, 184); // slate-400 border
    doc.setLineWidth(0.4);
    doc.rect(drawX, drawY, sheetDrawW, sheetDrawH, 'FD');

    // Draw the Trim Border internally (if any)
    if (T > 0) {
      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.25);
      doc.setLineDashPattern([2, 2], 0);
      doc.rect(drawX + T * scale, drawY + T * scale, (rawLMm - 2 * T) * scale, (rawWMm - 2 * T) * scale, 'D');
      doc.setLineDashPattern([], 0); // reset dash pattern
    }

    // Draw Waste / Offcut areas as striped/light rectangles
    layout.wasteRects?.forEach((w) => {
      const wx = drawX + (T + w.x) * scale;
      const wy = drawY + (T + w.y) * scale;
      const ww = w.w * scale;
      const wh = w.h * scale;

      // Draw light gray filled rectangle for waste
      doc.setFillColor(241, 245, 249); // slate-100
      doc.setDrawColor(203, 213, 225); // slate-300
      doc.setLineWidth(0.2);
      doc.rect(wx, wy, ww, wh, 'FD');

      // Label major reusable waste
      if (w.w >= 250 && w.h >= 250) {
        doc.setDrawColor(79, 70, 229); // draw an indigo tag inside
        doc.setLineWidth(0.25);
        doc.setLineDashPattern([1, 1], 0);
        doc.rect(wx, wy, ww, wh, 'D');
        doc.setLineDashPattern([], 0);

        drawCenteredText(
          `REUSABLE OFF-CUT (${formatDim(w.w, settings.unit)}x${formatDim(w.h, settings.unit)})`,
          wx,
          wy,
          ww,
          wh,
          5.5,
          [79, 70, 229]
        );
      } else if (ww > 12 && wh > 6) {
        // Simple scrap label for small scrap
        drawCenteredText(
          "scrap",
          wx,
          wy,
          ww,
          wh,
          4.5,
          [148, 163, 184]
        );
      }
    });

    // Draw Nested Parts
    layout.parts.forEach((part, pIdx) => {
      const px = drawX + (T + part.x) * scale;
      const py = drawY + (T + part.y) * scale;
      const pw = part.w * scale;
      const ph = part.h * scale;

      // Filled rectangle with nice soft carpentry color (light blue/indigo blend)
      doc.setFillColor(224, 242, 254); // sky-100
      doc.setDrawColor(14, 165, 233); // sky-500
      doc.setLineWidth(0.35);
      doc.rect(px, py, pw, ph, 'FD');

      // Part code / name
      const cleanName = part.name || `P${pIdx + 1}`;
      const sizeStr = `${formatDim(part.origL, settings.unit)} x ${formatDim(part.origW, settings.unit)}`;
      
      const cy = py + ph / 2;

      // Precise non-overlapping vertical label alignment based on part's scaled height
      if (ph >= 12) {
        // We have plenty of vertical room (>= 12mm), draw name on top half and size on bottom half
        const nameText = sanitizeText(cleanName);
        const sizeText = sizeStr;

        // Draw Name Row (with scale-down protection for narrow parts)
        doc.setFont('helvetica', 'bold');
        let nameSize = 7.5;
        doc.setFontSize(nameSize);
        let nWidth = doc.getTextWidth(nameText);
        while (nWidth > pw - 2 && nameSize > 5) {
          nameSize--;
          doc.setFontSize(nameSize);
          nWidth = doc.getTextWidth(nameText);
        }
        if (nWidth < pw - 1) {
          doc.setTextColor(15, 23, 42);
          doc.text(nameText, px + (pw - nWidth) / 2, cy - 0.5);
        }

        // Draw Size Row (with scale-down protection for narrow parts)
        doc.setFont('helvetica', 'normal');
        let sizeSize = 6.0;
        doc.setFontSize(sizeSize);
        let sWidth = doc.getTextWidth(sizeText);
        while (sWidth > pw - 2 && sizeSize > 4.5) {
          sizeSize--;
          doc.setFontSize(sizeSize);
          sWidth = doc.getTextWidth(sizeText);
        }
        if (sWidth < pw - 1) {
          doc.setTextColor(71, 85, 105);
          doc.text(sizeText, px + (pw - sWidth) / 2, cy + 2.8);
        }
      } else if (ph >= 5) {
        // Less than 12mm height but still readable: Draw single consolidated centered line
        doc.setFont('helvetica', 'bold');
        const combinedText = pw > 25 ? `${sanitizeText(cleanName)} (${sizeStr})` : sanitizeText(cleanName);
        let fontSize = 6.5;
        doc.setFontSize(fontSize);
        let tWidth = doc.getTextWidth(combinedText);
        while (tWidth > pw - 2 && fontSize > 4) {
          fontSize--;
          doc.setFontSize(fontSize);
          tWidth = doc.getTextWidth(combinedText);
        }
        if (tWidth < pw - 1) {
          doc.setTextColor(15, 23, 42);
          doc.text(combinedText, px + (pw - tWidth) / 2, cy + (fontSize * 0.35) / 2);
        }
      }

      // Draw vector arrows for grain direction instead of buggy unicode glyphs (↕, ↔)
      if (part.grain === 'L' && pw > 6 && ph > 8) {
        drawVerticalGrainArrow(px + 2.2, py + 2.5, 3);
      } else if (part.grain === 'W' && pw > 8 && ph > 6) {
        drawHorizontalGrainArrow(px + 3, py + 2.2, 3);
      }
    });

    sy += sheetDrawH + 10;

    // List of placed parts on this sheet (tabular)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(isHindi ? "इस शीट पर पैक किए गए पुर्जे" : "Parts Nesting Summary on This Sheet", margin, sy);
    sy += 4.5;

    doc.setDrawColor(241, 245, 249);
    doc.line(margin, sy, pageWidth - margin, sy);
    sy += 3.5;

    // Small nested table
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, sy, contentWidth, 5.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text("PART ID / NAME", margin + 3, sy + 3.8);
    doc.text("QTY", margin + 65, sy + 3.8);
    doc.text("FINISHED SIZE", margin + 95, sy + 3.8);
    doc.text("ACTUAL CUT SIZE (SAW)", margin + 140, sy + 3.8);

    sy += 5.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);

    // Group identical parts by name and dimensions to save space
    const groupedParts = new Map<string, { qty: number, name: string, origL: number, origW: number, cutL: number, cutW: number }>();
    layout.parts.forEach(p => {
      const key = `${p.name}_${p.origL}_${p.origW}_${p.cutL}_${p.cutW}`;
      if (!groupedParts.has(key)) {
        groupedParts.set(key, { qty: 0, name: p.name, origL: p.origL, origW: p.origW, cutL: p.cutL, cutW: p.cutW });
      }
      groupedParts.get(key)!.qty++;
    });

    let partIdx = 0;
    groupedParts.forEach((part) => {
      // Pagination for sheet parts table
      if (sy > 275) {
        doc.addPage();
        currentPageNum++;
        addHeaderFooter(isHindi ? `शीट #${layout.sheetIndex} कटिंग विवरण (जारी)` : `Sheet #${layout.sheetIndex} Cutting Map (Cont.)`);
        sy = 25;
        
        // Redraw table header
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, sy, contentWidth, 5.5, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text("PART ID / NAME", margin + 3, sy + 3.8);
        doc.text("QTY", margin + 65, sy + 3.8);
        doc.text("FINISHED SIZE", margin + 95, sy + 3.8);
        doc.text("ACTUAL CUT SIZE (SAW)", margin + 140, sy + 3.8);
        sy += 5.5;
      }

      if (partIdx % 2 === 1) {
        doc.setFillColor(252, 252, 252);
        doc.rect(margin, sy, contentWidth, 5.5, 'F');
      }

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(sanitizeText(part.name || `Part`), margin + 3, sy + 3.8);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      
      doc.text(`${part.qty}`, margin + 65, sy + 3.8);

      // Finished size
      doc.text(`${formatDim(part.origL, settings.unit)} x ${formatDim(part.origW, settings.unit)}`, margin + 95, sy + 3.8);

      // Cut size
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(79, 70, 229); // indigo
      doc.text(`${formatDim(part.cutL, settings.unit)} x ${formatDim(part.cutW, settings.unit)}`, margin + 140, sy + 3.8);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);

      sy += 5.5;
      partIdx++;
    });

    // List ALL waste pieces for completeness
    sy += 4;
    if (sy > 275) {
      doc.addPage();
      currentPageNum++;
      addHeaderFooter(isHindi ? `शीट #${layout.sheetIndex} कटिंग विवरण (जारी)` : `Sheet #${layout.sheetIndex} Cutting Map (Cont.)`);
      sy = 25;
    }
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(isHindi ? "सभी बचे हुए कतरन (Complete Off-cut Breakdown):" : "All Scrap / Leftover Off-cuts Breakdown:", margin, sy);
    sy += 4;

    if (layout.wasteRects && layout.wasteRects.length > 0) {
      const maxScraps = 50;
      let allScrapsStr = layout.wasteRects.slice(0, maxScraps).map((w, wIdx) => {
        const isM = w.w >= 250 && w.h >= 250;
        return `W${wIdx + 1}: ${formatDim(w.w, settings.unit)} x ${formatDim(w.h, settings.unit)} (${isM ? 'Major' : 'Minor'})`;
      }).join(', ');
      
      if (layout.wasteRects.length > maxScraps) {
        allScrapsStr += `, ... and ${layout.wasteRects.length - maxScraps} more small scraps.`;
      }
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(allScrapsStr, margin, sy, { maxWidth: contentWidth });
    } else {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text("No waste leftovers from this sheet.", margin, sy);
    }
  });

  // Save or Share the generated document
  const fileName = `smart_carpentry_layout_${settings.algorithm}.pdf`;
  try {
    const pdfBlob = doc.output('blob');
    const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({
        files: [file],
        title: isHindi ? 'बढ़ईगीरी लेआउट (Carpentry Layout)' : 'Carpentry Layout',
        text: isHindi ? 'यहाँ आपका कटिंग लेआउट पीडीएफ है।' : 'Here is your cutting layout PDF.',
      }).catch((err) => {
        console.log('Share failed or was cancelled:', err);
        // Fallback to download if share is cancelled or fails
        doc.save(fileName);
      });
    } else {
      // Direct save
      doc.save(fileName);
    }
  } catch (e) {
    console.error('Error during PDF sharing/saving:', e);
    doc.save(fileName);
  }
}
