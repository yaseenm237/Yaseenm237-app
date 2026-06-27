import React, { useState } from 'react';
import { SheetSettings, StockItem, Language, Unit, EdgeBandItem } from '../types';
import { X, Plus, Trash2, Save, Settings, Layers } from 'lucide-react';

interface SettingsModalProps {
  settings: SheetSettings;
  onChange: (settings: SheetSettings) => void;
  onClose: () => void;
  language: Language;
}

const ALGORITHMS = [
  { key: 'AutoBest', labelEn: 'Auto Best (AI Multi-Pass)', labelHi: 'ऑटो बेस्ट (AI मल्टी-पास)' },
  { key: 'StripCutColFirst', labelEn: 'Strip-Cut Column-First (Standard)', labelHi: 'स्ट्रिप-कट कॉलम-फर्स्ट (मानक)' },
  { key: 'StripCutRowFirst', labelEn: 'Strip-Cut Row-First (Fast rip)', labelHi: 'स्ट्रिप-कट रो-फर्स्ट (फास्ट रिप)' },
  { key: 'GuillotineBssfSas', labelEn: 'Guillotine BSSF SAS (Table Saw Cut)', labelHi: 'गिलोटीन BSSF SAS (टेबल सॉ कट)' },
  { key: 'GuillotineBssfMaxas', labelEn: 'Guillotine BSSF MAXAS (Alt Table Saw)', labelHi: 'गिलोटीन BSSF MAXAS (वैकल्पिक)' },
  { key: 'MaxRectsBssf', labelEn: 'MaxRects BSSF (CNC Nesting / Dense)', labelHi: 'मैक्सरेक्ट्स BSSF (CNC राउटर / सघन)' }
];

