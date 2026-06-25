/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { SheetSettings, Language, Unit } from '../types';
import { Settings, HelpCircle, Layers, ShieldCheck } from 'lucide-react';

interface SheetSettingsPanelProps {
  settings: SheetSettings;
  onChange: (settings: SheetSettings) => void;
  language: Language;
  translations: any;
}

const ALGORITHMS = [
  { key: 'StripCutRowFirst', labelEn: 'Strip-Cut Row-First (Continuous Horizontal Saw-Cut)', labelHi: 'स्ट्रिप-कट रो-फर्स्ट (लगातार क्षैतिज आरी कट)' },
  { key: 'StripCutColFirst', labelEn: 'Strip-Cut Column-First (Continuous Vertical Saw-Cut)', labelHi: 'स्ट्रिप-कट कॉलम-फर्स्ट (लगातार लंबवत आरी कट)' },
  { key: 'GuillotineBssfSas', labelEn: 'Guillotine BSSF SAS (Table Saw Cut)', labelHi: 'गिलोटीन BSSF SAS (टेबल सॉ कट)' },
  { key: 'GuillotineBssfMaxas', labelEn: 'Guillotine BSSF MAXAS (Alt Table Saw)', labelHi: 'गिलोटीन BSSF MAXAS (वैकल्पिक)' },
  { key: 'MaxRectsBssf', labelEn: 'MaxRects BSSF (CNC Nesting / Dense)', labelHi: 'मैक्सरेक्ट्स BSSF (CNC राउटर / सघन)' }
];

