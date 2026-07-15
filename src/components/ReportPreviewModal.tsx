/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Printer, 
  Share2, 
  Copy, 
  Check, 
  Layers, 
  Sliders, 
  TrendingUp, 
  Wrench,
  Grid,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { PartInput, SheetSettings, PackingResult, PackedPart, SheetLayout } from '../types';

interface ReportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  parts: PartInput[];
  settings: SheetSettings;
  result: PackingResult;
  isHindi: boolean;
  onPrint: () => void;
}

export default function ReportPreviewModal({
  isOpen,
  onClose,
  parts,
  settings,
  result,
  isHindi,
  onPrint
}: ReportPreviewModalProps) {
  const [copySuccess, setCopySuccess] = useState(false);
  const [activePage, setActivePage] = useState<number>(1);
  const [zoomScale, setZoomScale] = useState<number>(1.0);

  if (!isOpen || !result) return null;

  const totalPages = 1 + result.layouts.length; // Page 1: Metrics & Cutlist, Page 2+: Sheet layouts

  // WhatsApp summary generation
  const handleShareWhatsApp = () => {
    let text = "";
    if (isHindi) {
      text = `*📐 स्मार्ट कारपेंट्री - कटिंग और लेआउट रिपोर्ट 📐*\n\n`;
      text += `*दिनांक:* ${new Date().toLocaleDateString()}\n`;
      text += `*कुल शीट्स:* ${result.totalSheetsUsed} शीट्स\n`;
      text += `*मटीरियल उपयोग (दक्षता):* ${result.totalUtilization.toFixed(1)}%\n`;
      text += `*कुल अपशिष्ट (Waste):* ${result.overallWastePercent.toFixed(1)}%\n`;
      text += `-------------------------------------------\n\n`;
      
      text += `*📋 आवश्यक पुर्जों की सूची (Required Cuts):*\n`;
      parts.forEach((p, idx) => {
        if (p.quantity <= 0) return;
        text += `• ${p.name || `पार्ट #${idx+1}`}: ${p.length}x${p.width} ${settings.unit} (मात्रा: ${p.quantity})\n`;
      });
      text += `\n`;

      result.layouts.forEach((lay, lIdx) => {
        text += `*📦 शीट #${lay.sheetIndex} कटिंग मैप:* (दक्षता: ${((lay.usedArea / lay.totalArea) * 100).toFixed(1)}%)\n`;
        lay.parts.forEach((p, pIdx) => {
          text += `  - ${p.name || `पार्ट #${pIdx+1}`}: आकार ${p.origL}x${p.origW} ${settings.unit} (X=${p.x.toFixed(1)}, Y=${p.y.toFixed(1)})\n`;
        });
        const majorOffcuts = lay.wasteRects?.filter(w => w.w >= 250 && w.h >= 250) || [];
        if (majorOffcuts.length > 0) {
          text += `  - बचे हुए टुकड़े: `;
          const offcutsStr = majorOffcuts.map(o => `${(o.w / (settings.unit === 'Inch' ? 25.4 : settings.unit === 'CM' ? 10 : 1)).toFixed(1)}x${(o.h / (settings.unit === 'Inch' ? 25.4 : settings.unit === 'CM' ? 10 : 1)).toFixed(1)}`).join(', ');
          text += `${offcutsStr} ${settings.unit}\n`;
        }
        text += `\n`;
      });

      text += `_साहिरा इंटीरियर - स्मार्ट बढ़ईगिरी ऑप्टिमाइज़र_`;
    } else {
      text = `*📐 Smart Carpentry - Optimization Report 📐*\n\n`;
      text += `*Date:* ${new Date().toLocaleDateString()}\n`;
      text += `*Sheets Nested:* ${result.totalSheetsUsed} Sheets\n`;
      text += `*Nesting Efficiency:* ${result.totalUtilization.toFixed(1)}%\n`;
      text += `*Overall Waste:* ${result.overallWastePercent.toFixed(1)}%\n`;
      text += `-------------------------------------------\n\n`;
      
      text += `*📋 Required Cut List:*\n`;
      parts.forEach((p, idx) => {
        if (p.quantity <= 0) return;
        text += `• ${p.name || `Part #${idx+1}`}: ${p.length}x${p.width} ${settings.unit} (Qty: ${p.quantity})\n`;
      });
      text += `\n`;

      result.layouts.forEach((lay, lIdx) => {
        text += `*📦 Sheet #${lay.sheetIndex} Cutting Map:* (Eff: ${((lay.usedArea / lay.totalArea) * 100).toFixed(1)}%)\n`;
        lay.parts.forEach((p, pIdx) => {
          text += `  - ${p.name || `Part #${pIdx+1}`}: Size ${p.origL}x${p.origW} ${settings.unit} (X=${p.x.toFixed(1)}, Y=${p.y.toFixed(1)})\n`;
        });
        const majorOffcuts = lay.wasteRects?.filter(w => w.w >= 250 && w.h >= 250) || [];
        if (majorOffcuts.length > 0) {
          text += `  - Reusable Leftovers: `;
          const offcutsStr = majorOffcuts.map(o => `${(o.w / (settings.unit === 'Inch' ? 25.4 : settings.unit === 'CM' ? 10 : 1)).toFixed(1)}x${(o.h / (settings.unit === 'Inch' ? 25.4 : settings.unit === 'CM' ? 10 : 1)).toFixed(1)}`).join(', ');
          text += `${offcutsStr} ${settings.unit}\n`;
        }
        text += `\n`;
      });

      text += `_Shahirah Interior - Smart Carpentry Optimizer_`;
    }

    try {
      navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);

      // Deep link to WhatsApp
      const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
      window.open(whatsappUrl, '_blank');
    } catch (err) {
      alert(isHindi ? 'विवरण कॉपी करने में विफल रहा।' : 'Failed to copy report text.');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-800 max-w-5xl w-full max-h-[96vh] overflow-hidden flex flex-col"
        >
          {/* Header Controls */}
          <div className="px-5 py-4 border-b border-slate-800 bg-slate-950 flex flex-wrap gap-3 items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-600 rounded-lg text-white shadow-md shadow-emerald-950/40">
                <Printer size={16} />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-100">
                  {isHindi ? 'वर्कशॉप रिपोर्ट इंजन' : 'Workshop Blueprint Engine'}
                </h3>
                <p className="text-[10px] text-slate-400 font-medium">
                  {isHindi ? 'सभी मोबाइल फोन और टैबलेट पर काम करता है' : 'Designed for high reliability on mobile screens'}
                </p>
              </div>
            </div>

            {/* Pagination & Zoom */}
            <div className="flex items-center gap-3 bg-slate-900 rounded-lg border border-slate-800 px-2 py-1 text-xs">
              <button 
                onClick={() => setActivePage(prev => Math.max(1, prev - 1))}
                disabled={activePage === 1}
                className="p-1 hover:bg-slate-800 rounded disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="font-mono text-slate-300">
                {isHindi ? `पेज ${activePage} / ${totalPages}` : `Page ${activePage} of ${totalPages}`}
              </span>
              <button 
                onClick={() => setActivePage(prev => Math.min(totalPages, prev + 1))}
                disabled={activePage === totalPages}
                className="p-1 hover:bg-slate-800 rounded disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ChevronRight size={16} />
              </button>
              <div className="h-4 w-px bg-slate-800 mx-1"></div>
              <button 
                onClick={() => setZoomScale(z => Math.max(0.65, z - 0.1))}
                className="p-1 hover:bg-slate-800 rounded text-slate-400"
                title="Zoom Out"
              >
                <ZoomOut size={14} />
              </button>
              <span className="font-mono text-[10px] text-slate-400 w-8 text-center">
                {Math.round(zoomScale * 100)}%
              </span>
              <button 
                onClick={() => setZoomScale(z => Math.min(1.5, z + 0.1))}
                className="p-1 hover:bg-slate-800 rounded text-slate-400"
                title="Zoom In"
              >
                <ZoomIn size={14} />
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleShareWhatsApp}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-950/20"
              >
                {copySuccess ? <Check size={13} /> : <Share2 size={13} />}
                <span>{isHindi ? 'व्हाट्सएप शेयर' : 'WhatsApp Share'}</span>
              </button>
              <button
                onClick={onPrint}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-950/20"
              >
                <Printer size={13} />
                <span>{isHindi ? 'प्रिंट / PDF' : 'Print / PDF'}</span>
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Paper View Area */}
          <div className="flex-1 overflow-auto bg-slate-950 p-4 sm:p-8 flex items-start justify-center">
            <div 
              style={{ transform: `scale(${zoomScale})`, transformOrigin: 'top center' }}
              className="bg-white text-slate-900 p-8 sm:p-12 w-full max-w-[210mm] min-h-[297mm] shadow-2xl rounded-sm transition-transform duration-200"
            >
              {/* Paper Layout Header (Printed look) */}
              <div className="border-b-2 border-slate-900 pb-4 mb-6 flex justify-between items-end">
                <div>
                  <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">
                    Shahirah Interior - Workshop Report
                  </h1>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    {isHindi ? 'स्मार्ट बढ़ईगिरी नक्शा और कटिंग सूची' : 'Smart Carpentry Nesting Blueprint'}
                  </p>
                </div>
                <div className="text-right text-[10px] text-slate-500 font-mono font-bold">
                  <p>DATE: {new Date().toLocaleDateString()}</p>
                  <p className="text-emerald-600">PAGE {activePage} OF {totalPages}</p>
                </div>
              </div>

              {/* Page Content Switcher */}
              {activePage === 1 ? (
                /* PAGE 1: Metrics & Cutlist */
                <div className="space-y-6">
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-slate-50 border border-slate-200 rounded p-4 text-center">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                        {isHindi ? 'शीट्स का उपयोग' : 'Sheets Nested'}
                      </span>
                      <span className="text-2xl font-black text-slate-800">{result.totalSheetsUsed} Sheets</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded p-4 text-center">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                        {isHindi ? 'सामग्री दक्षता' : 'Nesting Efficiency'}
                      </span>
                      <span className="text-2xl font-black text-emerald-600">{result.totalUtilization.toFixed(1)}%</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded p-4 text-center">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                        {isHindi ? 'कुल अपशिष्ट' : 'Overall Waste'}
                      </span>
                      <span className="text-2xl font-black text-indigo-600">{result.overallWastePercent.toFixed(1)}%</span>
                    </div>
                  </div>

                  {/* Settings Details Table */}
                  <div>
                    <h2 className="text-xs font-black uppercase text-slate-800 tracking-wider mb-2 flex items-center gap-1.5">
                      <Sliders size={12} className="text-indigo-600" />
                      {isHindi ? 'सामग्री एवं ब्लेड विनिर्देश' : 'Material & Blade Settings'}
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 border border-slate-200 rounded text-xs">
                      <div>
                        <span className="text-slate-400 block font-semibold">{isHindi ? 'मूल शीट आकार' : 'Stock Dimensions'}</span>
                        <span className="font-bold text-slate-800">{settings.sheetL} x {settings.sheetW} {settings.unit}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-semibold">{isHindi ? 'आरी ब्लेड मोटाई' : 'Saw Blade Kerf'}</span>
                        <span className="font-bold text-slate-800">{settings.bladeTh} mm</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-semibold">{isHindi ? 'किनारा मार्जिन' : 'Trim Margin'}</span>
                        <span className="font-bold text-slate-800">{settings.trimMargin} mm</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-semibold">{isHindi ? 'एजबेंडिंग मोटाई' : 'Banding Thickness'}</span>
                        <span className="font-bold text-slate-800">{settings.edgeTh} mm</span>
                      </div>
                    </div>
                  </div>

                  {/* Table: Cutting List */}
                  <div>
                    <h2 className="text-xs font-black uppercase text-slate-800 tracking-wider mb-2 flex items-center gap-1.5">
                      <Layers size={12} className="text-indigo-600" />
                      {isHindi ? 'कटिंग सूची विवरण' : 'Required Cutting List'}
                    </h2>
                    <div className="border border-slate-200 rounded overflow-hidden">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                            <th className="p-2.5 pl-4">{isHindi ? 'पुर्जे का नाम' : 'PART ID / NAME'}</th>
                            <th className="p-2.5">{isHindi ? 'मात्रा' : 'QTY'}</th>
                            <th className="p-2.5">{isHindi ? 'आकार' : 'DIMENSIONS'}</th>
                            <th className="p-2.5">{isHindi ? 'रेशे का प्रकार' : 'GRAIN DIRECTION'}</th>
                            {settings.edgeTh > 0 && <th className="p-2.5 pr-4">{isHindi ? 'एजबेंडिंग (T-B-L-R)' : 'EDGES BANDING'}</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-slate-600 font-medium">
                          {parts.filter(p => p.quantity > 0).map((part, pIdx) => {
                            const edgesText = [
                              part.edges.T ? 'Top' : '',
                              part.edges.B ? 'Bot' : '',
                              part.edges.L ? 'Left' : '',
                              part.edges.R ? 'Right' : ''
                            ].filter(Boolean).join(', ') || 'None';
                            
                            let finalEdgeText = edgesText;
                            if (edgesText !== 'None' && part.edgeMaterialId && settings.edgeBandItems) {
                              const eb = settings.edgeBandItems.find((e: any) => e.id === part.edgeMaterialId);
                              if (eb) {
                                finalEdgeText = `${edgesText} - ${eb.name}`;
                              }
                            }

                            let grainStr = "None";
                            if (part.grain === 'L') grainStr = isHindi ? "वर्टिकल रेशे" : "Vertical (L)";
                            if (part.grain === 'W') grainStr = isHindi ? "हॉरिजॉन्टल रेशे" : "Horizontal (W)";

                            return (
                              <tr key={part.id || pIdx} className="hover:bg-slate-50/50">
                                <td className="p-2.5 pl-4 font-bold text-slate-800">{part.name || `Part #${pIdx+1}`}</td>
                                <td className="p-2.5">{part.quantity}</td>
                                <td className="p-2.5 font-mono">{part.length} x {part.width} {settings.unit}</td>
                                <td className="p-2.5">{grainStr}</td>
                                {settings.edgeTh > 0 && <td className="p-2.5 pr-4 text-indigo-600 font-semibold">{finalEdgeText}</td>}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Warning for unplaced parts if any */}
                  {result.unplacedParts && result.unplacedParts.length > 0 && (
                    <div className="bg-rose-50 border border-rose-200 rounded p-4 text-xs text-rose-700 font-semibold">
                      <p className="font-bold text-sm text-rose-800 mb-1">
                        {isHindi ? '⚠️ चेतावनी: कुछ पुर्जे सेट नहीं हो पाए!' : '⚠️ WARNING: Unplaced Parts Found!'}
                      </p>
                      <p>
                        {isHindi 
                          ? 'ये पुर्जे आपकी स्टॉक शीट्स में फिट नहीं हो पाए। कृपया अतिरिक्त या बड़ी शीट जोड़ने का प्रयास करें:'
                          : 'These pieces could not fit within the configured sheet boundaries. Consider adding more stock sheets:'}
                      </p>
                      <p className="mt-2 font-bold font-mono">
                        {result.unplacedParts.map(u => `${u.name} (x${u.qty})`).join(', ')}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* PAGES 2+: Sheet Layout Map details */
                (() => {
                  const layoutIndex = activePage - 2;
                  const layout = result.layouts[layoutIndex];
                  if (!layout) return null;

                  const sheetEff = ((layout.usedArea / layout.totalArea) * 100).toFixed(1);

                  // Setup layout drawing dimensions
                  const T = settings.trimMargin;
                  const trimEdges = settings.trimEdges || { top: true, bottom: true, left: true, right: true };
                  const padTop = trimEdges.top ? T : 0;
                  const padBottom = trimEdges.bottom ? T : 0;
                  const padLeft = trimEdges.left ? T : 0;
                  const padRight = trimEdges.right ? T : 0;
                  
                  const rawLMm = layout.width + padLeft + padRight;
                  const rawWMm = layout.height + padTop + padBottom;

                  const maxDrawW = 160; // scale in mm of page
                  const scale = maxDrawW / rawLMm;
                  const sheetH = rawWMm * scale;

                  return (
                    <div className="space-y-6">
                      {/* Sheet Header Banner */}
                      <div className="bg-indigo-50 border border-indigo-100 rounded p-4 flex justify-between items-center text-xs">
                        <div>
                          <h3 className="font-bold text-slate-800 uppercase tracking-wider">
                            {isHindi ? `शीट #${layout.sheetIndex} कटिंग विवरण` : `Sheet #${layout.sheetIndex} Layout Map`}
                          </h3>
                          <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                            {layout.materialName ? `Material: ${layout.materialName}` : `Stock Size: ${settings.sheetL}x${settings.sheetW}`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-indigo-600 text-sm">{sheetEff}% {isHindi ? 'दक्षता' : 'Efficiency'}</p>
                          <p className="text-[10px] text-slate-400 font-bold">{layout.wastePercent.toFixed(1)}% {isHindi ? 'अपशिष्ट' : 'Waste'}</p>
                        </div>
                      </div>

                      {/* Graphic Sheet Canvas Preview */}
                      <div className="flex flex-col items-center justify-center py-6 bg-slate-50 border border-slate-200 rounded-xl">
                        <div 
                          className="relative border-2 border-slate-400 bg-white shadow-md"
                          style={{ width: `${maxDrawW}mm`, height: `${sheetH}mm` }}
                        >
                          {/* Trim Border */}
                          {T > 0 && (
                            <div 
                              className="absolute border border-dashed border-slate-300 pointer-events-none"
                              style={{ 
                                left: `${T * scale}mm`, 
                                top: `${T * scale}mm`, 
                                right: `${T * scale}mm`, 
                                bottom: `${T * scale}mm` 
                              }}
                            />
                          )}

                          {/* Waste Rectangles */}
                          {layout.wasteRects?.map((w, wIdx) => {
                            const isMajor = w.w >= 250 && w.h >= 250;
                            return (
                              <div
                                key={`waste-${wIdx}`}
                                className="absolute bg-slate-100 border border-slate-200 flex items-center justify-center p-0.5 text-center"
                                style={{
                                  left: `${(T + w.x) * scale}mm`,
                                  top: `${(T + w.y) * scale}mm`,
                                  width: `${w.w * scale}mm`,
                                  height: `${w.h * scale}mm`
                                }}
                              >
                                {w.w * scale > 15 && w.h * scale > 8 && (
                                  <span className="text-[5px] font-bold text-slate-400">
                                    {isMajor ? 'MAJOR OFF-CUT' : 'scrap'}
                                  </span>
                                )}
                              </div>
                            );
                          })}

                          {/* Parts nested inside */}
                          {layout.parts.map((part, pIdx) => {
                            return (
                              <div
                                key={`part-${pIdx}`}
                                className="absolute bg-sky-100/90 border border-sky-500 flex flex-col items-center justify-center p-1 text-center font-bold"
                                style={{
                                  left: `${(T + part.x) * scale}mm`,
                                  top: `${(T + part.y) * scale}mm`,
                                  width: `${part.w * scale}mm`,
                                  height: `${part.h * scale}mm`
                                }}
                              >
                                <span className="text-[6px] text-slate-800 truncate max-w-full">
                                  {part.name || `P${pIdx+1}`}
                                </span>
                                {part.w * scale > 12 && part.h * scale > 8 && (
                                  <span className="text-[5px] text-slate-500 font-mono mt-0.5">
                                    {part.origL}x{part.origW}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Nesting list coordinates table */}
                      <div>
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2">
                          {isHindi ? 'शीट पार्ट्स कटिंग पोजीशन निर्देशांक' : 'Nesting Cut Coordinates'}
                        </h4>
                        <div className="border border-slate-200 rounded overflow-hidden">
                          <table className="w-full text-left border-collapse text-[11px]">
                            <thead>
                              <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                                <th className="p-2 pl-4">{isHindi ? 'पुर्जे का नाम' : 'PART ID / NAME'}</th>
                                <th className="p-2">{isHindi ? 'कोऑर्डिनेट्स' : 'COORDINATES (X, Y)'}</th>
                                <th className="p-2">{isHindi ? 'तैयार आकार' : 'FINISHED SIZE'}</th>
                                <th className="p-2 pr-4">{isHindi ? 'वास्तविक कट साइज' : 'CUTTING OUTLINE SIZE'}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 text-slate-600 font-medium">
                              {layout.parts.map((part, pIdx) => {
                                const unitLabel = settings.unit === 'Inch' ? '"' : ' ' + settings.unit;
                                const xFormatted = `${(part.x / (settings.unit === 'Inch' ? 25.4 : settings.unit === 'CM' ? 10 : 1)).toFixed(1)}${unitLabel}`;
                                const yFormatted = `${(part.y / (settings.unit === 'Inch' ? 25.4 : settings.unit === 'CM' ? 10 : 1)).toFixed(1)}${unitLabel}`;

                                return (
                                  <tr key={pIdx} className="hover:bg-slate-50/50">
                                    <td className="p-2 pl-4 font-bold text-slate-800">{part.name || `Part #${pIdx+1}`}</td>
                                    <td className="p-2 font-mono">X={xFormatted}, Y={yFormatted}</td>
                                    <td className="p-2 font-mono">{part.origL} x {part.origW} {settings.unit}</td>
                                    <td className="p-2 pr-4 text-indigo-600 font-bold font-mono">{part.cutL} x {part.cutW} {settings.unit}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  );
                })()
              )}

              {/* Page Footer inside Paper */}
              <div className="mt-12 border-t border-slate-200 pt-4 text-center text-[9px] text-slate-400 font-bold uppercase tracking-wider flex justify-between">
                <span>Shahirah Interior Carpentry Platform</span>
                <span>Page {activePage} of {totalPages}</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
