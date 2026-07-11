import React, { useState, useEffect } from 'react';
import { SheetSettings, StockItem, Language, Unit, EdgeBandItem, SunmicaItem, MaterialRecipe } from '../types';
import { X, Plus, Trash2, Save, Settings, Layers, Database, CheckCircle, AlertCircle } from 'lucide-react';
import { SavedJob } from './SavedFilesModal';

interface SettingsModalProps {
  settings: SheetSettings;
  onChange: (settings: SheetSettings) => void;
  onClose: () => void;
  language: Language;
  savedJobs?: SavedJob[];
  activeJobId?: string | null;
  onSaveToJob?: (jobId: string, updatedSettings: SheetSettings) => void;
}

const ALGORITHMS = [
  { key: 'AutoBest', labelEn: 'Auto Best (AI Multi-Pass)', labelHi: 'ऑटो बेस्ट (AI मल्टी-पास)' },
  { key: 'StripCutColFirst', labelEn: 'Strip-Cut Column-First (Standard)', labelHi: 'स्ट्रिप-कट कॉलम-फर्स्ट (मानक)' },
  { key: 'StripCutRowFirst', labelEn: 'Strip-Cut Row-First (Fast rip)', labelHi: 'स्ट्रिप-कट रो-फर्स्ट (फास्ट रिप)' },
  { key: 'GuillotineBssfSas', labelEn: 'Guillotine BSSF SAS (Table Saw Cut)', labelHi: 'गिलोटीन BSSF SAS (टेबल सॉ कट)' },
  { key: 'GuillotineBssfMaxas', labelEn: 'Guillotine BSSF MAXAS (Alt Table Saw)', labelHi: 'गिलोटीन BSSF MAXAS (वैकल्पिक)' },
  { key: 'MaxRectsBssf', labelEn: 'MaxRects BSSF (CNC Nesting / Dense)', labelHi: 'मैक्सरेक्ट्स BSSF (CNC राउटर / सघन)' }
];

const STANDARD_THICKNESSES: Record<string, number[]> = {
  Plywood: [6, 8, 12, 15, 16, 18, 19, 25],
  MDF: [6, 8, 12, 15, 16.5, 18, 25],
  WPC: [6, 12, 17, 18],
  'Multi-board': [12, 17, 18],
  Melamine: [18],
  Sunmica: [0.8, 1.0, 1.2, 1.5],
  Other: []
};