export default function SheetSettingsPanel({
  settings,
  onChange,
  language,
  translations
}: SheetSettingsPanelProps) {
  const isHindi = language === 'Hindi';

  const handleFieldChange = (key: keyof SheetSettings, value: any) => {
    onChange({
      ...settings,
      [key]: value
    });
  };

  const handleUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newUnit = e.target.value as Unit;
    const oldUnit = settings.unit;
    if (newUnit === oldUnit) return;

    // Convert dimensions on unit change
    const convertValue = (val: number, from: Unit, to: Unit) => {
      // First convert to MM
      let mm = val;
      if (from === 'Inch') mm = val * 25.4;
      else if (from === 'CM') mm = val * 10;

      // Then convert to target
      if (to === 'Inch') return Number((mm / 25.4).toFixed(3));
      if (to === 'CM') return Number((mm / 10).toFixed(2));
      return Number(mm.toFixed(1));
    };

    const updatedL = convertValue(settings.sheetL, oldUnit, newUnit);
    const updatedW = convertValue(settings.sheetW, oldUnit, newUnit);

    onChange({
      ...settings,
      unit: newUnit,
      sheetL: updatedL,
      sheetW: updatedW
    });
  };

  return (
    <div id="settings-panel" className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-5">
        <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-md shadow-indigo-100">
          <Settings size={20} id="settings-icon" />
        </div>
        <div>
          <h2 className="font-bold text-slate-900 text-lg">{translations.settings}</h2>
          <p className="text-xs text-slate-500 font-medium">
            {isHindi ? 'प्लाईवुड शीट आकार और कटिंग पैरामीटर सेट करें' : 'Configure plywood sheets and cutting parameters'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Unit Dropdown */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
            {isHindi ? 'माप इकाई (Unit)' : 'Measurement Unit'}
          </label>
          <select
            id="unit-selector"
            value={settings.unit}
            onChange={handleUnitChange}
            className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-slate-50 text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-colors"
          >
            <option value="Inch">{isHindi ? 'इंच (Inches)' : 'Inches (")'}</option>
            <option value="CM">{isHindi ? 'सेमी (CM)' : 'Centimeters (cm)'}</option>
            <option value="MM">{isHindi ? 'मिमी (MM)' : 'Millimeters (mm)'}</option>
          </select>
        </div>

        {/* Stock Sheets */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-600">
            {translations.stock_sh} {isHindi ? '(शीटों की संख्या)' : '(Stock Count)'}
          </label>
          <input
            id="stock-input"
            type="number"
            min="1"
            max="100"
            value={settings.stock}
            onChange={(e) => handleFieldChange('stock', Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-slate-50 text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-colors"
          />
        </div>

        {/* Sheet Cost */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
            {isHindi ? 'प्रति शीट लागत' : 'Cost per Sheet'} ({isHindi ? '₹' : '$'})
          </label>
          <input
            id="sheet-cost-input"
            type="number"
            step="any"
            min="0"
            value={settings.sheetCost !== undefined ? settings.sheetCost : 45}
            onChange={(e) => handleFieldChange('sheetCost', Math.max(0, parseFloat(e.target.value) || 0))}
            className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-slate-50 text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-colors"
          />
        </div>

        {/* Sheet Length */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-600">
            {translations.sheet_l} ({settings.unit})
          </label>
          <input
            id="sheet-l-input"
            type="number"
            step="any"
            min="0.1"
            value={settings.sheetL}
            onChange={(e) => handleFieldChange('sheetL', Math.max(0.1, parseFloat(e.target.value) || 0))}
            className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-slate-50 text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-colors"
          />
        </div>

        {/* Sheet Width */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-600">
            {translations.sheet_w} ({settings.unit})
          </label>
          <input
            id="sheet-w-input"
            type="number"
            step="any"
            min="0.1"
            value={settings.sheetW}
            onChange={(e) => handleFieldChange('sheetW', Math.max(0.1, parseFloat(e.target.value) || 0))}
            className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-slate-50 text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-colors"
          />
        </div>

        {/* Blade Thickness */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
            {translations.blade_th}
            <span className="group relative cursor-pointer text-slate-400 hover:text-slate-600">
              <HelpCircle size={13} />
              <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block w-48 bg-slate-800 text-white text-[10px] p-2 rounded shadow-lg text-center z-20">
                {isHindi ? 'आरी की मोटाई (Kerf) जो काटने पर वेस्ट होती है' : 'The thickness of the cutting saw blade (kerf) that gets lost as sawdust.'}
              </span>
            </span>
          </label>
          <input
            id="blade-th-input"
            type="number"
            step="0.1"
            min="0"
            value={settings.bladeTh}
            onChange={(e) => handleFieldChange('bladeTh', Math.max(0, parseFloat(e.target.value) || 0))}
            className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-slate-50 text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-colors"
          />
        </div>

        {/* Edge Banding Thickness */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
            {translations.edge_th}
            <span className="group relative cursor-pointer text-slate-400 hover:text-slate-600">
              <HelpCircle size={13} />
              <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block w-48 bg-slate-800 text-white text-[10px] p-2 rounded shadow-lg text-center z-20">
                {isHindi ? 'चिपकाने वाली एजबेंड टेप की मोटाई। कटिंग साइज़ में से इसे कम किया जाएगा' : 'Edge tape thickness. Wooden cutting dimensions will be reduced by this amount.'}
              </span>
            </span>
          </label>
          <input
            id="edge-th-input"
            type="number"
            step="0.1"
            min="0"
            value={settings.edgeTh}
            onChange={(e) => handleFieldChange('edgeTh', Math.max(0, parseFloat(e.target.value) || 0))}
            className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-slate-50 text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-colors"
          />
        </div>

        {/* Trim Margin */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
            {translations.trim_m}
            <span className="group relative cursor-pointer text-slate-400 hover:text-slate-600">
              <HelpCircle size={13} />
              <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block w-48 bg-slate-800 text-white text-[10px] p-2 rounded shadow-lg text-center z-20">
                {isHindi ? 'प्लाईवुड शीट के खराब किनारों को हटाने के लिए चारों तरफ से छोड़ी जाने वाली मार्जिन' : 'Safety trim along sheet borders to remove damaged edges.'}
              </span>
            </span>
          </label>
          <input
            id="trim-margin-input"
            type="number"
            step="0.5"
            min="0"
            value={settings.trimMargin}
            onChange={(e) => handleFieldChange('trimMargin', Math.max(0, parseFloat(e.target.value) || 0))}
            className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-slate-50 text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-colors"
          />
        </div>

        {/* Packing Algorithm */}
        <div className="flex flex-col gap-1.5 md:col-span-2">
          <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
            <Layers size={13} className="text-indigo-600" />
            {translations.packing_algo}
          </label>
          <select
            id="algo-selector"
            value={settings.algorithm}
            onChange={(e) => handleFieldChange('algorithm', e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-slate-50 text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-colors"
          >
            {ALGORITHMS.map((algo) => (
              <option key={algo.key} value={algo.key}>
                {isHindi ? algo.labelHi : algo.labelEn}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-slate-400 leading-normal px-1 mt-0.5">
            {settings.algorithm.startsWith('StripCut')
              ? (isHindi 
                ? '💡 स्ट्रिप-कट (पैनेल सॉ) के लिए सबसे बेहतरीन: आरी की ब्लेड लगातार सीधे चलती है, बीच में कोई रुकावट या काट-काटकर ईंट जैसा डिज़ाइन नहीं बनता।' 
                : '💡 Highly Recommended for Panel Saws: Continuous, straight edge-to-edge sheet cuts with absolutely zero staggered/brick-like blocks.')
              : settings.algorithm.startsWith('Guillotine')
              ? (isHindi 
                ? '💡 टेबल आरी (Table Saw) कटिंग के लिए अनुकूल: सारे कट एक सिरे से दूसरे सिरे तक सीधे होते हैं।' 
                : '💡 Recommended for Table Saws: All cuts are straight, edge-to-edge guillotine lines.')
              : (isHindi 
                ? '💡 सीएनसी राउटर (CNC Router) कटिंग के लिए अनुकूल: पुर्जे कहीं भी सघनता से फिट हो सकते हैं।' 
                : '💡 Recommended for CNC Routers: Parts can overlap in split lines to maximize material density.')}
          </p>
        </div>
      </div>
    </div>
  );
}