export default function SettingsModal({ settings, onChange, onClose, language }: SettingsModalProps) {
  const isHindi = language === 'Hindi';

  // Local state for all settings
  const [localSettings, setLocalSettings] = useState<SheetSettings>(settings);

  // Fallback to default stock item if empty
  const stockItems = localSettings.stockItems?.length ? localSettings.stockItems : [
    {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
      name: isHindi ? 'मानक बोर्ड' : 'Standard Board',
      length: localSettings.sheetL,
      width: localSettings.sheetW,
      cost: localSettings.sheetCost
    }
  ];

  const handleFieldChange = (key: keyof SheetSettings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newUnit = e.target.value as Unit;
    const oldUnit = localSettings.unit;
    if (newUnit === oldUnit) return;

    const convertValue = (val: number, from: Unit, to: Unit) => {
      let mm = val;
      if (from === 'Inch') mm = val * 25.4;
      else if (from === 'CM') mm = val * 10;
      if (to === 'Inch') return Number((mm / 25.4).toFixed(3));
      if (to === 'CM') return Number((mm / 10).toFixed(2));
      return Number(mm.toFixed(1));
    };

    const updatedStockItems = stockItems.map(item => ({
      ...item,
      length: convertValue(item.length, oldUnit, newUnit),
      width: convertValue(item.width, oldUnit, newUnit),
    }));

    setLocalSettings({
      ...localSettings,
      unit: newUnit,
      sheetL: convertValue(localSettings.sheetL, oldUnit, newUnit),
      sheetW: convertValue(localSettings.sheetW, oldUnit, newUnit),
      stockItems: updatedStockItems
    });
  };

  const handleAddStock = () => {
    setLocalSettings(prev => ({
      ...prev,
      stockItems: [
        ...(prev.stockItems || []),
        {
          id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
          name: isHindi ? 'नया बोर्ड' : 'New Board',
          length: prev.unit === 'MM' ? 2440 : prev.unit === 'Inch' ? 96 : 244,
          width: prev.unit === 'MM' ? 1220 : prev.unit === 'Inch' ? 48 : 122,
          cost: 0
        }
      ]
    }));
  };

  const handleUpdateStock = (id: string, field: keyof StockItem, value: any) => {
    setLocalSettings(prev => ({
      ...prev,
      stockItems: (prev.stockItems || []).map(item => {
        if (item.id === id) {
          return { ...item, [field]: value };
        }
        return item;
      })
    }));
  };

  const handleRemoveStock = (id: string) => {
    setLocalSettings(prev => {
      const updated = (prev.stockItems || []).filter(item => item.id !== id);
      if (updated.length === 0) {
        alert(isHindi ? "कम से कम एक सामग्री आवश्यक है।" : "At least one material is required.");
        return prev;
      }
      return { ...prev, stockItems: updated };
    });
  };

  const edgeBandItems = localSettings.edgeBandItems || [];

  const handleAddEdgeBand = () => {
    setLocalSettings(prev => ({
      ...prev,
      edgeBandItems: [
        ...(prev.edgeBandItems || []),
        {
          id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
          name: isHindi ? 'नई एज बैंडिंग' : 'New Edge Banding'
        }
      ]
    }));
  };

  const handleUpdateEdgeBand = (id: string, field: keyof EdgeBandItem, value: any) => {
    setLocalSettings(prev => ({
      ...prev,
      edgeBandItems: (prev.edgeBandItems || []).map(item => {
        if (item.id === id) {
          return { ...item, [field]: value };
        }
        return item;
      })
    }));
  };

  const handleRemoveEdgeBand = (id: string) => {
    setLocalSettings(prev => {
      const updated = (prev.edgeBandItems || []).filter(item => item.id !== id);
      return { ...prev, edgeBandItems: updated };
    });
  };

  const handleSave = () => {
    onChange(localSettings);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Settings className="text-indigo-600" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                {isHindi ? 'सेटिंग्स और मटीरियल स्टॉक' : 'Settings & Material Stock'}
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                {isHindi 
                  ? 'बोर्ड के प्रकार, मोटाई और कटिंग पैरामीटर्स (ब्लेड, ट्रिम) सेट करें' 
                  : 'Configure board types, thicknesses, and cutting parameters (blade, trim)'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="p-6 overflow-y-auto flex-1 bg-white space-y-8">
          
          {/* Section: Stock Materials */}
          <section>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Layers size={16} className="text-indigo-500" />
              {isHindi ? 'स्टॉक में उपलब्ध बोर्ड्स (मोटाई / मटीरियल)' : 'Available Stock Boards (Thickness / Material)'}
            </h3>
            
            <div className="space-y-3">
              {stockItems.map((item, idx) => (
                <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-slate-50 p-4 rounded-xl border border-slate-200 relative group hover:border-indigo-300 transition-colors">
                  <div className="md:col-span-3">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {isHindi ? 'मटीरियल का नाम (उदा. 18mm)' : 'Material Name (e.g. 18mm)'}
                    </label>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => handleUpdateStock(item.id, 'name', e.target.value)}
                      className="w-full text-sm border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 font-medium text-slate-800"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {isHindi ? 'लंबाई' : 'Length'} ({localSettings.unit})
                    </label>
                    <input
                      type="number"
                      value={item.length || ''}
                      onChange={(e) => handleUpdateStock(item.id, 'length', parseFloat(e.target.value))}
                      className="w-full text-sm border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {isHindi ? 'चौड़ाई' : 'Width'} ({localSettings.unit})
                    </label>
                    <input
                      type="number"
                      value={item.width || ''}
                      onChange={(e) => handleUpdateStock(item.id, 'width', parseFloat(e.target.value))}
                      className="w-full text-sm border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {isHindi ? 'मात्रा (Quantity)' : 'Quantity'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity === undefined ? '' : item.quantity}
                      onChange={(e) => handleUpdateStock(item.id, 'quantity', parseInt(e.target.value) || 1)}
                      placeholder="∞ (असीमित)"
                      className="w-full text-sm border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div className="md:col-span-2 flex justify-end">
                    <button
                      onClick={() => handleRemoveStock(item.id)}
                      className="p-2 text-rose-400 hover:bg-rose-100 hover:text-rose-600 rounded-lg transition-colors mt-4 md:mt-0"
                      title="Remove"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleAddStock}
              className="mt-4 flex items-center justify-center gap-2 w-full py-3.5 border-2 border-dashed border-indigo-200 text-indigo-600 rounded-xl hover:bg-indigo-50 hover:border-indigo-300 transition-colors font-medium text-sm"
            >
              <Plus size={18} />
              {isHindi ? 'नया स्टॉक जोड़ें' : 'Add New Stock'}
            </button>
          </section>

          <hr className="border-slate-100" />

          {/* Section: Edge Band Materials */}
          <section>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Layers size={16} className="text-indigo-500" />
              {isHindi ? 'एज बैंडिंग (टेप) मटीरियल' : 'Edge Banding Materials'}
            </h3>
            
            <div className="space-y-3">
              {edgeBandItems.map((item, idx) => (
                <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-slate-50 p-4 rounded-xl border border-slate-200 relative group hover:border-indigo-300 transition-colors">
                  <div className="md:col-span-8">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {isHindi ? 'एज बैंडिंग का नाम (उदा. White)' : 'Edge Band Name (e.g. White)'}
                    </label>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => handleUpdateEdgeBand(item.id, 'name', e.target.value)}
                      className="w-full text-sm border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 font-medium text-slate-800"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {isHindi ? 'मोटाई (mm)' : 'Thickness (mm)'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={item.thickness === undefined ? '' : item.thickness}
                      onChange={(e) => handleUpdateEdgeBand(item.id, 'thickness', parseFloat(e.target.value) || 0)}
                      className="w-full text-sm border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 font-medium text-slate-800"
                      placeholder="e.g. 0.8"
                    />
                  </div>
                  <div className="md:col-span-1 flex justify-end pt-5 md:pt-0">
                    <button
                      onClick={() => handleRemoveEdgeBand(item.id)}
                      className="p-2 text-rose-400 hover:bg-rose-100 hover:text-rose-600 rounded-lg transition-colors"
                      title="Remove"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleAddEdgeBand}
              className="mt-4 flex items-center justify-center gap-2 w-full py-3.5 border-2 border-dashed border-indigo-200 text-indigo-600 rounded-xl hover:bg-indigo-50 hover:border-indigo-300 transition-colors font-medium text-sm"
            >
              <Plus size={18} />
              {isHindi ? 'नई एज बैंडिंग जोड़ें' : 'Add New Edge Banding'}
            </button>
          </section>

          <hr className="border-slate-100" />

          {/* Section: Saw Settings */}
          <section>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Settings size={16} className="text-indigo-500" />
              {isHindi ? 'कटिंग और मशीन सेटिंग्स' : 'Cutting & Machine Settings'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  {isHindi ? "माप इकाई" : "Measurement Unit"}
                </label>
                <select
                  value={localSettings.unit}
                  onChange={handleUnitChange}
                  className="w-full text-sm font-medium border-slate-300 rounded-xl shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="MM">Millimeters (MM)</option>
                  <option value="CM">Centimeters (CM)</option>
                  <option value="Inch">Inches (Inch)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex justify-between">
                  {isHindi ? "ब्लेड की मोटाई (Kerf)" : "Blade Kerf"}
                  <span className="text-indigo-600 font-bold bg-indigo-50 px-1 rounded">mm</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={localSettings.bladeTh}
                  onChange={(e) => handleFieldChange('bladeTh', parseFloat(e.target.value) || 0)}
                  className="w-full text-sm font-medium border-slate-300 rounded-xl shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex justify-between">
                  {isHindi ? "ट्रिम मार्जिन (Trim)" : "Trim Margin"}
                  <span className="text-indigo-600 font-bold bg-indigo-50 px-1 rounded">mm</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={localSettings.trimMargin}
                  onChange={(e) => handleFieldChange('trimMargin', parseFloat(e.target.value) || 0)}
                  className="w-full text-sm font-medium border-slate-300 rounded-xl shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex justify-between">
                  {isHindi ? "एज बैंडिंग (Edge)" : "Edge Banding"}
                  <span className="text-indigo-600 font-bold bg-indigo-50 px-1 rounded">mm</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={localSettings.edgeTh}
                  onChange={(e) => handleFieldChange('edgeTh', parseFloat(e.target.value) || 0)}
                  className="w-full text-sm font-medium border-slate-300 rounded-xl shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="mt-5">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                {isHindi ? "नेस्टिंग एल्गोरिदम (Nesting Engine)" : "Nesting Algorithm"}
              </label>
              <select
                value={localSettings.algorithm}
                onChange={(e) => handleFieldChange('algorithm', e.target.value)}
                className="w-full text-sm font-medium border-slate-300 rounded-xl shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                {ALGORITHMS.map(algo => (
                  <option key={algo.key} value={algo.key}>
                    {isHindi ? algo.labelHi : algo.labelEn}
                  </option>
                ))}
              </select>
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors shadow-sm"
          >
            {isHindi ? 'रद्द करें' : 'Cancel'}
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2.5 flex items-center gap-2 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200 active:scale-95"
          >
            <Save size={18} />
            {isHindi ? 'सेव करें' : 'Save & Apply'}
          </button>
        </div>
      </div>
    </div>
  );
}