export default function SettingsModal({
  settings,
  onChange,
  onClose,
  language,
  savedJobs = [],
  activeJobId = null,
  onSaveToJob
}: SettingsModalProps) {
  const isHindi = language === 'Hindi';

  // Local state for all settings
  const [localSettings, setLocalSettings] = useState<SheetSettings>(settings);

  // States for job-specific settings save
  const [selectedJobId, setSelectedJobId] = useState<string>(() => {
    if (activeJobId && savedJobs.some(j => j.id === activeJobId)) {
      return activeJobId;
    }
    return savedJobs.length > 0 ? savedJobs[0].id : '';
  });
  const [saveToJobStatus, setSaveToJobStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [saveToJobMessage, setSaveToJobMessage] = useState<string>('');

  useEffect(() => {
    if (activeJobId && savedJobs.some(j => j.id === activeJobId)) {
      setSelectedJobId(activeJobId);
    } else if (savedJobs.length > 0 && !selectedJobId) {
      setSelectedJobId(savedJobs[0].id);
    }
  }, [activeJobId, savedJobs]);

  const handleSaveToSpecificJob = (jobIdToSave: string) => {
    if (!jobIdToSave) {
      setSaveToJobStatus('error');
      setSaveToJobMessage(isHindi ? 'कृपया एक वैध जॉब चुनें।' : 'Please select a valid job.');
      return;
    }
    if (onSaveToJob) {
      onSaveToJob(jobIdToSave, localSettings);
      const targetJob = savedJobs.find(j => j.id === jobIdToSave);
      setSaveToJobStatus('success');
      setSaveToJobMessage(
        isHindi
          ? `सेटिंग्स '${targetJob?.name || 'जॉब'}' में सफलतापूर्वक सहेज दी गई हैं!`
          : `Settings saved to job '${targetJob?.name || 'Job'}' successfully!`
      );
      setTimeout(() => {
        setSaveToJobStatus('idle');
        setSaveToJobMessage('');
      }, 3000);
    }
  };

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
          name: isHindi ? '18mm प्लाईवुड' : '18mm Plywood',
          length: prev.unit === 'MM' ? 2440 : prev.unit === 'Inch' ? 96 : 244,
          width: prev.unit === 'MM' ? 1220 : prev.unit === 'Inch' ? 48 : 122,
          cost: 0,
          category: 'Plywood',
          thickness: 18,
          isOffcut: false,
          quantity: 10
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

  const sunmicaItems = localSettings.sunmicaItems || [];

  const handleAddSunmica = () => {
    setLocalSettings(prev => ({
      ...prev,
      sunmicaItems: [
        ...(prev.sunmicaItems || []),
        {
          id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
          name: isHindi ? 'नया सनमाइका / लेमिनेट' : 'New Sunmica / Laminate',
          thickness: 0.8,
          code: ''
        }
      ]
    }));
  };

  const handleUpdateSunmica = (id: string, field: keyof SunmicaItem, value: any) => {
    setLocalSettings(prev => ({
      ...prev,
      sunmicaItems: (prev.sunmicaItems || []).map(item => {
        if (item.id === id) {
          return { ...item, [field]: value };
        }
        return item;
      })
    }));
  };

  const handleRemoveSunmica = (id: string) => {
    setLocalSettings(prev => {
      const updated = (prev.sunmicaItems || []).filter(item => item.id !== id);
      return { ...prev, sunmicaItems: updated };
    });
  };

  const handleAddRecipe = () => {
    const defaultBaseId = stockItems[0]?.id || '';
    const defaultMicaAId = sunmicaItems[0]?.id || '';
    const defaultMicaBId = sunmicaItems[1]?.id || sunmicaItems[0]?.id || '';
    
    // Calculate initial thickness
    const baseMat = stockItems.find(s => s.id === defaultBaseId);
    const micaA = sunmicaItems.find(s => s.id === defaultMicaAId);
    const micaB = sunmicaItems.find(s => s.id === defaultMicaBId);
    
    const baseTh = baseMat?.thickness || 18.0;
    const micaATh = micaA?.thickness || 0.0;
    const micaBTh = micaB?.thickness || 0.0;
    const calcTh = Number((baseTh + micaATh + micaBTh).toFixed(2));

    setLocalSettings(prev => ({
      ...prev,
      recipes: [
        ...(prev.recipes || []),
        {
          id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
          name: `MOD_RECIPE_${(prev.recipes?.length || 0) + 1}`,
          baseMaterialId: defaultBaseId,
          sideAMicaId: defaultMicaAId,
          sideBMicaId: defaultMicaBId,
          calculatedThickness: calcTh
        }
      ]
    }));
  };

  const handleUpdateRecipe = (id: string, field: keyof MaterialRecipe, value: any) => {
    setLocalSettings(prev => {
      const updatedRecipes = (prev.recipes || []).map(recipe => {
        if (recipe.id === id) {
          const updatedRecipe = { ...recipe, [field]: value };
          
          // Re-calculate thickness
          const baseMat = stockItems.find(s => s.id === updatedRecipe.baseMaterialId);
          const micaA = sunmicaItems.find(s => s.id === updatedRecipe.sideAMicaId);
          const micaB = sunmicaItems.find(s => s.id === updatedRecipe.sideBMicaId);
          
          const baseTh = baseMat?.thickness || 18.0;
          const micaATh = micaA?.thickness || 0.0;
          const micaBTh = micaB?.thickness || 0.0;
          updatedRecipe.calculatedThickness = Number((baseTh + micaATh + micaBTh).toFixed(2));
          
          return updatedRecipe;
        }
        return recipe;
      });
      return { ...prev, recipes: updatedRecipes };
    });
  };

  const handleRemoveRecipe = (id: string) => {
    setLocalSettings(prev => {
      const updated = (prev.recipes || []).filter(r => r.id !== id);
      return { ...prev, recipes: updated };
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
              {stockItems.map((item, idx) => {
                const cat = item.category || 'Plywood';
                const thicknesses = STANDARD_THICKNESSES[cat] || [];
                const isCustomTh = item.thickness !== undefined && !thicknesses.includes(item.thickness);

                return (
                  <div key={item.id} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 hover:border-indigo-300 transition-all shadow-sm space-y-4">
                    {/* Row 1: Category, Thickness, Stock Type, Qty */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                      {/* Category */}
                      <div className="md:col-span-3">
                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                          {isHindi ? 'मटीरियल कैटेगरी' : 'Material Category'}
                        </label>
                        <select
                          value={cat}
                          onChange={(e) => {
                            const newCat = e.target.value as any;
                            handleUpdateStock(item.id, 'category', newCat);
                            const defaultThickness = STANDARD_THICKNESSES[newCat]?.[0] || 18;
                            handleUpdateStock(item.id, 'thickness', defaultThickness);
                            // Auto generate name
                            handleUpdateStock(item.id, 'name', `${defaultThickness}mm ${newCat}`);
                          }}
                          className="w-full text-xs border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 font-bold text-slate-800 bg-white"
                        >
                          <option value="Plywood">Plywood (प्लाईवुड)</option>
                          <option value="MDF">MDF (एमडीएफ)</option>
                          <option value="WPC">WPC (डब्ल्यूपीसी)</option>
                          <option value="Melamine">Melamine (मेलामाइल)</option>
                          <option value="Multi-board">Multi-board (मल्टी-बोर्ड)</option>
                          <option value="Sunmica">Sunmica / Laminate (सनमाइका)</option>
                          <option value="Other">Other (अन्य)</option>
                        </select>
                      </div>

                      {/* Thickness Select & Custom input */}
                      <div className="md:col-span-3 flex gap-2">
                        <div className="flex-1">
                          <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                            {isHindi ? 'मानक मोटाई (Grade)' : 'Standard Grade'}
                          </label>
                          <select
                            value={isCustomTh ? 'custom' : (item.thickness || 18).toString()}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val !== 'custom') {
                                const thNum = parseFloat(val);
                                handleUpdateStock(item.id, 'thickness', thNum);
                                handleUpdateStock(item.id, 'name', `${thNum}mm ${cat}`);
                              } else {
                                handleUpdateStock(item.id, 'thickness', 0); // custom edit
                              }
                            }}
                            className="w-full text-xs border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 font-semibold text-slate-700 bg-white"
                          >
                            {thicknesses.map(t => (
                              <option key={t} value={t.toString()}>{t} mm</option>
                            ))}
                            <option value="custom">{isHindi ? 'कस्टम...' : 'Custom...'}</option>
                          </select>
                        </div>
                        {isCustomTh && (
                          <div className="w-20 shrink-0">
                            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                              {isHindi ? 'मोटाई' : 'Thick'}
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              min="0.1"
                              value={item.thickness || ''}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                handleUpdateStock(item.id, 'thickness', val);
                                handleUpdateStock(item.id, 'name', `${val}mm ${cat}`);
                              }}
                              className="w-full text-xs border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 font-bold"
                            />
                          </div>
                        )}
                      </div>

                      {/* Stock Type (Full vs Offcut) */}
                      <div className="md:col-span-3">
                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                          {isHindi ? 'बोर्ड का प्रकार' : 'Board Type'}
                        </label>
                        <div className="flex gap-1.5 p-1 bg-slate-200/50 rounded-lg">
                          <button
                            type="button"
                            onClick={() => handleUpdateStock(item.id, 'isOffcut', false)}
                            className={`flex-1 text-center text-[10px] py-1 font-bold rounded-md transition-colors ${
                              !item.isOffcut
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {isHindi ? 'पूर्ण शीट' : 'Full Sheet'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateStock(item.id, 'isOffcut', true)}
                            className={`flex-1 text-center text-[10px] py-1 font-bold rounded-md transition-colors ${
                              item.isOffcut
                                ? 'bg-amber-500 text-white shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {isHindi ? 'कतरन' : 'Offcut'}
                          </button>
                        </div>
                      </div>

                      {/* Quantity */}
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                          {isHindi ? 'मात्रा (Qty)' : 'Stock Qty'}
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity === undefined || item.quantity === 0 ? '' : item.quantity}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const val = e.target.value;
                            handleUpdateStock(item.id, 'quantity', val === '' ? 0 : parseInt(val) || 0);
                          }}
                          onBlur={() => {
                            if (item.quantity === 0) {
                              handleUpdateStock(item.id, 'quantity', 1);
                            }
                          }}
                          className="w-full text-xs border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 font-bold text-center"
                        />
                      </div>

                      {/* Remove */}
                      <div className="md:col-span-1 flex justify-end">
                        <button
                          onClick={() => handleRemoveStock(item.id)}
                          className="p-2 text-rose-400 hover:bg-rose-100 hover:text-rose-600 rounded-lg transition-colors"
                          title="Remove"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>

                    {/* Row 2: Name, Length, Width, Cost */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-3 border-t border-slate-200/60 items-center">
                      {/* Name */}
                      <div className="md:col-span-4">
                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                          {isHindi ? 'मटीरियल नाम (SKU Label)' : 'Material SKU Label'}
                        </label>
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleUpdateStock(item.id, 'name', e.target.value)}
                          className="w-full text-xs border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 font-semibold text-slate-700"
                        />
                      </div>

                      {/* Length */}
                      <div className="md:col-span-3">
                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                          {isHindi ? 'लंबाई' : 'Length'} ({localSettings.unit})
                        </label>
                        <input
                          type="number"
                          value={item.length || ''}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleUpdateStock(item.id, 'length', parseFloat(e.target.value) || 0)}
                          className="w-full text-xs border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 font-bold"
                        />
                      </div>

                      {/* Width */}
                      <div className="md:col-span-3">
                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                          {isHindi ? 'चौड़ाई' : 'Width'} ({localSettings.unit})
                        </label>
                        <input
                          type="number"
                          value={item.width || ''}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleUpdateStock(item.id, 'width', parseFloat(e.target.value) || 0)}
                          className="w-full text-xs border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 font-bold"
                        />
                      </div>

                      {/* Cost */}
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                          {isHindi ? 'कीमत / शीट' : 'Sheet Cost'}
                        </label>
                        <input
                          type="number"
                          value={item.cost || ''}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleUpdateStock(item.id, 'cost', parseFloat(e.target.value) || 0)}
                          className="w-full text-xs border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 font-bold"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
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
                      onFocus={(e) => e.target.select()}
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

          {/* Section: Sunmica / Laminate Materials */}
          <section>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Layers size={16} className="text-indigo-500" />
              {isHindi ? 'सनमाइका / लेमिनेट प्रेसिंग स्टॉक (Pressing Grade)' : 'Sunmica / Laminate Pressing Stock (Pressing Grade)'}
            </h3>
            
            <div className="space-y-3">
              {sunmicaItems.map((item, idx) => (
                <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-slate-50 p-4 rounded-xl border border-slate-200 relative group hover:border-indigo-300 transition-colors">
                  <div className="md:col-span-6">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {isHindi ? 'सनमाइका का नाम / कोड' : 'Sunmica Name / Code'}
                    </label>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => handleUpdateSunmica(item.id, 'name', e.target.value)}
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
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => handleUpdateSunmica(item.id, 'thickness', parseFloat(e.target.value) || 0)}
                      className="w-full text-sm border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 font-medium text-slate-800"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {isHindi ? 'कलर कोड / बारकोड' : 'Color Code / Barcode'}
                    </label>
                    <input
                      type="text"
                      value={item.code || ''}
                      placeholder={isHindi ? 'उदा. #102 या सफ़ेद' : 'e.g. #102 or Off-white'}
                      onChange={(e) => handleUpdateSunmica(item.id, 'code', e.target.value)}
                      className="w-full text-sm border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 font-medium text-slate-800"
                    />
                  </div>
                  <div className="md:col-span-1 flex justify-end">
                    <button
                      onClick={() => handleRemoveSunmica(item.id)}
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
              onClick={handleAddSunmica}
              className="mt-4 flex items-center justify-center gap-2 w-full py-3.5 border-2 border-dashed border-indigo-200 text-indigo-600 rounded-xl hover:bg-indigo-50 hover:border-indigo-300 transition-colors font-medium text-sm"
            >
              <Plus size={18} />
              {isHindi ? 'नया सनमाइका / लेमिनेट जोड़ें' : 'Add New Sunmica / Laminate'}
            </button>
          </section>

          <hr className="border-slate-100" />

          {/* Section: Pressed Panel Recipes (Material Recipe Master) */}
          <section>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Database size={16} className="text-indigo-500" />
              {isHindi ? 'मटीरियल रेसिपी मास्टर (Pressed Panel SKUs)' : 'Material Recipe Master (Pressed Panel SKUs)'}
            </h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              {isHindi
                ? 'प्लाईवुड और माइका को मिलाकर कस्टमाइज़्ड "Pressed Panel" रेसिपी बनाएं। यह ग्रूविंग और फिटिंग के लिए मोटाई (Thickness) का स्वचालित हिसाब रखेगा।'
                : 'Combine Plywood + Mica layers to create customized "Pressed Panel" recipes. This auto-calculates total thickness for hardware and groove precision.'}
            </p>
            
            <div className="space-y-3">
              {(localSettings.recipes || []).map((item) => (
                <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-slate-50 p-4 rounded-xl border border-slate-200 relative group hover:border-indigo-300 transition-colors">
                  <div className="md:col-span-3">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {isHindi ? 'रेसिपी (SKU) नाम' : 'Recipe Name (SKU)'}
                    </label>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => handleUpdateRecipe(item.id, 'name', e.target.value)}
                      className="w-full text-sm border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 font-bold text-indigo-900"
                    />
                  </div>
                  
                  <div className="md:col-span-3">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {isHindi ? 'बेस प्लाईवुड' : 'Base Board'}
                    </label>
                    <select
                      value={item.baseMaterialId}
                      onChange={(e) => handleUpdateRecipe(item.id, 'baseMaterialId', e.target.value)}
                      className="w-full text-xs border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 font-medium text-slate-700 bg-white"
                    >
                      <option value="">-- Choose Base --</option>
                      {stockItems.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.thickness || 18}mm)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {isHindi ? 'सामने का माइका' : 'Side A Laminate'}
                    </label>
                    <select
                      value={item.sideAMicaId}
                      onChange={(e) => handleUpdateRecipe(item.id, 'sideAMicaId', e.target.value)}
                      className="w-full text-xs border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 font-medium text-slate-700 bg-white"
                    >
                      <option value="">None (0mm)</option>
                      {sunmicaItems.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.code ? `[${s.code}]` : ''} ({s.thickness || 0.8}mm)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {isHindi ? 'पीछे का माइका' : 'Side B Laminate'}
                    </label>
                    <select
                      value={item.sideBMicaId}
                      onChange={(e) => handleUpdateRecipe(item.id, 'sideBMicaId', e.target.value)}
                      className="w-full text-xs border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 font-medium text-slate-700 bg-white"
                    >
                      <option value="">None (0mm)</option>
                      {sunmicaItems.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.code ? `[${s.code}]` : ''} ({s.thickness || 0.6}mm)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-1 text-center">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {isHindi ? 'मोटाई' : 'Thick'}
                    </span>
                    <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-1.5 py-1 rounded block truncate">
                      {item.calculatedThickness}mm
                    </span>
                  </div>

                  <div className="md:col-span-1 flex justify-end">
                    <button
                      onClick={() => handleRemoveRecipe(item.id)}
                      className="p-2 text-rose-400 hover:bg-rose-100 hover:text-rose-600 rounded-lg transition-colors"
                      title="Remove Recipe"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleAddRecipe}
              className="mt-4 flex items-center justify-center gap-2 w-full py-3.5 border-2 border-dashed border-indigo-200 text-indigo-600 rounded-xl hover:bg-indigo-50 hover:border-indigo-300 transition-colors font-medium text-sm"
            >
              <Plus size={18} />
              {isHindi ? 'नई रेसिपी (Pressed SKU) जोड़ें' : 'Add New Pressed SKU Recipe'}
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
                  onFocus={(e) => e.target.select()}
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
                  onFocus={(e) => e.target.select()}
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
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => handleFieldChange('edgeTh', parseFloat(e.target.value) || 0)}
                  className="w-full text-sm font-medium border-slate-300 rounded-xl shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  {isHindi ? "नेस्टिंग एल्गोरिदम (Nesting Engine)" : "Nesting Algorithm"}
                </label>
                <select
                  value={localSettings.algorithm}
                  onChange={(e) => handleFieldChange('algorithm', e.target.value)}
                  className="w-full text-sm font-medium border-slate-300 rounded-xl shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white"
                >
                  {ALGORITHMS.map(algo => (
                    <option key={algo.key} value={algo.key}>
                      {isHindi ? algo.labelHi : algo.labelEn}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3 bg-indigo-50/50 border border-indigo-100 rounded-xl p-4">
                <input
                  type="checkbox"
                  id="respect-grain-checkbox"
                  checked={localSettings.respectGrain !== false}
                  onChange={(e) => handleFieldChange('respectGrain', e.target.checked)}
                  className="w-4.5 h-4.5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                />
                <div className="cursor-pointer select-none" onClick={() => handleFieldChange('respectGrain', localSettings.respectGrain === false)}>
                  <label htmlFor="respect-grain-checkbox" className="block text-xs font-bold text-slate-800 cursor-pointer">
                    {isHindi ? "ग्रेन नियमों का सख्ती से पालन करें" : "Respect Grain Rules Strictly"}
                  </label>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {isHindi 
                      ? "यदि चालू है, तो पुर्जों को उनकी चुनी हुई ग्रेन दिशा (लंबाई/चौड़ाई) के अनुसार ही काटा जाएगा।" 
                      : "If active, parts will not be rotated unless specified, preserving grain alignment."}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* Section: Job-Specific Settings */}
          <section className="bg-indigo-50/40 p-5 rounded-2xl border border-indigo-100/80">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Database size={16} className="text-indigo-600" />
              {isHindi ? 'जॉब विशिष्ट सेटिंग्स (Job-Specific Settings)' : 'Job-Specific Settings'}
            </h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              {isHindi
                ? 'इस मटीरियल स्टॉक, एल्गोरिदम और मार्जिन प्राथमिकताओं को किसी विशिष्ट सुरक्षित प्रोजेक्ट/जॉब में स्थायी रूप से सहेजें।'
                : 'Save these current material stocks, nesting algorithm, and margins directly to a specific saved job.'}
            </p>

            {savedJobs && savedJobs.length > 0 ? (
              <div className="flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-1 w-full">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    {isHindi ? 'सुरक्षित जॉब चुनें' : 'Select Saved Job'}
                  </label>
                  <select
                    value={selectedJobId}
                    onChange={(e) => setSelectedJobId(e.target.value)}
                    className="w-full text-sm font-medium border-slate-300 rounded-xl shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white"
                  >
                    {savedJobs.map(job => (
                      <option key={job.id} value={job.id}>
                        {job.name} {activeJobId === job.id ? (isHindi ? ' (सक्रिय)' : ' (Loaded)') : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => handleSaveToSpecificJob(selectedJobId)}
                  className="w-full sm:w-auto px-5 py-2.5 flex items-center justify-center gap-2 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 active:scale-95 whitespace-nowrap cursor-pointer"
                >
                  <Save size={16} />
                  {isHindi ? 'जॉब में सेटिंग्स सेव करें' : 'Save Settings'}
                </button>
              </div>
            ) : (
              <div className="text-sm text-slate-500 flex items-center gap-2 bg-slate-100/50 p-3 rounded-xl border border-slate-200">
                <AlertCircle size={16} className="text-amber-500" />
                <span>
                  {isHindi
                    ? 'कोई सहेजी गई फ़ाइल उपलब्ध नहीं है। सेटिंग्स सहेजने के लिए पहले मुख्य स्क्रीन पर प्रोजेक्ट का काम सेव करें।'
                    : 'No saved jobs available. Please export/print a layout first to save a project, then you can customize its settings.'}
                </span>
              </div>
            )}

            {saveToJobStatus !== 'idle' && (
              <div className={`mt-3 p-3 rounded-xl border flex items-center gap-2.5 text-xs font-medium ${
                saveToJobStatus === 'success' 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}>
                {saveToJobStatus === 'success' ? <CheckCircle size={16} className="text-emerald-600 flex-shrink-0" /> : <AlertCircle size={16} className="text-rose-600 flex-shrink-0" />}
                <span>{saveToJobMessage}</span>
              </div>
            )}
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
