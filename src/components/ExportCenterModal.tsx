/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Printer, 
  FileSpreadsheet, 
  FileCode, 
  CheckCircle2, 
  ArrowRight,
  TrendingUp,
  Settings,
  Grid,
  Target
} from 'lucide-react';

interface ExportCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExportCsv: () => void;
  onExportJson: () => void;
  onExportCNC?: () => void;
  onPrint: () => void;
  onOpenReportPreview: () => void;
  isHindi: boolean;
  translations: any;
  partsCount: number;
  sheetsCount: number;
  utilization: number;
}

export default function ExportCenterModal({
  isOpen,
  onClose,
  onExportCsv,
  onExportJson,
  onExportCNC,
  onPrint,
  onOpenReportPreview,
  isHindi,
  translations,
  partsCount,
  sheetsCount,
  utilization
}: ExportCenterModalProps) {
  // Translate local strings
  const titleText = isHindi ? "एक्सपोर्ट और प्रिंट सेंटर" : "Export & Print Center";
  const descText = isHindi 
    ? "अपनी परियोजना को पसंदीदा प्रारूप में सहेजें या कार्यशाला के लिए प्रिंट रिपोर्ट तैयार करें।" 
    : "Save your carpentry project config, download raw spreadsheet cuts, or print full visual layouts.";
  
  const totalPartsText = isHindi ? "कुल पुर्जे" : "Total Parts";
  const sheetsUsedText = isHindi ? "शीट्स का उपयोग" : "Sheets Nested";
  const efficiencyText = isHindi ? "मटीरियल उपयोग" : "Efficiency";

  const closeText = isHindi ? "बंद करें" : "Close";

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="relative bg-white rounded-2xl shadow-xl border border-slate-200 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col z-10"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-md shadow-indigo-100 flex items-center justify-center">
                  <Grid size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{titleText}</h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">{descText}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick Summary Dashboard Inside Modal */}
            <div className="px-6 py-4 bg-indigo-50/30 border-b border-slate-100 grid grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-slate-200/60 p-3 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{totalPartsText}</span>
                <span className="text-lg font-bold text-slate-800 mt-1">{partsCount}</span>
              </div>
              <div className="bg-white rounded-xl border border-slate-200/60 p-3 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{sheetsUsedText}</span>
                <span className="text-lg font-bold text-slate-800 mt-1">{sheetsCount}</span>
              </div>
              <div className="bg-white rounded-xl border border-slate-200/60 p-3 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{efficiencyText}</span>
                <span className="text-lg font-bold text-emerald-600 mt-1">{utilization.toFixed(1)}%</span>
              </div>
            </div>

            {/* Modal Body: Responsive Bento Grid for Export Options */}
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/30">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* 1. PDF / PRINT REPORT */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex flex-col justify-between hover:border-indigo-500/50 hover:shadow-md transition-all group">
                  <div className="flex flex-col gap-4">
                    {/* Thumbnail Preview */}
                    <div className="aspect-[4/3] bg-slate-50 rounded-xl border border-slate-100 overflow-hidden relative flex flex-col p-3 shadow-inner group-hover:bg-slate-100/50 transition-colors">
                      {/* Stylized PDF Document Mockup */}
                      <div className="bg-white rounded-md shadow-sm border border-slate-200/50 flex-1 p-2 flex flex-col gap-1.5 text-[8px] font-medium text-slate-400">
                        {/* Doc Header */}
                        <div className="flex justify-between items-center border-b border-slate-100 pb-1">
                          <span className="font-bold text-slate-600 tracking-tight text-[7px]">Smart Carpentry PDF</span>
                          <span className="text-[5px] text-indigo-500 font-bold bg-indigo-50 px-1 py-0.5 rounded">PAGE 1</span>
                        </div>
                        {/* Doc Metadata */}
                        <div className="grid grid-cols-2 gap-1 bg-slate-50 p-1 rounded">
                          <div className="flex flex-col"><span className="text-[5px] text-slate-300">UTILI.</span><span className="font-extrabold text-emerald-600 text-[6px]">{utilization.toFixed(1)}%</span></div>
                          <div className="flex flex-col"><span className="text-[5px] text-slate-300">SHEETS</span><span className="font-extrabold text-slate-600 text-[6px]">{sheetsCount} used</span></div>
                        </div>
                        {/* Diagram mockup */}
                        <div className="border border-slate-200 border-dashed rounded p-1 flex-1 relative flex items-center justify-center bg-slate-50/20 overflow-hidden">
                          {/* Mini nested layouts */}
                          <div className="absolute inset-1 grid grid-cols-3 gap-1">
                            <div className="bg-indigo-50 border border-indigo-100 rounded flex items-center justify-center font-bold text-[5px] text-indigo-700">Part A</div>
                            <div className="bg-teal-50 border border-teal-100 rounded col-span-2 flex items-center justify-center font-bold text-[5px] text-teal-700">Part B</div>
                            <div className="bg-amber-50 border border-amber-100 rounded col-span-2 flex items-center justify-center font-bold text-[5px] text-amber-700">Part C</div>
                            <div className="bg-slate-100/80 border border-slate-200 rounded flex items-center justify-center text-[4px] text-slate-400">Off-cut</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Metadata Details */}
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                        <Printer size={16} className="text-indigo-600" />
                        {isHindi ? "वर्कशॉप प्रिंट / PDF" : "Workshop Print / PDF"}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                        {isHindi 
                          ? "कटिंग नक्शा, सामग्री उपयोग और सटीक एजबेंडिंग विवरण वाली मुद्रण योग्य रिपोर्ट डाउनलोड या प्रिंट करें।" 
                          : "High-density workspace print containing full visual maps, material metrics, and cut coordinates."}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      onOpenReportPreview();
                      onClose();
                    }}
                    disabled={partsCount === 0}
                    className={`mt-6 w-full flex items-center justify-center gap-1.5 font-bold text-xs py-2.5 px-4 rounded-xl shadow-md transition-all cursor-pointer ${
                      partsCount === 0
                        ? 'bg-slate-100 text-slate-400 border border-slate-200 shadow-none cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100 group-hover:scale-[1.02] active:scale-[0.98]'
                    }`}
                  >
                    <span>{isHindi ? "ब्लूप्रिंट रिपोर्ट खोलें (View)" : "Open Blueprint Report"}</span>
                    <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>

                {/* 2. CSV EXPORT */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex flex-col justify-between hover:border-indigo-500/50 hover:shadow-md transition-all group">
                  <div className="flex flex-col gap-4">
                    {/* Thumbnail Preview */}
                    <div className="aspect-[4/3] bg-slate-50 rounded-xl border border-slate-100 overflow-hidden relative flex flex-col p-3 shadow-inner group-hover:bg-slate-100/50 transition-colors">
                      {/* Stylized Spreadsheet Mockup */}
                      <div className="bg-white rounded-md shadow-sm border border-slate-200/50 flex-1 flex flex-col overflow-hidden">
                        {/* Table Header Row */}
                        <div className="bg-slate-100/80 border-b border-slate-200/60 grid grid-cols-4 gap-1 p-1 text-[5px] font-bold text-slate-500 uppercase">
                          <span>Part Name</span>
                          <span>Length</span>
                          <span>Width</span>
                          <span>Qty</span>
                        </div>
                        {/* Mock Rows */}
                        <div className="flex-1 divide-y divide-slate-100/60 text-[5px] font-medium text-slate-400 p-1 flex flex-col gap-0.5">
                          <div className="grid grid-cols-4 gap-1 py-0.5">
                            <span className="font-bold text-slate-600">Side Panel</span>
                            <span>24.5"</span>
                            <span>18.0"</span>
                            <span className="font-semibold text-slate-700">4</span>
                          </div>
                          <div className="grid grid-cols-4 gap-1 py-0.5">
                            <span className="font-bold text-slate-600">Front Door</span>
                            <span>30.0"</span>
                            <span>15.2"</span>
                            <span className="font-semibold text-slate-700">2</span>
                          </div>
                          <div className="grid grid-cols-4 gap-1 py-0.5">
                            <span className="font-bold text-slate-600">Base Board</span>
                            <span>48.0"</span>
                            <span>24.0"</span>
                            <span className="font-semibold text-slate-700">1</span>
                          </div>
                          <div className="grid grid-cols-4 gap-1 py-0.5">
                            <span className="font-bold text-slate-600">Top Shelf</span>
                            <span>46.5"</span>
                            <span>12.0"</span>
                            <span className="font-semibold text-slate-700">3</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Metadata Details */}
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                        <FileSpreadsheet size={16} className="text-indigo-600" />
                        {isHindi ? "सीएसवी (CSV) तालिका" : "CSV cutting List"}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                        {isHindi 
                          ? "कटिंग सूची को एक्सेल, गूगल शीट्स या बढ़ईगीरी कटिंग सॉफ़्टवेयर में खोलने के लिए सीएसवी में सहेजें।" 
                          : "Raw tabular file. Perfect for opening inside Microsoft Excel, Google Sheets, or importing to panel saws."}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      onExportCsv();
                      onClose();
                    }}
                    disabled={partsCount === 0}
                    className={`mt-6 w-full flex items-center justify-center gap-1.5 font-bold text-xs py-2.5 px-4 rounded-xl shadow-md transition-all cursor-pointer ${
                      partsCount === 0
                        ? 'bg-slate-100 text-slate-400 border border-slate-200 shadow-none cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100 group-hover:scale-[1.02] active:scale-[0.98]'
                    }`}
                  >
                    <span>{isHindi ? "सीएसवी (.csv) एक्सपोर्ट" : "Export CSV File"}</span>
                    <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>

                {/* 3. JSON LAYOUT CONFIG */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex flex-col justify-between hover:border-indigo-500/50 hover:shadow-md transition-all group">
                  <div className="flex flex-col gap-4">
                    {/* Thumbnail Preview */}
                    <div className="aspect-[4/3] bg-slate-900 rounded-xl border border-slate-950 overflow-hidden relative flex flex-col p-2.5 shadow-md">
                      {/* Window title bar */}
                      <div className="flex items-center gap-1 mb-2 border-b border-slate-800 pb-1.5 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="text-[5px] text-slate-500 font-mono ml-2">project_config.json</span>
                      </div>
                      {/* Stylized JSON mockup */}
                      <div className="font-mono text-[5px] text-slate-400 flex-1 overflow-hidden leading-relaxed">
                        <p className="text-indigo-400">{"{"}</p>
                        <p className="pl-2"><span className="text-amber-400">"settings"</span>: {"{"}</p>
                        <p className="pl-4"><span className="text-teal-400">"unit"</span>: <span className="text-emerald-400">"Inch"</span>,</p>
                        <p className="pl-4"><span className="text-teal-400">"sheetL"</span>: <span className="text-emerald-300">96</span>,</p>
                        <p className="pl-4"><span className="text-teal-400">"bladeTh"</span>: <span className="text-emerald-300">3.2</span></p>
                        <p className="pl-2">{"},"}</p>
                        <p className="pl-2"><span className="text-amber-400">"parts"</span>: [</p>
                        <p className="pl-4">{"{ "}<span className="text-teal-400">"name"</span>: <span className="text-emerald-400">"Side"</span>, <span className="text-teal-400">"qty"</span>: <span className="text-emerald-300">4</span>{" }"}</p>
                        <p className="pl-2">]</p>
                        <p className="text-indigo-400">{"}"}</p>
                      </div>
                    </div>

                    {/* Metadata Details */}
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                        <FileCode size={16} className="text-indigo-600" />
                        {isHindi ? "जेसन (JSON) विन्यास" : "JSON Layout Config"}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                        {isHindi 
                          ? "पूरी प्रोजेक्ट सेटिंग्स, यूनिट्स और पुर्जों की सूची को सहेजें जिसे बाद में दोबारा लोड किया जा सके।" 
                          : "Save your full project state. Backup and reload this configuration at any time without re-typing dimensions."}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      onExportJson();
                      onClose();
                    }}
                    disabled={partsCount === 0}
                    className={`mt-6 w-full flex items-center justify-center gap-1.5 font-bold text-xs py-2.5 px-4 rounded-xl shadow-md transition-all cursor-pointer ${
                      partsCount === 0
                        ? 'bg-slate-100 text-slate-400 border border-slate-200 shadow-none cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100 group-hover:scale-[1.02] active:scale-[0.98]'
                    }`}
                  >
                    <span>{isHindi ? "जेसन (.json) एक्सपोर्ट" : "Export JSON Backup"}</span>
                    <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>

                {/* 4. CNC COORDINATES */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex flex-col justify-between hover:border-indigo-500/50 hover:shadow-md transition-all group">
                  <div className="flex flex-col gap-4">
                    {/* Thumbnail Preview */}
                    <div className="aspect-[4/3] bg-slate-900 rounded-xl border border-slate-950 overflow-hidden relative flex flex-col p-2.5 shadow-md">
                      {/* Stylized CNC path mockup */}
                      <div className="font-mono text-[5px] text-emerald-400 flex-1 overflow-hidden leading-relaxed">
                        <p>G21 G90 G94</p>
                        <p>G00 Z5.0</p>
                        <p className="text-amber-400">; Part: Door</p>
                        <p>G00 X15.0 Y20.0</p>
                        <p>G01 Z-5.0 F800</p>
                        <p>G01 X315.0</p>
                        <p>G01 Y420.0</p>
                        <p className="text-amber-400">; Drill: Hinge 1</p>
                        <p>G00 X30.0 Y100.0</p>
                        <p>G01 Z-12.0</p>
                      </div>
                    </div>

                    {/* Metadata Details */}
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                        <Target size={16} className="text-indigo-600" />
                        {isHindi ? "सीएनसी कोआर्डिनेट्स" : "CNC Coordinates"}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                        {isHindi 
                          ? "ड्रिल होल (छेद) और पुर्जों के ग्लोबल लेआउट निर्देशांक CSV में एक्सपोर्ट करें।" 
                          : "Export packed part layout positions and global drill hole coordinates for CNC or manual routing."}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (onExportCNC) onExportCNC();
                      onClose();
                    }}
                    disabled={partsCount === 0}
                    className={`mt-6 w-full flex items-center justify-center gap-1.5 font-bold text-xs py-2.5 px-4 rounded-xl shadow-md transition-all cursor-pointer ${
                      partsCount === 0
                        ? 'bg-slate-100 text-slate-400 border border-slate-200 shadow-none cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100 group-hover:scale-[1.02] active:scale-[0.98]'
                    }`}
                  >
                    <span>{isHindi ? "कोआर्डिनेट्स एक्सपोर्ट" : "Export Drill Holes"}</span>
                    <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>

              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer"
              >
                {closeText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
