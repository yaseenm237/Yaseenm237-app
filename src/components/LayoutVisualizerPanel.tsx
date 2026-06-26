/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PackingResult, Language, SheetSettings, PackedPart, SheetLayout } from '../types';
import { convertMmToUnit, convertToMm, getEdgeBandingSummary } from '../utils/packer';
import { Download, Printer, Layout, Percent, ClipboardCheck, Ruler, AlertCircle, ZoomIn, ZoomOut, Sliders, Check, X, RotateCw, Undo2 } from 'lucide-react';

interface LayoutVisualizerPanelProps {
  result: PackingResult;
  settings: SheetSettings;
  language: Language;
  translations: any;
  onPrint: () => void;
  onExportCsv: () => void;
  onExportJson: () => void;
}

// Generate unique colors based on part name/size
const COLOR_PALETTE = [
  '#dbeafe', // light blue
  '#fef3c7', // light amber
  '#d1fae5', // light emerald
  '#f3e8ff', // light purple
  '#ffe4e6', // light rose
  '#ccfbf1', // light teal
  '#ffedd5', // light orange
  '#e0e7ff', // light indigo
  '#f1f5f9', // light slate
  '#fae8ff', // light fuchsia
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
  onExportJson
}: LayoutVisualizerPanelProps) {
  const isHindi = language === 'Hindi';

  // Manual Puzzle / Override states
  const [customLayoutOverrides, setCustomLayoutOverrides] = useState<Record<number, SheetLayout>>({});
  const [editingSheetIndex, setEditingSheetIndex] = useState<number | null>(null);
  const [editingParts, setEditingParts] = useState<PackedPart[]>([]);
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ clientX: number; clientY: number; startX: number; startY: number; partId: string } | null>(null);
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);

  // Only clear overrides when physical sheet dimensions, unit, trim margin, or blade thickness parameters change
  const lastSettingsRef = React.useRef({
    sheetL: settings.sheetL,
    sheetW: settings.sheetW,
    unit: settings.unit,
    trimMargin: settings.trimMargin,
    bladeTh: settings.bladeTh,
  });

  React.useEffect(() => {
    const prev = lastSettingsRef.current;
    if (
      prev.sheetL !== settings.sheetL ||
      prev.sheetW !== settings.sheetW ||
      prev.unit !== settings.unit ||
      prev.trimMargin !== settings.trimMargin ||
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
      bladeTh: settings.bladeTh,
    };
  }, [settings.sheetL, settings.sheetW, settings.unit, settings.trimMargin, settings.bladeTh]);

  const [zoom, setZoom] = useState(100);
  const [showGrid, setShowGrid] = useState(true);
  const [showRuler, setShowRuler] = useState(true);
  const [showGrandSummary, setShowGrandSummary] = useState(false);
  const [showCutSequence, setShowCutSequence] = useState(false);

  const S_L = settings.sheetL;
  const S_W = settings.sheetW;
  const unit = settings.unit;
  const K = settings.bladeTh; // Kerf in mm
  const T = settings.trimMargin; // Trim in mm

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
      const target = prev.find(p => p.id === partId);
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
          if (other.id === partId) continue;

          // Align X to other's left or right
          if (Math.abs(finalX - other.x) < SNAP_THRESHOLD) finalX = other.x;
          else if (Math.abs(finalX + target.w - other.x) < SNAP_THRESHOLD) finalX = other.x - target.w;
          else if (Math.abs(finalX - (other.x + other.w)) < SNAP_THRESHOLD) finalX = other.x + other.w;
          else if (Math.abs(finalX + target.w - (other.x + other.w)) < SNAP_THRESHOLD) finalX = other.x + other.w - target.w;

          // Align Y to other's top or bottom
          if (Math.abs(finalY - other.y) < SNAP_THRESHOLD) finalY = other.y;
          else if (Math.abs(finalY + target.h - other.y) < SNAP_THRESHOLD) finalY = other.y - target.h;
          else if (Math.abs(finalY - (other.y + other.h)) < SNAP_THRESHOLD) finalY = other.y + other.h;
          else if (Math.abs(finalY + target.h - (other.y + other.h)) < SNAP_THRESHOLD) finalY = other.y + other.h - target.h;
        }
      }

      // Constrain inside boundaries after snapping
      finalX = Math.max(0, Math.min(usableW - target.w, finalX));
      finalY = Math.max(0, Math.min(usableH - target.h, finalY));

      return prev.map(p => p.id === partId ? { ...p, x: finalX, y: finalY } : p);
    });
  };

  const handleRotatePart = (partId: string) => {
    setEditingParts(prev => {
      return prev.map(p => {
        if (p.id !== partId) return p;
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

  return (
    <div id="visualizer-panel" className="flex flex-col gap-6">
      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Efficiency */}
        <div className="bg-indigo-900 text-white rounded-2xl p-6 shadow-md shadow-indigo-100 flex flex-col justify-between h-full group hover:scale-[1.01] transition-transform duration-200">
          <div>
            <p className="text-xs font-bold text-indigo-300 uppercase tracking-widest">{translations.efficiency}</p>
            <h3 className="text-4xl font-light mt-4 tracking-tight">
              {totalUtilization.toFixed(1)}<span className="text-xl font-medium">%</span>
            </h3>
          </div>
          <div className="mt-4">
            <div className="w-full bg-indigo-950/60 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-400 h-full rounded-full transition-all duration-500" 
                style={{ width: `${totalUtilization}%` }}
              />
            </div>
            <span className="text-[10px] text-indigo-200 font-semibold mt-2 block">
              {isHindi ? 'मटीरियल का उत्कृष्ट उपयोग' : 'Excellent material nesting'}
            </span>
          </div>
        </div>

        {/* Waste */}
        <div className="bg-slate-950 text-white rounded-2xl p-6 shadow-md flex flex-col justify-between h-full group hover:scale-[1.01] transition-transform duration-200">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{translations.waste}</p>
            <h3 className="text-4xl font-light mt-4 tracking-tight">
              {overallWastePercent.toFixed(1)}<span className="text-xl font-medium">%</span>
            </h3>
          </div>
          <div className="mt-4">
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-amber-400 h-full rounded-full transition-all duration-500" 
                style={{ width: `${overallWastePercent}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400 font-semibold mt-2 block">
              {isHindi ? 'बचा हुआ कतरन भाग' : 'Off-cuts & sawdust loss'}
            </span>
          </div>
        </div>

        {/* Sheets Used */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between h-full group hover:scale-[1.01] transition-transform duration-200">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{translations.sheets_used}</p>
            <h3 className="text-4xl font-light text-slate-900 mt-4 tracking-tight">
              {totalSheetsUsed} <span className="text-lg text-slate-400 font-medium">/ {settings.stock}</span>
            </h3>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] text-slate-500 font-semibold">
              {isHindi ? 'मटीरियल स्टॉक' : 'Stock availability'}
            </span>
          </div>
        </div>

        {/* Edge Banding length */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between h-full group hover:scale-[1.01] transition-transform duration-200">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{translations.total_banding}</p>
            <h3 className="text-3xl font-light text-slate-900 mt-4 tracking-tight">
              {convertMmToUnit(totalBandingLength, unit).toFixed(1)}
              <span className="text-base text-slate-400 font-bold ml-1">{unit}</span>
            </h3>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span className="text-[10px] text-slate-500 font-semibold">
              {isHindi ? 'लागत आकलन हेतु सहायक' : 'Helps in banding estimation'}
            </span>
          </div>
        </div>

        {/* Estimated Material Cost */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between h-full group hover:scale-[1.01] transition-transform duration-200">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              {isHindi ? 'कुल सामग्री लागत' : 'Material Cost'}
            </p>
            <h3 className="text-3xl font-light text-slate-900 mt-4 tracking-tight">
              <span className="text-xl text-slate-400 font-bold mr-0.5">{isHindi ? '₹' : '$'}</span>
              {(totalSheetsUsed * (settings.sheetCost || 0)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-600" />
            <span className="text-[10px] text-slate-500 font-semibold">
              {isHindi ? `${settings.sheetCost || 0}/शीट के हिसाब से` : `@ ${isHindi ? '₹' : '$'}${settings.sheetCost || 0} per sheet`}
            </span>
          </div>
        </div>
      </div>

      {/* Unplaced Parts Warning Card */}
      {unplacedParts.length > 0 && (
        <div id="unplaced-warning" className="bg-rose-50/75 border border-rose-200 rounded-2xl p-5 shadow-sm flex items-start gap-4">
          <div className="p-2 bg-rose-100 text-rose-700 rounded-xl shrink-0 mt-0.5 animate-bounce">
            <AlertCircle size={20} />
          </div>
          <div>
            <h4 className="font-bold text-rose-800 text-sm">{translations.unplaced_title}</h4>
            <p className="text-xs text-rose-700 mt-1">{translations.unplaced_desc}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {unplacedParts.map((p, idx) => (
                <span key={idx} className="bg-rose-100/80 text-rose-800 text-xs font-bold px-2.5 py-1 rounded-xl border border-rose-200">
                  {p.name}: {p.qty} Qty
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Action bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
          <ClipboardCheck size={18} className="text-indigo-600" />
          {isHindi ? 'लेआउट अनुकूलन परिणाम' : 'Cutting Layout Results'}
        </h3>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 p-1.5 rounded-xl shrink-0">
            <button
              id="zoom-out-btn"
              type="button"
              onClick={() => setZoom(prev => Math.max(100, prev - 25))}
              disabled={zoom <= 100}
              className="p-1 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-white disabled:opacity-40 disabled:hover:bg-transparent transition-all cursor-pointer"
              title={isHindi ? "ज़ूम आउट" : "Zoom Out"}
            >
              <ZoomOut size={15} />
            </button>
            <span className="text-[11px] font-extrabold text-slate-600 px-1 min-w-[32px] text-center">
              {zoom}%
            </span>
            <button
              id="zoom-in-btn"
              type="button"
              onClick={() => setZoom(prev => Math.min(300, prev + 25))}
              disabled={zoom >= 300}
              className="p-1 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-white disabled:opacity-40 disabled:hover:bg-transparent transition-all cursor-pointer"
              title={isHindi ? "ज़ूम इन" : "Zoom In"}
            >
              <ZoomIn size={15} />
            </button>
          </div>

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
          const pad = 30;
          const svgW = rawLMm + 2 * pad;
          const svgH = rawWMm + 2 * pad;

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
                  <div className="text-right mr-2 hidden md:block">
                    <span className="bg-emerald-50 border border-emerald-100 text-emerald-800 font-extrabold text-xs px-3 py-1.5 rounded-xl">
                      {translations.efficiency}: {((layout.usedArea / layout.totalArea) * 100).toFixed(1)}%
                    </span>
                    <span className="ml-2 bg-indigo-50 border border-indigo-100 text-indigo-800 font-extrabold text-xs px-3 py-1.5 rounded-xl">
                      {translations.sheet_waste}: {layout.wastePercent.toFixed(1)}%
                    </span>
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
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSheetIndex(layout.sheetIndex);
                          setEditingParts([...layout.parts]);
                          setSelectedPartId(null);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-extrabold px-3.5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors shadow-md shadow-indigo-100"
                        title={isHindi ? "इस शीट को खुद सेट करें" : "Edit sheet layout manually"}
                      >
                        <Sliders size={12} />
                        {isHindi ? "कारपेंटर स्केलिंग" : "Carpenter Scaling"}
                      </button>
                      
                      {customLayoutOverrides[layout.sheetIndex] && (
                        <button
                          type="button"
                          onClick={() => {
                            setCustomLayoutOverrides(prev => {
                              const copy = { ...prev };
                              delete copy[layout.sheetIndex];
                              return copy;
                            });
                          }}
                          className="bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-extrabold px-3.5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
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

                <div className="w-full max-w-4xl bg-slate-900 shadow-inner rounded-lg p-3 border-4 border-slate-800 overflow-auto select-none">
                  <div 
                    style={{ 
                      width: `${zoom}%`, 
                      minWidth: '100%',
                      maxWidth: zoom > 100 ? 'none' : '100%',
                    }} 
                    className="transition-all duration-200 origin-top-left"
                  >
                    <svg 
                      viewBox={`0 0 ${svgW} ${svgH}`} 
                      className={`w-full h-auto max-h-[600px] ${editingSheetIndex === layout.sheetIndex ? 'cursor-move touch-none' : ''}`}
                      xmlns="http://www.w3.org/2000/svg"
                      onMouseMove={(e) => {
                        if (editingSheetIndex === layout.sheetIndex) {
                          handleSvgMouseMove(e, layout.width, layout.height, svgW, svgH);
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

                    {/* Outer Scale Rulers */}
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
                              y={pad - 18}
                              textAnchor="middle"
                              fill="#f8fafc"
                              fontSize="8"
                              fontWeight="bold"
                              className="select-none pointer-events-none"
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
                              x={pad - 18}
                              y={yPos + 3}
                              textAnchor="end"
                              fill="#f8fafc"
                              fontSize="8"
                              fontWeight="bold"
                              className="select-none pointer-events-none"
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
                        x={pad + T} 
                        y={pad + T} 
                        width={rawLMm - 2 * T} 
                        height={rawWMm - 2 * T} 
                        fill="none" 
                        stroke="#94a3b8" 
                        strokeWidth="1.5" 
                        strokeDasharray="4,4" 
                      />
                    )}

                    {/* Trim label */}
                    {T > 0 && (
                      <text 
                        x={pad + T + 4} 
                        y={pad + T - 4} 
                        fill="#64748b" 
                        fontSize="9" 
                        fontWeight="semibold"
                      >
                        {isHindi ? `ट्रिम सीमा (${T}mm)` : `Trim border (${T}mm)`}
                      </text>
                    )}

                     {/* 3b. Waste Rectangles (Off-cuts) - Hide when editing this sheet manually to avoid overlay issues */}
                    {editingSheetIndex !== layout.sheetIndex && layout.wasteRects?.map((waste, wIdx) => {
                      const wasteX = pad + T + waste.x;
                      const wasteY = pad + T + waste.y;
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
                                fontSize="8" 
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
                                fontSize="8" 
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
                              fontSize="7" 
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
                        const partX = pad + T + part.x;
                        const partY = pad + T + part.y;
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
                        }

                        return (
                          <g 
                            key={part.id} 
                            className={`group/part ${isEditingThisSheet ? 'cursor-grab active:cursor-grabbing' : 'cursor-help'}`}
                            onMouseDown={(e) => {
                              if (isEditingThisSheet) {
                                handlePartMouseDown(e, part.id, part.x, part.y);
                              }
                            }}
                            onTouchStart={(e) => {
                              if (isEditingThisSheet) {
                                handlePartTouchStart(e, part.id, part.x, part.y);
                              }
                            }}
                            onDoubleClick={() => {
                              if (isEditingThisSheet) {
                                handleRotatePart(part.id);
                              }
                            }}
                          >
                            {/* Part Board Base Rectangle */}
                            <rect 
                              x={partX} 
                              y={partY} 
                              width={drawW} 
                              height={drawH} 
                              fill={rectFill} 
                              stroke={strokeColor} 
                              strokeWidth={strokeW} 
                              strokeDasharray={strokeDash}
                              rx="1.5"
                              className={isSelected ? "filter drop-shadow-[0_0_4px_rgba(79,70,229,0.4)]" : ""}
                            />

                            {/* Edge Banding Visual Indicators */}
                            {part.edges.T && (
                              <line 
                                x1={partX + 1.5} 
                                y1={partY + 1.5} 
                                x2={partX + drawW - 1.5} 
                                y2={partY + 1.5} 
                                stroke="#ea580c" 
                                strokeWidth="3.5" 
                                strokeDasharray="3,2" 
                              />
                            )}
                            {part.edges.B && (
                              <line 
                                x1={partX + 1.5} 
                                y1={partY + drawH - 1.5} 
                                x2={partX + drawW - 1.5} 
                                y2={partY + drawH - 1.5} 
                                stroke="#ea580c" 
                                strokeWidth="3.5" 
                                strokeDasharray="3,2" 
                              />
                            )}
                            {part.edges.L && (
                              <line 
                                x1={partX + 1.5} 
                                y1={partY + 1.5} 
                                x2={partX + 1.5} 
                                y2={partY + drawH - 1.5} 
                                stroke="#ea580c" 
                                strokeWidth="3.5" 
                                strokeDasharray="3,2" 
                              />
                            )}
                            {part.edges.R && (
                              <line 
                                x1={partX + drawW - 1.5} 
                                y1={partY + 1.5} 
                                x2={partX + drawW - 1.5} 
                                y2={partY + drawH - 1.5} 
                                stroke="#ea580c" 
                                strokeWidth="3.5" 
                                strokeDasharray="3,2" 
                              />
                            )}

                            {/* Text Labels inside Part */}
                            {drawW > 45 && drawH > 25 ? (
                              <>
                                <text 
                                  x={partX + drawW / 2} 
                                  y={partY + drawH / 2 - 3} 
                                  textAnchor="middle" 
                                  dominantBaseline="middle"
                                  fill={isColliding || isOOB ? "#991b1b" : "#1e293b"} 
                                  fontSize={Math.min(11, drawW / 6)} 
                                  fontWeight="bold"
                                  className="select-none pointer-events-none"
                                >
                                  {part.name}
                                </text>
                                <text 
                                  x={partX + drawW / 2} 
                                  y={partY + drawH / 2 + 8} 
                                  textAnchor="middle" 
                                  dominantBaseline="middle"
                                  fill={isColliding || isOOB ? "#b91c1c" : "#475569"} 
                                  fontSize={Math.min(9, drawW / 7)} 
                                  fontWeight="semibold"
                                  className="select-none pointer-events-none"
                                >
                                  {formatDim(part.origL)} x {formatDim(part.origW)}
                                </text>
                              </>
                            ) : drawW > 25 && drawH > 15 ? (
                              <text 
                                x={partX + drawW / 2} 
                                y={partY + drawH / 2} 
                                textAnchor="middle" 
                                dominantBaseline="middle"
                                fill={isColliding || isOOB ? "#991b1b" : "#1e293b"} 
                                fontSize="8" 
                                fontWeight="bold"
                                className="select-none pointer-events-none"
                              >
                                {part.name.substring(0, 3)}..
                              </text>
                            ) : null}

                            {/* Rich Tooltip */}
                            <title>
                              {part.name}&#10;
                              {isHindi ? 'तैयार साइज़' : 'Finished Size'}: {formatDim(part.origL)} x {formatDim(part.origW)}&#10;
                              {isHindi ? 'कटिंग साइज़' : 'Cut Size (Net)'}: {part.cutL.toFixed(1)} x {part.cutW.toFixed(1)} mm&#10;
                              {isHindi ? 'एजबेंडिंग' : 'Banding'}: {getEdgeBandingSummary(part.edges, isHindi)}&#10;
                              {isHindi ? 'ग्रेन' : 'Grain'}: {part.grain === 'L' ? (isHindi ? 'लंबाई ↕' : 'Length ↕') : part.grain === 'W' ? (isHindi ? 'चौड़ाई ↔' : 'Width ↔') : (isHindi ? 'कोई नहीं' : 'None')}
                              {isEditingThisSheet && isColliding && `\n⚠️ ${isHindi ? 'ओवरलैप हो रहा है!' : 'Overlaps other parts!'}`}
                              {isEditingThisSheet && isOOB && `\n⚠️ ${isHindi ? 'शीट के बाहर है!' : 'Out of sheet bounds!'}`}
                            </title>
                          </g>
                        );
                      });
                    })()}

                    {/* 3.5. Cut Sequence Path */}
                    {showCutSequence && (() => {
                      const activeParts = editingSheetIndex === layout.sheetIndex ? editingParts : layout.parts;
                      if (activeParts.length === 0) return null;

                      // Sort parts by Y then X to simulate a top-to-bottom, left-to-right sequence
                      const sortedParts = [...activeParts].sort((a, b) => {
                        if (Math.abs(a.y - b.y) > 50) return a.y - b.y;
                        return a.x - b.x;
                      });

                      const points = sortedParts.map(p => {
                        return `${pad + T + p.x + (p.w - K) / 2},${pad + T + p.y + (p.h - K) / 2}`;
                      });

                      return (
                        <g id={`cut-sequence-${layout.sheetIndex}`}>
                          <polyline 
                            points={points.join(' ')} 
                            fill="none" 
                            stroke="#e11d48" 
                            strokeWidth="2" 
                            strokeDasharray="6,4"
                            className="opacity-80 drop-shadow-md"
                          />
                          {sortedParts.map((p, i) => {
                            const cx = pad + T + p.x + (p.w - K) / 2;
                            const cy = pad + T + p.y + (p.h - K) / 2;
                            return (
                              <g key={`seq-${p.id}`}>
                                <circle cx={cx} cy={cy} r="8" fill="#e11d48" stroke="#ffffff" strokeWidth="1.5" />
                                <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fill="#ffffff" fontSize="9" fontWeight="bold">
                                  {i + 1}
                                </text>
                              </g>
                            );
                          })}
                        </g>
                      );
                    })()}

                    {/* 4. Measurement lines (rulers) around the sheet */}
                    {/* Width Ruler (Right side) */}
                    <line 
                      x1={rawLMm + pad + 10} 
                      y1={pad} 
                      x2={rawLMm + pad + 10} 
                      y2={rawWMm + pad} 
                      stroke="#94a3b8" 
                      strokeWidth="1" 
                    />
                    <path d={`M ${rawLMm + pad + 7} ${pad} L ${rawLMm + pad + 13} ${pad}`} stroke="#94a3b8" strokeWidth="1" />
                    <path d={`M ${rawLMm + pad + 7} ${rawWMm + pad} L ${rawLMm + pad + 13} ${rawWMm + pad}`} stroke="#94a3b8" strokeWidth="1" />
                    <text 
                      x={rawLMm + pad + 15} 
                      y={rawWMm / 2 + pad} 
                      transform={`rotate(90, ${rawLMm + pad + 15}, ${rawWMm / 2 + pad})`}
                      textAnchor="middle" 
                      fill="#f8fafc" 
                      fontSize="9" 
                      fontWeight="bold"
                    >
                      {S_W} {unit}
                    </text>

                    {/* Length Ruler (Bottom side) */}
                    <line 
                      x1={pad} 
                      y1={rawWMm + pad + 10} 
                      x2={rawLMm + pad} 
                      y2={rawWMm + pad + 10} 
                      stroke="#94a3b8" 
                      strokeWidth="1" 
                    />
                    <path d={`M ${pad} ${rawWMm + pad + 7} L ${pad} ${rawWMm + pad + 13}`} stroke="#94a3b8" strokeWidth="1" />
                    <path d={`M ${rawLMm + pad} ${rawWMm + pad + 7} L ${rawLMm + pad} ${rawWMm + pad + 13}`} stroke="#94a3b8" strokeWidth="1" />
                    <text 
                      x={rawLMm / 2 + pad} 
                      y={rawWMm + pad + 22} 
                      textAnchor="middle" 
                      fill="#f8fafc" 
                      fontSize="9" 
                      fontWeight="bold"
                    >
                      {S_L} {unit}
                    </text>
                  </svg>
                  </div>
                </div>

                {/* Selected Part Panel for mobile and easy clicking */}
                {(() => {
                  if (editingSheetIndex !== layout.sheetIndex) return null;
                  const selectedPart = editingParts.find(p => p.id === selectedPartId);
                  
                  return (
                    <div className="w-full max-w-4xl mt-4 bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm animate-fade-in">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-indigo-600 text-white rounded-xl">
                          <Sliders size={16} />
                        </div>
                        <div>
                          {selectedPart ? (
                            <>
                              <p className="text-xs font-extrabold text-indigo-900">
                                {isHindi ? `चयनित पुर्जा: ${selectedPart.name}` : `Selected Part: ${selectedPart.name}`}
                              </p>
                              <p className="text-[10px] text-indigo-700 font-semibold mt-0.5">
                                {isHindi ? 'तैयार आकार' : 'Size'}: {formatDim(selectedPart.origL)} x {formatDim(selectedPart.origW)} | {isHindi ? 'स्थिति' : 'Coords'}: X={Math.round(selectedPart.x)}mm, Y={Math.round(selectedPart.y)}mm
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="text-xs font-extrabold text-slate-500">
                                {isHindi ? "किसी पुर्जे को सिलेक्ट करें" : "Select a part to modify"}
                              </p>
                              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                                {isHindi ? "घुमाने या खिसकाने के लिए किसी भी पुर्जे पर क्लिक करें।" : "Click any part on the sheet to rotate or align it."}
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {selectedPart && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleRotatePart(selectedPart.id)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer shadow-md shadow-indigo-100 transition-colors"
                          >
                            <RotateCw size={13} />
                            {isHindi ? "घुमाएं 90° (Rotate)" : "Rotate 90°"}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Tables Section: Parts & Waste side-by-side */}
              <div className="px-6 py-4 border-t border-slate-100 grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* 1. Placed Parts Table */}
                <div className="lg:col-span-7">
                  <h5 className="font-bold text-slate-700 text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-indigo-600 inline-block" />
                    {translations.sheet_parts_header}
                  </h5>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse min-w-[500px]">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 font-bold whitespace-nowrap">
                          <th className="pb-2">{translations.h_name}</th>
                          <th className="pb-2">{translations.part_size}</th>
                          <th className="pb-2">{translations.cut_size} (mm)</th>
                          <th className="pb-2">{translations.h_grain}</th>
                          <th className="pb-2">{translations.applied_banding}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                        {(() => {
                          const groupedParts = new Map<string, any>();
                          layout.parts.forEach(p => {
                            const key = `${p.name}_${p.origL}_${p.origW}_${p.cutL}_${p.cutW}_${p.grain}_${JSON.stringify(p.edges)}`;
                            if (groupedParts.has(key)) {
                              groupedParts.get(key)!.qty += 1;
                            } else {
                              groupedParts.set(key, { ...p, qty: 1 });
                            }
                          });
                          
                          return Array.from(groupedParts.values()).map((p, pIdx) => (
                            <tr key={pIdx} className="hover:bg-slate-50/50 whitespace-nowrap">
                              <td className="py-2 flex items-center gap-2">
                                <span 
                                  className="w-2.5 h-2.5 rounded-full inline-block border border-slate-300"
                                  style={{ backgroundColor: getPartColor(p.name, pIdx) }}
                                />
                                {p.name} {p.qty > 1 && <span className="text-xs font-bold bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded-full ml-1">x{p.qty}</span>}
                              </td>
                              <td className="py-2 text-slate-800 font-semibold">
                                {formatDim(p.origL)} x {formatDim(p.origW)}
                              </td>
                              <td className="py-2 font-mono text-slate-500">
                                {p.cutL.toFixed(1)} x {p.cutW.toFixed(1)}
                              </td>
                              <td className="py-2">
                                {p.grain === 'L' ? (isHindi ? 'लंबाई ↕' : 'Length ↕') : p.grain === 'W' ? (isHindi ? 'चौड़ाई ↔' : 'Width ↔') : (isHindi ? 'कोई नहीं' : 'None')}
                              </td>
                              <td className="py-2 text-indigo-600 font-semibold text-[11px]">
                                {getEdgeBandingSummary(p.edges, isHindi)}
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 2. Leftover Waste (Off-cuts) Table */}
                <div className="lg:col-span-5 bg-slate-50/50 rounded-xl p-4 border border-slate-100">
                  <h5 className="font-bold text-slate-700 text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-slate-400 inline-block" />
                    {isHindi ? 'बचे हुए कतरन के टुकड़े (Off-cuts)' : 'Leftover Waste Pieces (Off-cuts)'}
                  </h5>
                  
                  {layout.wasteRects && layout.wasteRects.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse min-w-[320px]">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-400 font-bold whitespace-nowrap">
                            <th className="pb-2">#</th>
                            <th className="pb-2">{isHindi ? 'आकार (Dimensions)' : 'Dimensions'}</th>
                            <th className="pb-2">{isHindi ? 'प्रकार' : 'Status'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                          {layout.wasteRects.map((w, wIdx) => {
                            // Determine if waste piece is highly reusable (e.g., larger than 300mm on both sides)
                            const isReusable = w.w >= 300 && w.h >= 300;
                            return (
                              <tr key={wIdx} className="hover:bg-slate-100/30 whitespace-nowrap">
                                <td className="py-2 text-[10px] text-slate-400 font-bold font-mono">
                                  W{wIdx + 1}
                                </td>
                                <td className="py-2 text-slate-700 font-semibold font-mono">
                                  {formatDim(w.w)} x {formatDim(w.h)}
                                </td>
                                <td className="py-2">
                                  {isReusable ? (
                                    <span className="bg-emerald-50 text-emerald-700 text-[9px] font-extrabold px-1.5 py-0.5 rounded border border-emerald-100">
                                      {isHindi ? 'पुनः प्रयोग योग्य' : 'Reusable'}
                                    </span>
                                  ) : (
                                    <span className="bg-slate-100 text-slate-500 text-[9px] font-bold px-1.5 py-0.5 rounded border border-slate-200/60">
                                      {isHindi ? 'छोटा कतरन' : 'Small scrap'}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic py-4">
                      {isHindi ? 'कोई कतरन टुकड़ा नहीं बचा!' : 'No significant waste pieces leftover!'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Grand Total Summary Node */}
      {layouts.length > 0 && (
        <div className="mt-8 bg-indigo-900 rounded-2xl p-6 text-white shadow-xl">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <span className="bg-indigo-500 p-1.5 rounded-lg">📋</span>
              {isHindi ? 'कुल सामग्री सारांश (Grand Total)' : 'Grand Total Summary'}
            </h3>
            <button
              onClick={() => setShowGrandSummary(!showGrandSummary)}
              className="bg-indigo-700 hover:bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md transition-colors"
            >
              {showGrandSummary 
                ? (isHindi ? 'सारांश छिपाएं' : 'Hide Summary') 
                : (isHindi ? 'सारांश दिखाएं' : 'Generate Summary')}
            </button>
          </div>
          
          {showGrandSummary && (
            <div className="bg-indigo-950/50 rounded-xl overflow-hidden border border-indigo-500/20 animate-in fade-in slide-in-from-top-4 duration-300">
              <table className="w-full text-left text-sm">
                <thead className="bg-indigo-900/80 text-indigo-200">
                  <tr>
                    <th className="py-3 px-4">{isHindi ? 'आइटम का नाम / आकार' : 'Item Name / Size'}</th>
                    <th className="py-3 px-4 text-center">{isHindi ? 'कुल मात्रा' : 'Total Qty'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-indigo-800/30">
                  {(() => {
                    const globalGroup = new Map<string, any>();
                    layouts.forEach(layout => {
                      layout.parts.forEach(p => {
                        const key = `${p.name}_${p.origL}_${p.origW}`;
                        if (globalGroup.has(key)) {
                          globalGroup.get(key)!.qty += 1;
                        } else {
                          globalGroup.set(key, { name: p.name, l: p.origL, w: p.origW, qty: 1 });
                        }
                      });
                    });
                    
                    let grandTotalQty = 0;
                    
                    return Array.from(globalGroup.values()).map((p, idx) => {
                      grandTotalQty += p.qty;
                      
                      return (
                        <tr key={idx} className="hover:bg-indigo-800/20">
                          <td className="py-3 px-4">
                            <div className="font-semibold">{p.name}</div>
                            <div className="text-xs text-indigo-300 font-mono">{p.l.toFixed(1)} x {p.w.toFixed(1)} {settings.unit}</div>
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-lg text-emerald-300">
                            {p.qty}
                          </td>
                        </tr>
                      );
                    }).concat([
                      <tr key="total" className="bg-indigo-800/50 font-bold text-lg border-t-2 border-indigo-500">
                        <td className="py-4 px-4 text-right">
                          {isHindi ? 'कुल पीसेस (Total Pieces) :' : 'Total Pieces :'}
                        </td>
                        <td className="py-4 px-4 text-center text-emerald-400">
                          {grandTotalQty}
                        </td>
                      </tr>
                    ]);
                  })()}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
