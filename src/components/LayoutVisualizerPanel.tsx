/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { PieChart, Pie, Cell, Tooltip } from 'recharts';
import { PackingResult, Language, SheetSettings, PackedPart, SheetLayout, CuttingInstruction } from '../types';
import { convertMmToUnit, convertToMm, getEdgeBandingSummary } from '../utils/packer';
import { generateSahiraSteps } from '../utils/sequencer';
import { getContrastColor } from '../utils/colors';
import { Download, Printer, Layout, Percent, ClipboardCheck, Ruler, AlertCircle, ZoomIn, ZoomOut, Sliders, Check, X, RotateCw, Undo2, PlusCircle, Lock, Unlock, CornerDownRight, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';

// Modular Sub-components
import KpiStatsGrid from './layout-visualizer/KpiStatsGrid';
import UnplacedWarning from './layout-visualizer/UnplacedWarning';
import GrandTotalSummary from './layout-visualizer/GrandTotalSummary';
import OffcutsTable from './layout-visualizer/OffcutsTable';
import PlacedPartsTable from './layout-visualizer/PlacedPartsTable';
import SahiraSequencer from './layout-visualizer/SahiraSequencer';

interface LayoutVisualizerPanelProps {
  result: PackingResult;
  settings: SheetSettings;
  language: Language;
  translations: any;
  onPrint: () => void;
  onExportCsv: () => void;
  onExportJson: () => void;
  onUpdateSettings?: (settings: SheetSettings) => void;
}

// Generate unique colors based on part name/size
const COLOR_PALETTE = [
  '#bae6fd', // sky 200
  '#fde047', // yellow 300
  '#86efac', // green 300
  '#d8b4fe', // purple 300
  '#fca5a5', // red 300
  '#5eead4', // teal 300
  '#fdba74', // orange 300
  '#a5b4fc', // indigo 300
  '#cbd5e1', // slate 300
  '#f9a8d4', // pink 300
  '#d9f99d', // lime 200
  '#bfdbfe', // blue 200
];

function getPartColor(name: string, index: number): string {
  // Simple hash for color consistency
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorIndex = Math.abs(hash) % COLOR_PALETTE.length;
  return COLOR_PALETTE[colorIndex];
}

export default function LayoutVisualizerPanel({
  result,
  settings,
  language,
  translations,
  onPrint,
  onExportCsv,
  onExportJson,
  onUpdateSettings
}: LayoutVisualizerPanelProps) {
  const isHindi = language === 'Hindi';

  const getSunmicaName = (id?: string) => {
    if (!id) return '';
    const item = settings.sunmicaItems?.find(m => m.id === id);
    if (!item) return '';
    return item.name.split(' (')[0];
  };

  // Manual Puzzle / Override states
  const [customLayoutOverrides, setCustomLayoutOverrides] = useState<Record<number, SheetLayout>>({});
  const [editingSheetIndex, setEditingSheetIndex] = useState<number | null>(null);
  const [editingParts, setEditingParts] = useState<PackedPart[]>([]);
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ clientX: number; clientY: number; startX: number; startY: number; partId: string } | null>(null);
  const [hoverTooltip, setHoverTooltip] = useState<{ id: string, name: string, w: number, h: number, x: number, y: number, sheetIndex: number, clientX: number, clientY: number } | null>(null);
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);

  const [savedOffcuts, setSavedOffcuts] = useState<string[]>([]);

  // Sahira Voice Assistant & Cutting Sequencer States
  const [activeStepIndices, setActiveStepIndices] = useState<Record<number, number>>({});
  const [showStepSequencer, setShowStepSequencer] = useState<boolean>(false);
  const [completedSteps, setCompletedSteps] = useState<Record<number, Record<number, boolean>>>({});

  const toggleStepCompleted = (sheetIndex: number, stepIndex: number, totalStepsCount: number) => {
    setCompletedSteps(prev => {
      const sheetSteps = { ...(prev[sheetIndex] || {}) };
      const wasCompleted = !!sheetSteps[stepIndex];
      sheetSteps[stepIndex] = !wasCompleted;
      
      // Auto-advance to next step if marking as completed (and not already at the end)
      if (!wasCompleted && stepIndex === (activeStepIndices[sheetIndex] ?? 0) && stepIndex < totalStepsCount - 1) {
        setTimeout(() => {
          setActiveStepIndices(curr => ({
            ...curr,
            [sheetIndex]: stepIndex + 1
          }));
        }, 300);
      }
      
      return {
        ...prev,
        [sheetIndex]: sheetSteps
      };
    });
  };

  const handleSaveOffcut = (w: { x: number; y: number; w: number; h: number }, wIdx: number, sheetIndex: number, materialName?: string) => {
    if (!onUpdateSettings) return;

    const lengthInUnit = convertMmToUnit(w.w, settings.unit);
    const widthInUnit = convertMmToUnit(w.h, settings.unit);

    // Try to guess thickness from materialName
    let guessedThickness = 18;
    if (materialName) {
      const match = materialName.match(/(\d+(?:\.\d+)?)\s*mm/i);
      if (match) {
        guessedThickness = parseFloat(match[1]);
      }
    }

    // Try to guess category from materialName
    let guessedCategory: any = 'Plywood';
    if (materialName) {
      if (/mdf/i.test(materialName)) guessedCategory = 'MDF';
      else if (/wpc/i.test(materialName)) guessedCategory = 'WPC';
      else if (/melamine/i.test(materialName)) guessedCategory = 'Melamine';
      else if (/multi/i.test(materialName)) guessedCategory = 'Multi-board';
      else if (/mica/i.test(materialName) || /laminate/i.test(materialName)) guessedCategory = 'Sunmica';
    }

    const uniqueId = `offcut-${Date.now()}-${Math.random().toString(36).substring(2)}`;
    
    // Auto-generate name with size for clear tracking in settings
    const nameWithDims = `${guessedThickness}mm ${guessedCategory} Offcut (${Number(lengthInUnit.toFixed(1))}x${Number(widthInUnit.toFixed(1))})`;

    const newStockItem = {
      id: uniqueId,
      name: nameWithDims,
      length: Number(lengthInUnit.toFixed(1)),
      width: Number(widthInUnit.toFixed(1)),
      thickness: guessedThickness,
      quantity: 1,
      isOffcut: true,
      cost: 0,
      category: guessedCategory
    };

    const updatedStockItems = [
      ...(settings.stockItems || []),
      newStockItem
    ];

    onUpdateSettings({
      ...settings,
      stockItems: updatedStockItems
    });

    setSavedOffcuts(prev => [...prev, `${sheetIndex}-${wIdx}`]);
  };

  // Only clear overrides when physical sheet dimensions, unit, trim margin, or blade thickness parameters change
  const lastSettingsRef = React.useRef({
    sheetL: settings.sheetL,
    sheetW: settings.sheetW,
    unit: settings.unit,
    trimMargin: settings.trimMargin,
    trimEdgesStr: JSON.stringify(settings.trimEdges),
    bladeTh: settings.bladeTh,
  });

  React.useEffect(() => {
    const prev = lastSettingsRef.current;
    const currentTrimEdgesStr = JSON.stringify(settings.trimEdges);
    if (
      prev.sheetL !== settings.sheetL ||
      prev.sheetW !== settings.sheetW ||
      prev.unit !== settings.unit ||
      prev.trimMargin !== settings.trimMargin ||
      prev.trimEdgesStr !== currentTrimEdgesStr ||
      prev.bladeTh !== settings.bladeTh
    ) {
      setCustomLayoutOverrides({});
      setEditingSheetIndex(null);
    }
    lastSettingsRef.current = {
      sheetL: settings.sheetL,
      sheetW: settings.sheetW,
      unit: settings.unit,
      trimMargin: settings.trimMargin,
      trimEdgesStr: currentTrimEdgesStr,
      bladeTh: settings.bladeTh,
    };
  }, [settings.sheetL, settings.sheetW, settings.unit, settings.trimMargin, settings.trimEdges, settings.bladeTh]);

  const [showGrid, setShowGrid] = useState(true);
  const [showRuler, setShowRuler] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showGrandSummary, setShowGrandSummary] = useState(false);
  const [showCutSequence, setShowCutSequence] = useState(false);
  const S_L = settings.sheetL;
  const S_W = settings.sheetW;
  const unit = settings.unit;
  const K = settings.bladeTh; // Kerf in mm
  const T = settings.trimMargin; // Trim in mm
  const trimEdges = settings.trimEdges || { top: true, bottom: true, left: true, right: true };
  const padTop = trimEdges.top ? T : 0;
  const padBottom = trimEdges.bottom ? T : 0;
  const padLeft = trimEdges.left ? T : 0;
  const padRight = trimEdges.right ? T : 0;

  // Construct effective layouts
  const effectiveLayouts = React.useMemo(() => {
    return result.layouts.map(layout => {
      return customLayoutOverrides[layout.sheetIndex] || layout;
    });
  }, [result.layouts, customLayoutOverrides]);

  // Calculate KPIs dynamically
  const layouts = effectiveLayouts;
  const totalSheetsUsed = effectiveLayouts.length;

  const totalPartsArea = React.useMemo(() => {
    return effectiveLayouts.reduce((acc, layout) => {
      return acc + layout.parts.reduce((partAcc, part) => partAcc + (part.w * part.h), 0);
    }, 0);
  }, [effectiveLayouts]);

  const totalKerfLossMm2 = React.useMemo(() => {
    return effectiveLayouts.reduce((acc, layout) => {
      const partsArea = layout.parts.reduce((partAcc, part) => partAcc + (part.w * part.h), 0);
      const wasteArea = (layout.wasteRects || []).reduce((wasteAcc, w) => wasteAcc + (w.w * w.h), 0);
      const totalBoardUsableArea = layout.width * layout.height;
      let sheetKerfArea = totalBoardUsableArea - partsArea - wasteArea;
      if (sheetKerfArea < 0) sheetKerfArea = 0; // Safeguard
      return acc + sheetKerfArea;
    }, 0);
  }, [effectiveLayouts, settings.bladeTh]);
  const totalAvailableArea = React.useMemo(() => {
    return effectiveLayouts.reduce((acc, layout) => acc + (layout.width * layout.height), 0);
  }, [effectiveLayouts]);

  const totalUtilization = totalAvailableArea > 0 ? (totalPartsArea / totalAvailableArea) * 100 : 0;
  const overallWastePercent = 100 - totalUtilization;

  const totalBandingLength = React.useMemo(() => {
    return effectiveLayouts.reduce((acc, layout) => {
      return acc + layout.parts.reduce((partAcc, part) => {
        let len = 0;
        if (part.edges.T) len += part.w;
        if (part.edges.B) len += part.w;
        if (part.edges.L) len += part.h;
        if (part.edges.R) len += part.h;
        return partAcc + len;
      }, 0);
    }, 0);
  }, [effectiveLayouts]);

  const unplacedParts = result.unplacedParts;

  // Helper to format dimensions with unit
  const formatDim = (valueMm: number) => {
    const val = convertMmToUnit(valueMm, unit);
    return `${val.toFixed(1)}${unit === 'Inch' ? '"' : ' ' + unit}`;
  };

  // Helper to format dimension pairs with explicit L and W labels
  const formatDimPair = (lMm: number, wMm: number) => {
    const valL = convertMmToUnit(lMm, unit);
    const valW = convertMmToUnit(wMm, unit);
    const suffix = unit === 'Inch' ? '"' : ' ' + unit;
    if (unit === 'Inch') {
      return `L: ${valL.toFixed(1)}" x W: ${valW.toFixed(1)}"`;
    }
    return `L: ${valL.toFixed(1)} x W: ${valW.toFixed(1)}${suffix}`;
  };

  const handleOpenNewZoomWindow = (layoutIndex: number) => {
    const svgEl = document.getElementById(`sheet-svg-${layoutIndex}`);
    if (svgEl) {
      const svgString = new XMLSerializer().serializeToString(svgEl);
      
      // Get sheet details to make the page header extremely helpful
      const layout = result.layouts[layoutIndex];
      const sheetName = layout?.materialName || (isHindi ? 'मानक (Standard)' : 'Standard');
      const dimensions = `${formatDim(layout?.width || 0)} x ${formatDim(layout?.height || 0)}`;
      
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="utf-8">
            <title>Sheet ${layoutIndex + 1} Layout - ${sheetName}</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
            <style>
              html, body {
                margin: 0;
                padding: 0;
                width: 100%;
                height: 100%;
                background-color: #0f172a; /* slate-900 */
                color: #f8fafc;
                display: flex;
                flex-direction: column;
                font-family: ui-sans-serif, system-ui, sans-serif;
                overflow: hidden;
              }
              header {
                background-color: #1e293b; /* slate-800 */
                border-bottom: 1px solid #334155;
                padding: 14px 24px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                z-index: 50;
              }
              header h1 {
                margin: 0;
                font-size: 18px;
                font-weight: 700;
                letter-spacing: -0.025em;
                color: #f8fafc;
              }
              header p {
                margin: 4px 0 0 0;
                font-size: 12px;
                color: #94a3b8; /* slate-400 */
              }
              .badge {
                background-color: #3b82f6; /* blue-500 */
                color: white;
                font-size: 11px;
                font-weight: 700;
                padding: 6px 12px;
                border-radius: 9999px;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                box-shadow: 0 1px 3px rgba(0,0,0,0.2);
              }
              .main-container {
                flex: 1;
                width: 100%;
                height: 100%;
                overflow: auto;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 40px;
                box-sizing: border-box;
                position: relative;
              }
              .svg-wrapper {
                width: 100%;
                height: 100%;
                max-width: 100%;
                max-height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              svg {
                width: 100%;
                height: 100%;
                max-width: 95vw;
                max-height: 80vh;
                background-color: #0f172a;
                border-radius: 12px;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                border: 1px solid #334155;
              }
              .instructions {
                position: absolute;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                background-color: rgba(30, 41, 59, 0.85); /* slate-800/85 */
                backdrop-filter: blur(8px);
                padding: 8px 16px;
                border-radius: 8px;
                border: 1px solid #334155;
                font-size: 11px;
                color: #cbd5e1;
                pointer-events: none;
                white-space: nowrap;
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
              }
              @media print {
                header, .instructions {
                  display: none !important;
                }
                html, body, .main-container {
                  background-color: white !important;
                  color: black !important;
                  overflow: visible !important;
                  padding: 0 !important;
                }
                svg {
                  box-shadow: none !important;
                  border: none !important;
                  max-width: 100% !important;
                  max-height: 100% !important;
                }
              }
            </style>
          </head>
          <body>
            <header>
              <div>
                <h1>${isHindi ? `शीट ${layoutIndex + 1} (${sheetName})` : `Sheet ${layoutIndex + 1} (${sheetName})`}</h1>
                <p>${isHindi ? `साइज़: ${dimensions} | प्रिंट करने के लिए Ctrl+P दबाएं` : `Size: ${dimensions} | Press Ctrl+P to Print`}</p>
              </div>
              <div class="badge">PRO CAD VIEW</div>
            </header>
            <div class="main-container">
              <div class="svg-wrapper">
                ${svgString}
              </div>
              <div class="instructions">
                ${isHindi ? '📱 मोबाइल पर ज़ूम करने के लिए पिंच करें या डबल टैप करें' : '📱 Pinch or double tap to zoom on mobile'}
              </div>
            </div>
          </body>
        </html>
      `;
      
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const newWin = window.open(url, '_blank');
      if (!newWin) {
        alert(isHindi ? "नया विंडो खोलने के लिए कृपया पॉपअप ब्लॉकर को अनुमति दें।" : "Please allow popups to open the zoom window.");
      }
    }
  };

  // Overlap and boundary checking helper
  const getCollisionStatus = (parts: PackedPart[], usableW: number, usableH: number) => {
    const hasCollision = new Set<string>();
    const isOutOfBounds = new Set<string>();
    
    for (let i = 0; i < parts.length; i++) {
      const p1 = parts[i];
      // Check out of bounds
      if (p1.x < -0.01 || p1.y < -0.01 || p1.x + p1.w > usableW + 0.01 || p1.y + p1.h > usableH + 0.01) {
        isOutOfBounds.add(p1.id);
      }
      
      // Check overlap with others
      for (let j = 0; j < parts.length; j++) {
        if (i === j) continue;
        const p2 = parts[j];
        
        const overlapX = Math.max(0, Math.min(p1.x + p1.w, p2.x + p2.w) - Math.max(p1.x, p2.x));
        const overlapY = Math.max(0, Math.min(p1.y + p1.h, p2.y + p2.h) - Math.max(p1.y, p2.y));
        
        if (overlapX > 0.1 && overlapY > 0.1) {
          hasCollision.add(p1.id);
          hasCollision.add(p2.id);
        }
      }
    }
    return { hasCollision, isOutOfBounds };
  };

  // Drag and drop event handlers
  const handlePartMouseDown = (e: React.MouseEvent, partId: string, startX: number, startY: number) => {
    e.preventDefault();
    setSelectedPartId(partId);
    setDragStart({
      clientX: e.clientX,
      clientY: e.clientY,
      startX,
      startY,
      partId
    });
  };

  const handlePartTouchStart = (e: React.TouchEvent, partId: string, startX: number, startY: number) => {
    const touch = e.touches[0];
    setSelectedPartId(partId);
    setDragStart({
      clientX: touch.clientX,
      clientY: touch.clientY,
      startX,
      startY,
      partId
    });
  };

  const handleSvgMouseMove = (e: React.MouseEvent, usableW: number, usableH: number, svgW: number, svgH: number) => {
    if (!dragStart) return;
    e.preventDefault();

    const svgElement = e.currentTarget as SVGSVGElement;
    const rect = svgElement.getBoundingClientRect();
    const scaleX = svgW / rect.width;
    const scaleY = svgH / rect.height;

    const deltaX = (e.clientX - dragStart.clientX) * scaleX;
    const deltaY = (e.clientY - dragStart.clientY) * scaleY;

    updatePartCoords(dragStart.partId, dragStart.startX + deltaX, dragStart.startY + deltaY, usableW, usableH);
  };

  const handleSvgTouchMove = (e: React.TouchEvent, usableW: number, usableH: number, svgW: number, svgH: number) => {
    if (!dragStart) return;
    
    const touch = e.touches[0];
    const svgElement = e.currentTarget as SVGSVGElement;
    const rect = svgElement.getBoundingClientRect();
    const scaleX = svgW / rect.width;
    const scaleY = svgH / rect.height;

    const deltaX = (touch.clientX - dragStart.clientX) * scaleX;
    const deltaY = (touch.clientY - dragStart.clientY) * scaleY;

    updatePartCoords(dragStart.partId, dragStart.startX + deltaX, dragStart.startY + deltaY, usableW, usableH);
  };

  const updatePartCoords = (partId: string, newX: number, newY: number, usableW: number, usableH: number) => {
    setEditingParts(prev => {
      const target = prev.find(p => (p.internalId || p.id) === partId);
      if (!target) return prev;

      let finalX = newX;
      let finalY = newY;

      if (snapToGrid) {
        // Grid snap every 10mm or equivalent in Inches
        const snapStep = unit === 'Inch' ? 6.35 : 10; // 0.25 inch or 10mm
        finalX = Math.round(finalX / snapStep) * snapStep;
        finalY = Math.round(finalY / snapStep) * snapStep;

        // Edge snap to other parts
        const SNAP_THRESHOLD = 12; // 12mm is a very comfortable snapping range
        for (const other of prev) {
          if ((other.internalId || other.id) === partId) continue;

          // Align X to other's left or right
          if (Math.abs(finalX - other.x) < SNAP_THRESHOLD) finalX = other.x;
          else if (Math.abs(finalX + target.w - other.x) < SNAP_THRESHOLD) finalX = other.x - target.w;
          else if (Math.abs(finalX - (other.x + other.w)) < SNAP_THRESHOLD) finalX = other.x + other.w;
          else if (Math.abs(finalX + target.w - (other.x + other.w)) < SNAP_THRESHOLD) finalX = other.x + other.w - target.w;

          // Align Y to other's top or bottom
          if (Math.abs(finalY - other.y) < SNAP_THRESHOLD) finalY = other.y;
          else if (Math.abs(finalY + target.h - other.y) < SNAP_THRESHOLD) finalY = Math.max(0, other.y - target.h);
          else if (Math.abs(finalY - (other.y + other.h)) < SNAP_THRESHOLD) finalY = other.y + other.h;
          else if (Math.abs(finalY + target.h - (other.y + other.h)) < SNAP_THRESHOLD) finalY = Math.max(0, other.y + other.h - target.h);
        }
      }

      // Constrain inside boundaries after snapping
      finalX = Math.max(0, Math.min(usableW - target.w, finalX));
      finalY = Math.max(0, Math.min(usableH - target.h, finalY));

      return prev.map(p => (p.internalId || p.id) === partId ? { ...p, x: finalX, y: finalY } : p);
    });
  };

  const handleRotatePart = (partId: string) => {
    setEditingParts(prev => {
      return prev.map(p => {
        if ((p.internalId || p.id) !== partId) return p;
        const newW = p.h;
        const newH = p.w;
        const newIsRotated = !p.isRotated;
        return {
          ...p,
          w: newW,
          h: newH,
          isRotated: newIsRotated
        };
      });
    });
  };

  const handleEndDrag = () => {
    setDragStart(null);
  };

  const renderHeatmapOverlay = (pad: number, rawLMm: number, rawWMm: number, parts: PackedPart[], trim: number) => {
    if (!showHeatmap) return null;
    
    // We create a grid to approximate empty spaces. 
    // Higher columns = more precision, but slightly slower. 60 is a good balance.
    const cols = 60;
    const rows = Math.max(10, Math.floor((rawWMm / rawLMm) * cols));
    const cellW = rawLMm / cols;
    const cellH = rawWMm / rows;

    const grid = Array(rows).fill(0).map(() => Array(cols).fill(0));

    // Mark cells that are covered by parts
    for (const part of parts) {
      const pX = part.x + trim;
      const pY = part.y + trim;
      const pW = part.w;
      const pH = part.h;
      
      const startC = Math.floor(pX / cellW);
      const endC = Math.min(cols - 1, Math.floor((pX + pW) / cellW));
      const startR = Math.floor(pY / cellH);
      const endR = Math.min(rows - 1, Math.floor((pY + pH) / cellH));

      for (let r = Math.max(0, startR); r <= endR; r++) {
        for (let c = Math.max(0, startC); c <= endC; c++) {
          grid[r][c] = 1;
        }
      }
    }

    // 2-pass distance transform (Manhattan)
    const dist = Array(rows).fill(0).map(() => Array(cols).fill(9999));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c] === 1) {
          dist[r][c] = 0;
        } else {
          if (r > 0) dist[r][c] = Math.min(dist[r][c], dist[r-1][c] + 1);
          if (c > 0) dist[r][c] = Math.min(dist[r][c], dist[r][c-1] + 1);
        }
      }
    }
    
    let maxDist = 0;
    for (let r = rows - 1; r >= 0; r--) {
      for (let c = cols - 1; c >= 0; c--) {
        if (r < rows - 1) dist[r][c] = Math.min(dist[r][c], dist[r+1][c] + 1);
        if (c < cols - 1) dist[r][c] = Math.min(dist[r][c], dist[r][c+1] + 1);
        if (dist[r][c] > maxDist && dist[r][c] !== 9999) maxDist = dist[r][c];
      }
    }

    const cells = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c] === 0) {
          const d = dist[r][c];
          // Normalized distance (0 to 1)
          const intensity = maxDist > 0 ? (d / maxDist) : 0;
          // Map to hue: 50 (Yellow) for low waste, 0 (Red) for high waste
          const hue = Math.max(0, 50 - intensity * 50);
          cells.push(
            <rect
              key={`hm-${r}-${c}`}
              x={pad + c * cellW}
              y={pad + r * cellH}
              width={cellW + 1}
              height={cellH + 1}
              fill={`hsla(${hue}, 100%, 50%, ${0.15 + intensity * 0.7})`}
              pointerEvents="none"
            />
          );
        }
      }
    }

    return <g className="heatmap-overlay">{cells}</g>;
  };

  return (
    <div id="visualizer-panel" className="flex flex-col gap-6">
      {/* KPI Stats Grid */}
      <KpiStatsGrid
        totalUtilization={totalUtilization}
        overallWastePercent={overallWastePercent}
        totalSheetsUsed={totalSheetsUsed}
        totalKerfLossMm2={totalKerfLossMm2}
        totalBandingLength={totalBandingLength}
        settings={settings}
        translations={translations}
        isHindi={isHindi}
        unit={unit}
      />

      {/* Unplaced Parts Warning Card */}
      <UnplacedWarning
        unplacedParts={unplacedParts}
        translations={translations}
      />

      {/* Action bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
          <ClipboardCheck size={18} className="text-indigo-600" />
          {isHindi ? 'लेआउट अनुकूलन परिणाम' : 'Cutting Layout Results'}
        </h3>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          {/* Grid, Ruler & Cut Sequence Toggles */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 p-1.5 rounded-xl shrink-0">
            <button
              id="grid-toggle-btn"
              type="button"
              onClick={() => setShowGrid(prev => !prev)}
              className={`text-[10px] font-extrabold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                showGrid
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-100'
                  : 'bg-white text-slate-500 border-slate-200 hover:text-slate-700 hover:bg-white'
              }`}
              title={isHindi ? "ग्रिड दिखाएं/छिपाएं" : "Show/Hide Grid"}
            >
              {isHindi ? "ग्रिड" : "Grid"}
            </button>
            <button
              id="ruler-toggle-btn"
              type="button"
              onClick={() => setShowRuler(prev => !prev)}
              className={`text-[10px] font-extrabold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                showRuler
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-100'
                  : 'bg-white text-slate-500 border-slate-200 hover:text-slate-700 hover:bg-white'
              }`}
              title={isHindi ? "पैमाना दिखाएं/छिपाएं" : "Show/Hide Ruler"}
            >
              {isHindi ? "पैमाना" : "Ruler"}
            </button>
            <button
              id="heatmap-toggle-btn"
              type="button"
              onClick={() => setShowHeatmap(prev => !prev)}
              className={`text-[10px] font-extrabold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                showHeatmap
                  ? 'bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-100'
                  : 'bg-white text-slate-500 border-slate-200 hover:text-slate-700 hover:bg-white'
              }`}
              title={isHindi ? "हीटमैप दिखाएं/छिपाएं (कतरन को लाल रंग से हाईलाइट करें)" : "Show/Hide Waste Heatmap"}
            >
              {isHindi ? "हीटमैप" : "Heatmap"}
            </button>
            <button
              id="sequence-toggle-btn"
              type="button"
              onClick={() => setShowCutSequence(prev => !prev)}
              className={`text-[10px] font-extrabold px-3 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                showCutSequence
                  ? 'bg-rose-600 text-white border-rose-600 shadow-sm shadow-rose-100'
                  : 'bg-white text-slate-500 border-slate-200 hover:text-slate-700 hover:bg-white'
              }`}
              title={isHindi ? "कटिंग का रास्ता (एल्गोरिथम) चालू/बंद करें" : "Show/Hide Cutting Sequence path"}
            >
              {isHindi ? "कटिंग पाथ" : "Cut Path"}
            </button>
            <button
              id="sequencer-toggle-btn"
              type="button"
              onClick={() => setShowStepSequencer(prev => !prev)}
              className={`text-[10px] font-extrabold px-3 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                showStepSequencer
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-100'
                  : 'bg-white text-slate-500 border-slate-200 hover:text-slate-700 hover:bg-white'
              }`}
              title={isHindi ? "कटिंग गाइड दिखाएं/छिपाएं" : "Show/Hide Step-by-Step Cutting Guide"}
            >
              <ClipboardCheck size={12} />
              {isHindi ? "कटिंग गाइड" : "Cutting Guide"}
            </button>
          </div>

          <button
            id="print-btn"
            onClick={onPrint}
            className="flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-indigo-100 transition-colors cursor-pointer"
          >
            <Printer size={14} />
            {translations.btn_pdf}
          </button>
          <button
            id="csv-btn"
            onClick={onExportCsv}
            className="flex items-center justify-center gap-1.5 bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-colors cursor-pointer"
          >
            <Download size={14} className="text-slate-500" />
            {translations.btn_export}
          </button>
          <button
            id="json-btn"
            onClick={onExportJson}
            className="flex items-center justify-center gap-1.5 bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-colors cursor-pointer"
          >
            <Download size={14} className="text-slate-500" />
            {translations.btn_json}
          </button>
        </div>
      </div>

      {/* Visual Sheets Render */}
      <div className="flex flex-col gap-8">
        {layouts.map((layout, lIdx) => {
          // Let's get raw sheet dimension in mm directly from the layout (adding back trim)
          const rawLMm = layout.width + (2 * T);
          const rawWMm = layout.height + (2 * T);
          
          // Compute the displayed dimensions in the current unit
          const displayL = convertMmToUnit(rawLMm, unit);
          const displayW = convertMmToUnit(rawWMm, unit);

          // Margins inside SVG
          const pad = 45;
          const svgW = rawLMm + 2 * pad;
          const svgH = rawWMm + 2 * pad;
          
          const currentParts = editingSheetIndex === layout.sheetIndex ? editingParts : layout.parts;
          const isSheetLocked = layout.isLocked || (settings.lockedLayouts || []).some(l => l.sheetIndex === layout.sheetIndex);
          
          const sahiraSteps = generateSahiraSteps(layout, settings);
          const activeStepIdx = activeStepIndices[layout.sheetIndex] ?? 0;
          const activeStep = sahiraSteps[activeStepIdx];
          const pastCutPartIds = new Set(sahiraSteps.slice(0, activeStepIdx).flatMap(s => s.affectedPartIds || []));

          return (
            <div 
              key={lIdx} 
              id={`sheet-card-${layout.sheetIndex}`}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-md shadow-slate-100 overflow-hidden"
            >
              {/* Card Header */}
              <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 flex-wrap">
                    {isHindi ? `शीट नंबर ${layout.sheetIndex} का नक्शा` : `Sheet #${layout.sheetIndex} Cutting Layout`}
                    {layout.materialName && (
                      <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-100">
                        {layout.materialName}
                      </span>
                    )}
                    {customLayoutOverrides[layout.sheetIndex] && (
                      <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200">
                        {isHindi ? "मैनुअल रूप से बदला गया" : "Manually Adjusted"}
                      </span>
                    )}
                    {isSheetLocked && (
                      <span className="bg-rose-50 text-rose-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-rose-200 flex items-center gap-1 shadow-sm">
                        <Lock size={10} className="shrink-0 text-rose-600 animate-pulse" />
                        {isHindi ? "ताला लगा (स्थिर)" : "Locked (Frozen)"}
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span>{translations.sheet_l}: {displayL} {unit} | {translations.sheet_w}: {displayW} {unit}</span>
                    {layout.wasteRects && layout.wasteRects.filter(w => w.w >= 250 && w.h >= 250).length > 0 && (
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-100/60 text-[10px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {isHindi ? 'बचे प्रमुख पुन: प्रयोज्य कतरन:' : 'Major Offcuts:'} {' '}
                        {layout.wasteRects
                          .filter(w => w.w >= 250 && w.h >= 250)
                          .map((w) => `${formatDim(w.w)} x ${formatDim(w.h)}`)
                          .join(', ')}
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
                  <div className="text-right mr-2 hidden md:flex items-center gap-3">
                    <div className="flex flex-col gap-1 items-end">
                      <span className="bg-emerald-50 border border-emerald-100 text-emerald-800 font-extrabold text-[10px] px-2 py-0.5 rounded-lg whitespace-nowrap">
                        {translations.efficiency}: {((layout.usedArea / layout.totalArea) * 100).toFixed(1)}%
                      </span>
                      <span className="bg-rose-50 border border-rose-100 text-rose-800 font-extrabold text-[10px] px-2 py-0.5 rounded-lg whitespace-nowrap">
                        {translations.sheet_waste}: {layout.wastePercent.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-12 h-12 relative flex items-center justify-center shrink-0" title="Material (Green) vs Waste (Red)">
                      <PieChart width={48} height={48}>
                        <Pie
                          data={[
                            { name: 'Used', value: layout.usedArea },
                            { name: 'Waste', value: layout.totalArea - layout.usedArea }
                          ]}
                          dataKey="value"
                          cx="50%"
                          cy="50%"
                          innerRadius={14}
                          outerRadius={24}
                          stroke="none"
                          isAnimationActive={false}
                        >
                          <Cell fill="#10b981" />
                          <Cell fill="#ef4444" />
                        </Pie>
                        <Tooltip 
                          formatter={(value: number, name: string) => [
                            ((value / layout.totalArea) * 100).toFixed(1) + '%', 
                            name === 'Used' ? (isHindi ? 'उपयोग' : 'Used') : (isHindi ? 'कतरन' : 'Waste')
                          ]}
                          contentStyle={{ fontSize: '10px', padding: '4px 8px', borderRadius: '8px' }}
                        />
                      </PieChart>
                    </div>
                  </div>

                  {editingSheetIndex === layout.sheetIndex ? (
                    <div className="flex flex-wrap items-center gap-2 bg-indigo-50 p-1.5 rounded-2xl border border-indigo-100 shadow-inner">
                      <div className="flex items-center gap-1 px-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping shrink-0" />
                        <span className="text-[10px] font-extrabold text-indigo-800 uppercase tracking-wider">
                          {isHindi ? "कारपेंटर स्केलिंग" : "Carpenter Scaling"}
                        </span>
                      </div>
                      <label className="flex items-center gap-1.5 text-[10px] font-extrabold text-slate-600 bg-white border border-slate-200 px-2.5 py-1.5 rounded-xl cursor-pointer hover:bg-slate-50 shadow-sm">
                        <input
                          type="checkbox"
                          checked={snapToGrid}
                          onChange={(e) => setSnapToGrid(e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        {isHindi ? "चिपकाएं (Snap)" : "Snap"}
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const updatedUsedArea = editingParts.reduce((acc, p) => acc + p.w * p.h, 0);
                          const totalArea = layout.width * layout.height;
                          const wastePercent = (1 - updatedUsedArea / totalArea) * 100;

                          setCustomLayoutOverrides(prev => ({
                            ...prev,
                            [layout.sheetIndex]: {
                              ...layout,
                              parts: editingParts,
                              usedArea: updatedUsedArea,
                              wastePercent,
                              wasteRects: [] // Manual irregular placements clear auto waste Rects
                            }
                          }));
                          setEditingSheetIndex(null);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-extrabold px-3 py-1.5 rounded-xl flex items-center gap-1 cursor-pointer transition-colors shadow-md shadow-emerald-100"
                      >
                        <Check size={11} />
                        {isHindi ? "सहेजें" : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSheetIndex(null);
                        }}
                        className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-[10px] font-extrabold px-3 py-1.5 rounded-xl flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <X size={11} />
                        {isHindi ? "रद्द करें" : "Cancel"}
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenNewZoomWindow(layout.sheetIndex)}
                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[10px] font-extrabold px-3 py-1.5 rounded-xl flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                        title={isHindi ? "नया विंडो में खोलने और ज़ूम करने के लिए क्लिक करें" : "Click to open in a new zoomable window"}
                      >
                        <PlusCircle size={11} className="text-indigo-600" />
                        {isHindi ? "नया विंडो (Zoom)" : "Open Zoom Window"}
                      </button>

                      {/* Lock / Unlock Toggle Button */}
                      <button
                        type="button"
                        onClick={() => {
                          if (!onUpdateSettings) return;
                          const currentLocked = settings.lockedLayouts || [];
                          const isAlreadyLocked = currentLocked.some(l => l.sheetIndex === layout.sheetIndex);
                          let nextLocked: SheetLayout[] = [];
                          
                          if (isAlreadyLocked) {
                            nextLocked = currentLocked.filter(l => l.sheetIndex !== layout.sheetIndex);
                          } else {
                            const currentLayout = customLayoutOverrides[layout.sheetIndex] || layout;
                            nextLocked = [...currentLocked, { ...currentLayout, isLocked: true }];
                          }
                          
                          onUpdateSettings({
                            ...settings,
                            lockedLayouts: nextLocked
                          });
                        }}
                        className={`text-[10px] font-extrabold px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer transition-all border shadow-sm hover:scale-[1.02] active:scale-95 ${
                          isSheetLocked 
                            ? "bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200" 
                            : "bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200"
                        }`}
                        title={isSheetLocked 
                          ? (isHindi ? "इस शीट को दोबारा अनलॉक करें" : "Unlock this sheet") 
                          : (isHindi ? "इस शीट के लेआउट को लॉक करें" : "Lock this sheet layout")
                        }
                      >
                        {isSheetLocked ? <Lock size={12} className="text-rose-600 animate-pulse" /> : <Unlock size={12} className="text-amber-600" />}
                        {isSheetLocked 
                          ? (isHindi ? "ताला खोलें (Unlock)" : "Unlock Sheet") 
                          : (isHindi ? "ताला लगाएं (Lock)" : "Lock Sheet")
                        }
                      </button>

                      {isSheetLocked ? (
                        <div className="bg-slate-100 text-slate-400 text-[10px] font-extrabold px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 cursor-not-allowed border border-slate-200">
                          <Lock size={12} className="text-slate-400" />
                          {isHindi ? "सुरक्षित (Locked)" : "Locked Layout"}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSheetIndex(layout.sheetIndex);
                            setEditingParts([...layout.parts]);
                            setSelectedPartId(null);
                          }}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-extrabold px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors shadow-md shadow-indigo-100"
                          title={isHindi ? "इस शीट को खुद सेट करें" : "Edit sheet layout manually"}
                        >
                          <Sliders size={12} />
                          {isHindi ? "कारपेंटर स्केलिंग" : "Carpenter Scaling"}
                        </button>
                      )}
                      
                      {!isSheetLocked && customLayoutOverrides[layout.sheetIndex] && (
                        <button
                          type="button"
                          onClick={() => {
                            setCustomLayoutOverrides(prev => {
                              const copy = { ...prev };
                              delete copy[layout.sheetIndex];
                              return copy;
                            });
                          }}
                          className="bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-extrabold px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
                          title={isHindi ? "मूल लेआउट पर वापस जाएं" : "Reset to automated layout"}
                        >
                          <Undo2 size={12} />
                          {isHindi ? "मूल रूप में लाएं" : "Reset to Auto"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Graphic Diagram */}
              <div className="p-6 bg-slate-100/50 flex flex-col items-center border-b border-slate-100">
                {editingSheetIndex === layout.sheetIndex && (
                  <div className="w-full max-w-4xl bg-amber-50 border border-amber-200 text-amber-800 text-xs px-4 py-3 rounded-2xl mb-4 flex items-start gap-2 shadow-sm animate-fade-in">
                    <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-600" />
                    <div>
                      <p className="font-bold">
                        {isHindi 
                          ? "पहेली मोड सक्रिय है! पुर्जों को पकड़कर मनचाही जगह पर खिसकाएं:"
                          : "Carpenter Scaling is active! Grab and slide parts to arrange them manually:"}
                      </p>
                      <ul className="list-disc pl-4 mt-1 space-y-0.5 text-[11px] text-amber-700 font-medium">
                        <li>{isHindi ? "पुर्जे को दबाकर (या टच करके) कहीं भी खिसकाएं (drag & drop)।" : "Click and hold to drag any part around."}</li>
                        <li>{isHindi ? "पुर्जे को 90° घुमाने के लिए उस पर डबल-क्लिक करें या नीचे दिए गए 'घुमाएं' बटन का इस्तेमाल करें।" : "Double-click a part, or select it and click the 'Rotate' button to spin it 90°."}</li>
                        <li>{isHindi ? "चिपकाएं (Snap) सेटिंग चालू रहने से पुर्जे ग्रिड और एक दूसरे के किनारों से अपने आप चिपकेंगे।" : "With 'Snap' enabled, edges will automatically stick to other parts and grid boundaries."}</li>
                        <li>{isHindi ? "ओवरलैपिंग या बाहर जाने वाले पुर्जे लाल रंग में दिखेंगे।" : "Overlapping parts or pieces that go beyond boundaries will highlight in warning red."}</li>
                      </ul>
                    </div>
                  </div>
                )}

                <div 
                  className="w-full max-w-4xl bg-slate-900 shadow-inner rounded-lg p-3 border-4 border-slate-800 overflow-auto select-none"
                >
                  <div className="w-full origin-top-left">
                    <svg 
                      id={`sheet-svg-${layout.sheetIndex}`}
                      viewBox={`0 0 ${svgW} ${svgH}`} 
                      className={`w-full h-auto max-h-[600px] ${editingSheetIndex === layout.sheetIndex ? 'cursor-move touch-none' : 'cursor-zoom-in'}`}
                      xmlns="http://www.w3.org/2000/svg"
                      onDoubleClick={() => {
                        if (editingSheetIndex !== layout.sheetIndex) {
                          handleOpenNewZoomWindow(layout.sheetIndex);
                        }
                      }}
                      onMouseMove={(e) => {
                        if (editingSheetIndex === layout.sheetIndex) {
                          handleSvgMouseMove(e, layout.width, layout.height, svgW, svgH);
                        }
                        if (hoverTooltip && hoverTooltip.sheetIndex === layout.sheetIndex) {
                          setHoverTooltip(prev => prev ? { ...prev, clientX: e.clientX, clientY: e.clientY } : null);
                        }
                      }}
                      onTouchMove={(e) => {
                        if (editingSheetIndex === layout.sheetIndex) {
                          handleSvgTouchMove(e, layout.width, layout.height, svgW, svgH);
                        }
                      }}
                      onMouseUp={handleEndDrag}
                      onTouchEnd={handleEndDrag}
                      onMouseLeave={handleEndDrag}
                    >
                      {/* Definitions for textures/patterns */}
                      <defs>
                        <pattern id="wood-grain" width="100" height="20" patternUnits="userSpaceOnUse">
                          <path d="M0 10 Q 25 5, 50 10 T 100 10" fill="none" stroke="#fef3c7" strokeWidth="0.8" opacity="0.3" />
                          <path d="M0 15 Q 25 12, 50 15 T 100 15" fill="none" stroke="#fef3c7" strokeWidth="0.5" opacity="0.15" />
                        </pattern>
                        <pattern id="kerf-pattern" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                          <rect width="2" height="6" fill="#f8fafc" />
                        </pattern>
                        <pattern id="waste-stripe" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                          <rect width="2" height="8" fill="#f1f5f9" />
                          <rect x="2" width="6" height="8" fill="#ffffff" />
                        </pattern>
                      </defs>

                    {/* 1. Sheet Background (raw plywood board representation) */}
                    <rect 
                      x={pad} 
                      y={pad} 
                      width={rawLMm} 
                      height={rawWMm} 
                      fill="#f3f4f6" 
                      stroke="#cbd5e1" 
                      strokeWidth="2" 
                      rx="3"
                    />

                    {/* Wood grain pattern background for aesthetic woodworking look */}
                    <rect 
                      x={pad} 
                      y={pad} 
                      width={rawLMm} 
                      height={rawWMm} 
                      fill="url(#wood-grain)" 
                      opacity="0.8"
                      pointerEvents="none"
                    />

                    {/* Heatmap Overlay */}
                    {renderHeatmapOverlay(pad, rawLMm, rawWMm, currentParts, settings.trimMargin)}

                    {/* Grid Overlay */}
                    {showGrid && (() => {
                      const gridSpacingMm = unit === 'Inch' ? 6 * 25.4 : unit === 'CM' ? 10 * 10 : 100;
                      
                      const verticalLines = [];
                      const horizontalLines = [];
                      
                      // Vertical grid lines (along X axis, from 0 to rawLMm)
                      for (let xMm = gridSpacingMm; xMm < rawLMm; xMm += gridSpacingMm) {
                        const xPos = pad + xMm;
                        const labelValue = Math.round(xMm / (unit === 'Inch' ? 25.4 : unit === 'CM' ? 10 : 1));
                        const labelText = unit === 'Inch' ? `${labelValue}"` : `${labelValue}`;
                        
                        verticalLines.push(
                          <g key={`grid-v-${xMm}`} className="opacity-40">
                            <line
                              x1={xPos}
                              y1={pad}
                              x2={xPos}
                              y2={pad + rawWMm}
                              stroke="#cbd5e1"
                              strokeWidth="0.8"
                              strokeDasharray="3,4"
                            />
                            {/* Minor coordinate text along the top of the sheet */}
                            <text
                              x={xPos}
                              y={pad + 12}
                              textAnchor="middle"
                              fill="#94a3b8"
                              fontSize="7"
                              fontWeight="bold"
                              className="select-none pointer-events-none"
                            >
                              {labelText}
                            </text>
                          </g>
                        );
                      }
                      
                      // Horizontal grid lines (along Y axis, from 0 to rawWMm)
                      for (let yMm = gridSpacingMm; yMm < rawWMm; yMm += gridSpacingMm) {
                        const yPos = pad + yMm;
                        const labelValue = Math.round(yMm / (unit === 'Inch' ? 25.4 : unit === 'CM' ? 10 : 1));
                        const labelText = unit === 'Inch' ? `${labelValue}"` : `${labelValue}`;
                        
                        horizontalLines.push(
                          <g key={`grid-h-${yMm}`} className="opacity-40">
                            <line
                              x1={pad}
                              y1={yPos}
                              x2={pad + rawLMm}
                              y2={yPos}
                              stroke="#cbd5e1"
                              strokeWidth="0.8"
                              strokeDasharray="3,4"
                            />
                            {/* Minor coordinate text along the left of the sheet */}
                            <text
                              x={pad + 4}
                              y={yPos + 2.5}
                              textAnchor="start"
                              fill="#94a3b8"
                              fontSize="7"
                              fontWeight="bold"
                              className="select-none pointer-events-none"
                            >
                              {labelText}
                            </text>
                          </g>
                        );
                      }
                      
                      return (
                        <g id={`sheet-grid-overlay-${layout.sheetIndex}`}>
                          {verticalLines}
                          {horizontalLines}
                        </g>
                      );
                    })()}

                    {/* Scale Rulers */}
                    {showRuler && (() => {
                      const ticks = [];
                      
                      // Tick spacing configuration
                      let minorStepMm = 25.4; // 1 inch
                      if (unit === 'CM') {
                        minorStepMm = 10; // 1 cm
                      } else if (unit === 'MM') {
                        minorStepMm = 10; // 10 mm
                      }
                      
                      // 1. Horizontal top ruler (Length)
                      ticks.push(
                        <line
                          key="ruler-h-base"
                          x1={pad}
                          y1={pad - 5}
                          x2={pad + rawLMm}
                          y2={pad - 5}
                          stroke="#475569"
                          strokeWidth="1.5"
                        />
                      );
                      
                      // 2. Vertical left ruler (Width)
                      ticks.push(
                        <line
                          key="ruler-v-base"
                          x1={pad - 5}
                          y1={pad}
                          x2={pad - 5}
                          y2={pad + rawWMm}
                          stroke="#475569"
                          strokeWidth="1.5"
                        />
                      );
                      
                      // Ticks for Horizontal Top Ruler (0 to rawLMm)
                      const steps = Math.round(rawLMm / minorStepMm);
                      for (let i = 0; i <= steps; i++) {
                        const mm = i * minorStepMm;
                        const xPos = pad + mm;
                        if (xPos > pad + rawLMm + 0.1) continue;
                        
                        let isMajor = false;
                        let isMedium = false;
                        let val = i;
                        
                        if (unit === 'Inch') {
                          isMajor = i % 12 === 0;
                          isMedium = !isMajor && i % 6 === 0;
                        } else if (unit === 'CM') {
                          isMajor = i % 10 === 0;
                          isMedium = !isMajor && i % 5 === 0;
                        } else if (unit === 'MM') {
                          isMajor = i % 10 === 0;
                          isMedium = !isMajor && i % 5 === 0;
                          val = i * 10;
                        }
                        
                        let tickLen = 4;
                        if (isMajor) tickLen = 10;
                        else if (isMedium) tickLen = 6;
                        
                        ticks.push(
                          <line
                            key={`tick-h-${i}`}
                            x1={xPos}
                            y1={pad - 5 - tickLen}
                            x2={xPos}
                            y2={pad - 5}
                            stroke="#94a3b8"
                            strokeWidth={isMajor ? "1.2" : "0.8"}
                          />
                        );
                        
                        if (isMajor) {
                          const labelText = unit === 'Inch' ? `${val}"` : `${val}`;
                          ticks.push(
                            <text
                              key={`tick-h-txt-${i}`}
                              x={xPos}
                              y={pad - 22}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              fill="#cbd5e1"
                              fontSize="10"
                              fontWeight="bold"
                              className="select-none pointer-events-none drop-shadow-md"
                            >
                              {labelText}
                            </text>
                          );
                        }
                      }
                      
                      // Ticks for Vertical Left Ruler (0 to rawWMm)
                      const vSteps = Math.round(rawWMm / minorStepMm);
                      for (let i = 0; i <= vSteps; i++) {
                        const mm = i * minorStepMm;
                        const yPos = pad + mm;
                        if (yPos > pad + rawWMm + 0.1) continue;
                        
                        let isMajor = false;
                        let isMedium = false;
                        let val = i;
                        
                        if (unit === 'Inch') {
                          isMajor = i % 12 === 0;
                          isMedium = !isMajor && i % 6 === 0;
                        } else if (unit === 'CM') {
                          isMajor = i % 10 === 0;
                          isMedium = !isMajor && i % 5 === 0;
                        } else if (unit === 'MM') {
                          isMajor = i % 10 === 0;
                          isMedium = !isMajor && i % 5 === 0;
                          val = i * 10;
                        }
                        
                        let tickLen = 4;
                        if (isMajor) tickLen = 10;
                        else if (isMedium) tickLen = 6;
                        
                        ticks.push(
                          <line
                            key={`tick-v-${i}`}
                            x1={pad - 5 - tickLen}
                            y1={yPos}
                            x2={pad - 5}
                            y2={yPos}
                            stroke="#94a3b8"
                            strokeWidth={isMajor ? "1.2" : "0.8"}
                          />
                        );
                        
                        if (isMajor) {
                          const labelText = unit === 'Inch' ? `${val}"` : `${val}`;
                          ticks.push(
                            <text
                              key={`tick-v-txt-${i}`}
                              x={pad - 20}
                              y={yPos}
                              textAnchor="end"
                              dominantBaseline="middle"
                              fill="#cbd5e1"
                              fontSize="10"
                              fontWeight="bold"
                              className="select-none pointer-events-none drop-shadow-md"
                            >
                              {labelText}
                            </text>
                          );
                        }
                      }
                      
                      return <g id={`scale-rulers-${layout.sheetIndex}`}>{ticks}</g>;
                    })()}

                    {/* 2. Trim Boundary Line (dashed) */}
                    {T > 0 && (
                      <rect 
                        x={pad + padLeft} 
                        y={pad + padTop} 
                        width={rawLMm - padLeft - padRight} 
                        height={rawWMm - padTop - padBottom} 
                        fill="none" 
                        stroke="#94a3b8" 
                        strokeWidth="1.5" 
                        strokeDasharray="4,4" 
                      />
                    )}

                    {/* Trim label */}
                    {T > 0 && (
                      <text 
                        x={pad + Math.max(padLeft, 4)} 
                        y={pad + Math.max(padTop - 4, 20)} 
                        fill="#64748b" 
                        fontSize="24" 
                        fontWeight="semibold"
                      >
                        {isHindi ? `ट्रिम सीमा (${T}mm)` : `Trim border (${T}mm)`}
                      </text>
                    )}

                     {/* 3b. Waste Rectangles (Off-cuts) - Hide when editing this sheet manually to avoid overlay issues */}
                    {editingSheetIndex !== layout.sheetIndex && layout.wasteRects?.map((waste, wIdx) => {
                      const wasteX = pad + padLeft + waste.x;
                      const wasteY = pad + padTop + waste.y;
                      const drawW = waste.w;
                      const drawH = waste.h;

                      return (
                        <g key={`waste-${wIdx}`} className="cursor-help">
                          {/* Waste Base Rectangle */}
                          <rect 
                            x={wasteX} 
                            y={wasteY} 
                            width={drawW} 
                            height={drawH} 
                            fill="url(#waste-stripe)" 
                            stroke="#cbd5e1" 
                            strokeWidth="1" 
                            strokeDasharray="4,3"
                            rx="1.5"
                          />

                          {/* Dimensions Text inside Waste Piece */}
                          {drawW > 50 && drawH > 25 ? (
                            <>
                              <text 
                                x={wasteX + drawW / 2} 
                                y={wasteY + drawH / 2 - 4} 
                                textAnchor="middle" 
                                dominantBaseline="middle"
                                fill="#94a3b8" 
                                fontSize="22" 
                                fontWeight="bold"
                                className="select-none pointer-events-none"
                              >
                                {isHindi ? 'कतरन' : 'Waste'}
                              </text>
                              <text 
                                x={wasteX + drawW / 2} 
                                y={wasteY + drawH / 2 + 6} 
                                textAnchor="middle" 
                                dominantBaseline="middle"
                                fill="#64748b" 
                                fontSize="22" 
                                fontWeight="semibold"
                                className="select-none pointer-events-none"
                              >
                                {formatDim(waste.w)} x {formatDim(waste.h)}
                              </text>
                            </>
                          ) : drawW > 30 && drawH > 15 ? (
                            <text 
                              x={wasteX + drawW / 2} 
                              y={wasteY + drawH / 2} 
                              textAnchor="middle" 
                              dominantBaseline="middle"
                              fill="#64748b" 
                              fontSize="20" 
                              fontWeight="bold"
                              className="select-none pointer-events-none"
                            >
                              {formatDim(Math.min(waste.w, waste.h))}
                            </text>
                          ) : null}

                          {/* Tooltip for waste pieces */}
                          <title>
                            {isHindi ? 'कतरन का टुकड़ा (Waste Off-cut)' : 'Waste Off-cut'}&#10;
                            {isHindi ? 'साइज़' : 'Size'}: {formatDim(waste.w)} x {formatDim(waste.h)}&#10;
                            {isHindi ? 'क्षेत्रफल' : 'Area'}: {((waste.w * waste.h) / 100).toFixed(1)} cm²
                          </title>
                        </g>
                      );
                    })}

                     {/* 3. Placed Parts (Interactive in Puzzle Mode, static otherwise) */}
                    {(() => {
                      const isEditingThisSheet = editingSheetIndex === layout.sheetIndex;
                      const activeParts = isEditingThisSheet ? editingParts : layout.parts;
                      
                      const { hasCollision, isOutOfBounds } = isEditingThisSheet 
                        ? getCollisionStatus(editingParts, layout.width, layout.height)
                        : { hasCollision: new Set<string>(), isOutOfBounds: new Set<string>() };

                      return activeParts.map((part, pIdx) => {
                        const partX = pad + padLeft + part.x;
                        const partY = pad + padTop + part.y;
                        const drawW = Math.max(1, part.w - K);
                        const drawH = Math.max(1, part.h - K);
                        
                        const isColliding = hasCollision.has(part.id);
                        const isOOB = isOutOfBounds.has(part.id);
                        const isSelected = isEditingThisSheet && selectedPartId === part.id;
                        
                        // Pick color based on name/index
                        let rectFill = getPartColor(part.name, pIdx);
                        let strokeColor = "#334155";
                        let strokeW = "1";
                        let strokeDash = undefined;
                        
                        const isActiveCuttingPart = activeStep && activeStep.affectedPartIds?.includes(part.id);
                        const isPastCuttingPart = showStepSequencer && pastCutPartIds.has(part.id);

                        if (isEditingThisSheet) {
                          if (isColliding || isOOB) {
                            rectFill = "#fca5a5"; // Soft red
                            strokeColor = "#dc2626"; // Hard red
                            strokeW = "2";
                            strokeDash = "3,3";
                          } else if (isSelected) {
                            strokeColor = "#4f46e5"; // Indigo select glow
                            strokeW = "2.5";
                          }
                        } else if (isPastCuttingPart) {
                          rectFill = "#f8fafc"; // slate-50
                          strokeColor = "#cbd5e1"; // slate-300
                        }

                        return (
                          <g 
                            key={part.internalId || part.id} 
                            className={`group/part ${isEditingThisSheet ? 'cursor-grab active:cursor-grabbing' : 'cursor-help'}`}
                            onMouseDown={(e) => {
                              if (isEditingThisSheet) {
                                handlePartMouseDown(e, part.internalId || part.id, part.x, part.y);
                              }
                            }}
                            onTouchStart={(e) => {
                              if (isEditingThisSheet) {
                                handlePartTouchStart(e, part.internalId || part.id, part.x, part.y);
                              }
                            }}
                            onDoubleClick={() => {
                              if (isEditingThisSheet) {
                                handleRotatePart(part.internalId || part.id);
                              }
                            }}
                          >
                            {(() => {
                              const cells = [{
                                cellX: partX,
                                cellY: partY,
                                cellW: drawW,
                                cellH: drawH,
                                key: part.id
                              }];
                              
                              return cells.map((cell) => {
                                const cx = cell.cellX;
                                const cy = cell.cellY;
                                const cw = cell.cellW;
                                const ch = cell.cellH;
                                const textFill = getContrastColor(rectFill);
                                
                                // Map original edges to the rendered orientation
                                let renderT = part.edges.T;
                                let renderB = part.edges.B;
                                let renderL = part.edges.L;
                                let renderR = part.edges.R;
                                
                                if (part.isRotated) {
                                  renderT = part.edges.R;
                                  renderB = part.edges.L;
                                  renderL = part.edges.T;
                                  renderR = part.edges.B;
                                }
                                return (
                                  <g key={cell.key}>
                                    {/* Part Board Base Rectangle */}
                                    <rect
                                      x={cx}
                                      y={cy}
                                      width={cw}
                                      height={ch}
                                      fill={rectFill}
                                      stroke={strokeColor}
                                      strokeWidth={strokeW}
                                      strokeDasharray={strokeDash}
                                      rx="1.5"
                                      className={isSelected ? "filter drop-shadow-[0_0_4px_rgba(79,70,229,0.4)]" : ""}
                                    />
                                    {/* Edge Banding Visual Indicators */}
                                    {settings.edgeTh > 0 && renderT && (
                                      <line
                                        x1={cx + 1.5}
                                        y1={cy + 1.5}
                                        x2={cx + cw - 1.5}
                                        y2={cy + 1.5}
                                        stroke="#ea580c"
                                        strokeWidth="3.5"
                                        strokeDasharray="3,2"
                                      />
                                    )}
                                    {settings.edgeTh > 0 && renderB && (
                                      <line
                                        x1={cx + 1.5}
                                        y1={cy + ch - 1.5}
                                        x2={cx + cw - 1.5}
                                        y2={cy + ch - 1.5}
                                        stroke="#ea580c"
                                        strokeWidth="3.5"
                                        strokeDasharray="3,2"
                                      />
                                    )}
                                    {settings.edgeTh > 0 && renderL && (
                                      <line
                                        x1={cx + 1.5}
                                        y1={cy + 1.5}
                                        x2={cx + 1.5}
                                        y2={cy + ch - 1.5}
                                        stroke="#ea580c"
                                        strokeWidth="3.5"
                                        strokeDasharray="3,2"
                                      />
                                    )}
                                    {settings.edgeTh > 0 && renderR && (
                                      <line
                                        x1={cx + cw - 1.5}
                                        y1={cy + 1.5}
                                        x2={cx + cw - 1.5}
                                        y2={cy + ch - 1.5}
                                        stroke="#ea580c"
                                        strokeWidth="3.5"
                                        strokeDasharray="3,2"
                                      />
                                    )}
                                    {/* Text Labels inside Part */}
                                    {cw > 45 && ch > 25 ? (
                                      <>
                                        <text
                                          x={cx + cw / 2}
                                          y={cy + ch / 2 - (ch > 40 ? 4 : 0)}
                                          textAnchor="middle"
                                          fill={textFill}
                                          fontSize={ch > 40 ? "11" : "9"}
                                          fontWeight="bold"
                                          className="select-none pointer-events-none drop-shadow-sm"
                                        >
                                          {part.name}
                                        </text>
                                        {ch > 40 && (
                                          <text
                                            x={cx + cw / 2}
                                            y={cy + ch / 2 + 10}
                                            textAnchor="middle"
                                            fill={textFill}
                                            fontSize="8"
                                            opacity="0.85"
                                            className="select-none pointer-events-none"
                                          >
                                            {formatDim(part.origL)} x {formatDim(part.origW)}
                                          </text>
                                        )}
                                      </>
                                    ) : null}
                                  </g>
                                );
                              });
                            })()}
                          </g>
                        );
                      });
                    })()}

                    {/* LIVE CUT MAPPING OVERLAY (GLOBAL) */}
                    {activeStep && showStepSequencer && (
                      <g className="pointer-events-none z-50">
                        {activeStep.direction === 'VERTICAL' ? (
                          <>
                            <line 
                              x1={pad + T + activeStep.position} 
                              y1={0} 
                              x2={pad + T + activeStep.position} 
                              y2={svgH} 
                              stroke="#f43f5e" 
                              strokeWidth="3.5" 
                              strokeDasharray="10,5" 
                            />
                            <circle cx={pad + T + activeStep.position} cy={pad / 2} r="12" fill="#f43f5e" />
                            <text x={pad + T + activeStep.position} y={pad / 2} textAnchor="middle" dominantBaseline="central" fill="white" fontSize="14">✂️</text>
                          </>
                        ) : (
                          <>
                            <line 
                              x1={0} 
                              y1={pad + T + activeStep.position} 
                              x2={svgW} 
                              y2={pad + T + activeStep.position} 
                              stroke="#f43f5e" 
                              strokeWidth="3.5" 
                              strokeDasharray="10,5" 
                            />
                            <circle cx={pad / 2} cy={pad + T + activeStep.position} r="12" fill="#f43f5e" />
                            <text x={pad / 2} y={pad + T + activeStep.position} textAnchor="middle" dominantBaseline="central" fill="white" fontSize="14">✂️</text>
                          </>
                        )}
                      </g>
                    )}
                  </svg>
                </div>
              </div>

                <PlacedPartsTable
                  layout={layout}
                  translations={translations}
                  isHindi={isHindi}
                  unit={unit}
                  edgeTh={settings.edgeTh}
                  getPartColor={getPartColor}
                  formatDimPair={formatDimPair}
                  getEdgeBandingSummary={getEdgeBandingSummary}
                  getSunmicaName={getSunmicaName}
                  convertMmToUnit={convertMmToUnit}
                />

                <OffcutsTable
                  layout={layout}
                  settings={settings}
                  savedOffcuts={savedOffcuts}
                  isHindi={isHindi}
                  onUpdateSettings={onUpdateSettings}
                  handleSaveOffcut={handleSaveOffcut}
                  formatDim={formatDim}
                />
              </div>

              {/* 3.6. 📋 Sahira: Visual Cutting Guide & Sequencer */}
              {showStepSequencer && (
                <SahiraSequencer
                  layout={layout}
                  settings={settings}
                  isHindi={isHindi}
                  activeStepIndices={activeStepIndices}
                  setActiveStepIndices={setActiveStepIndices}
                  completedSteps={completedSteps}
                  toggleStepCompleted={toggleStepCompleted}
                  convertMmToUnit={convertMmToUnit}
                  getPartColor={getPartColor}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Grand Total Summary Node */}
      {layouts.length > 0 && (
        <GrandTotalSummary
          layouts={layouts}
          isHindi={isHindi}
          translations={translations}
          showGrandSummary={showGrandSummary}
          setShowGrandSummary={setShowGrandSummary}
          settings={settings}
        />
      )}
      {/* Floating Tooltip */}
      {hoverTooltip && (
        <div 
          className="fixed z-50 pointer-events-none bg-slate-900 text-white p-3 rounded-lg shadow-xl border border-slate-700 transform -translate-x-1/2 -translate-y-full flex flex-col gap-1"
          style={{ left: hoverTooltip.clientX, top: hoverTooltip.clientY - 15 }}
        >
          <div className="font-bold text-sm text-amber-400">{hoverTooltip.name}</div>
          <div className="text-xs font-mono text-slate-200">
            Dimensions: {convertMmToUnit(hoverTooltip.w, unit).toFixed(1)} × {convertMmToUnit(hoverTooltip.h, unit).toFixed(1)} {unit}
          </div>
          <div className="text-xs font-mono text-slate-400">
            Position: {convertMmToUnit(hoverTooltip.x, unit).toFixed(1)}, {convertMmToUnit(hoverTooltip.y, unit).toFixed(1)}
          </div>
        </div>
      )}
    </div>
  );
}
