/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Material, SheetSettings, Language, Unit } from '../types';
import { Bookmark, Plus, Trash2, Check, ArrowDownToLine, DollarSign, Sparkles } from 'lucide-react';

interface MaterialLibraryPanelProps {
  settings: SheetSettings;
  onSelectMaterial: (material: Material) => void;
  language: Language;
  addToast: (message: string, type?: 'success' | 'info') => void;
}

// Built-in high-quality presets for carpentry materials
const PRESET_MATERIALS: Material[] = [
  { id: 'p1', name: 'Birch Plywood 18mm', sheetL: 96, sheetW: 48, unit: 'Inch', cost: 75, isCustom: false },
  { id: 'p2', name: 'MDF Board 18mm', sheetL: 96, sheetW: 48, unit: 'Inch', cost: 45, isCustom: false },
  { id: 'p3', name: 'MDF Board 12mm', sheetL: 96, sheetW: 48, unit: 'Inch', cost: 35, isCustom: false },
  { id: 'p4', name: 'Particle Board 18mm', sheetL: 96, sheetW: 48, unit: 'Inch', cost: 30, isCustom: false },
  { id: 'p5', name: 'Pine Wood Board', sheetL: 72, sheetW: 36, unit: 'Inch', cost: 60, isCustom: false },
  { id: 'p6', name: 'Standard Ply (मल्टी)', sheetL: 2440, sheetW: 1220, unit: 'MM', cost: 50, isCustom: false }
];

export default function MaterialLibraryPanel({
  settings,
  onSelectMaterial,
  language,
  addToast
}: MaterialLibraryPanelProps) {
  const isHindi = language === 'Hindi';
  
  // State for custom-added materials
  const [customMaterials, setCustomMaterials] = useState<Material[]>(() => {
    try {
      const stored = window.localStorage.getItem('carpentry_custom_materials');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Save custom materials to localStorage whenever they change
  useEffect(() => {
    try {
      window.localStorage.setItem('carpentry_custom_materials', JSON.stringify(customMaterials));
    } catch (error) {
      console.warn("Failed to persist custom materials:", error);
    }
  }, [customMaterials]);

  // Collapsible state for adding a new material
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Form input state
  const [newName, setNewName] = useState('');
  const [newL, setNewL] = useState<string>('96');
  const [newW, setNewW] = useState<string>('48');
  const [newUnit, setNewUnit] = useState<Unit>('Inch');
  const [newCost, setNewCost] = useState<string>('50');

  // Currency symbol helper
  const currencySymbol = isHindi ? '₹' : '$';

  // Check if a material matches the active settings
  const isActive = (mat: Material) => {
    return (
      Math.abs(mat.sheetL - settings.sheetL) < 0.01 &&
      Math.abs(mat.sheetW - settings.sheetW) < 0.01 &&
      mat.unit === settings.unit &&
      Math.abs(mat.cost - (settings.sheetCost || 0)) < 0.01
    );
  };

  // Handle loading a material
  const handleLoad = (mat: Material) => {
    onSelectMaterial(mat);
    const msg = isHindi 
      ? `सामग्री "${mat.name}" लोड की गई!` 
      : `Loaded material "${mat.name}" successfully!`;
    addToast(msg, 'success');
  };

  // Add custom material from the form
  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedL = parseFloat(newL);
    const parsedW = parseFloat(newW);
    const parsedCost = parseFloat(newCost);

    if (!newName.trim()) {
      alert(isHindi ? 'कृपया सामग्री का नाम दर्ज करें।' : 'Please enter a material name.');
      return;
    }
    if (isNaN(parsedL) || parsedL <= 0 || isNaN(parsedW) || parsedW <= 0) {
      alert(isHindi ? 'कृपया वैध लंबाई और चौड़ाई दर्ज करें।' : 'Please enter valid length and width values.');
      return;
    }
    if (isNaN(parsedCost) || parsedCost < 0) {
      alert(isHindi ? 'कृपया वैध लागत दर्ज करें।' : 'Please enter a valid cost.');
      return;
    }

    const newMat: Material = {
      id: 'custom_' + Date.now().toString(),
      name: newName.trim(),
      sheetL: parsedL,
      sheetW: parsedW,
      unit: newUnit,
      cost: parsedCost,
      isCustom: true
    };

    setCustomMaterials(prev => [...prev, newMat]);
    
    // Reset form
    setNewName('');
    setIsFormOpen(false);

    const msg = isHindi 
      ? `नई सामग्री "${newMat.name}" सहेजी गई!` 
      : `Custom material "${newMat.name}" saved to library!`;
    addToast(msg, 'success');
  };

  // Save the current active config as a custom material template
  const handleSaveCurrentAsCustom = () => {
    const promptName = prompt(
      isHindi 
        ? "इस सामग्री सेटअप के लिए एक नाम दर्ज करें:" 
        : "Enter a name for this active material setup:"
    );
    if (!promptName || !promptName.trim()) return;

    const currentCost = settings.sheetCost || 0;

    const newMat: Material = {
      id: 'custom_' + Date.now().toString(),
      name: promptName.trim(),
      sheetL: settings.sheetL,
      sheetW: settings.sheetW,
      unit: settings.unit,
      cost: currentCost,
      isCustom: true
    };

    setCustomMaterials(prev => [...prev, newMat]);
    const msg = isHindi 
      ? `वर्तमान सेटअप "${newMat.name}" सहेजा गया!` 
      : `Active setup saved as material "${newMat.name}"!`;
    addToast(msg, 'success');
  };

  // Delete a custom material
  const handleDeleteCustom = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent loading when clicking delete
    const matToDelete = customMaterials.find(m => m.id === id);
    if (!matToDelete) return;

    const confirmDelete = window.confirm(
      isHindi 
        ? `क्या आप सच में "${matToDelete.name}" को हटाना चाहते हैं?` 
        : `Are you sure you want to remove "${matToDelete.name}"?`
    );
    if (!confirmDelete) return;

    setCustomMaterials(prev => prev.filter(m => m.id !== id));
    const msg = isHindi 
      ? `सामग्री "${matToDelete.name}" हटाई गई` 
      : `Removed material "${matToDelete.name}"`;
    addToast(msg, 'info');
  };

  const allMaterials = [...PRESET_MATERIALS, ...customMaterials];

  return (
    <div id="material-library-panel" className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Bookmark size={18} className="text-indigo-600" />
          <div>
            <h3 className="font-bold text-slate-800 text-sm">
              {isHindi ? 'मटीरियल लाइब्रेरी' : 'Wood & Material Library'}
            </h3>
            <p className="text-[10px] text-slate-400 font-medium">
              {isHindi ? 'शीट्स का त्वरित चयन और लागत' : 'Instant board sizing & pricing'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="p-1 rounded-md text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
          title={isHindi ? "नया मटीरियल जोड़ें" : "Add custom material"}
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Inline form to create custom material */}
      {isFormOpen && (
        <form onSubmit={handleAddCustom} className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 flex flex-col gap-2.5">
          <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1">
            <Sparkles size={12} className="text-indigo-500" />
            {isHindi ? 'नया कस्टम मटीरियल' : 'New Custom Material'}
          </h4>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
              {isHindi ? 'सामग्री का नाम' : 'Material Name'}
            </label>
            <input
              type="text"
              required
              placeholder={isHindi ? 'जैसे: 18mm टिक वुड' : 'e.g., Pine MDF 15mm'}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="text-xs border border-slate-200 rounded p-1.5 bg-white text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                {isHindi ? 'लंबाई (Length)' : 'Length'}
              </label>
              <input
                type="number"
                step="any"
                min="0.1"
                required
                value={newL}
                onChange={(e) => setNewL(e.target.value)}
                className="text-xs border border-slate-200 rounded p-1.5 bg-white text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                {isHindi ? 'चौड़ाई (Width)' : 'Width'}
              </label>
              <input
                type="number"
                step="any"
                min="0.1"
                required
                value={newW}
                onChange={(e) => setNewW(e.target.value)}
                className="text-xs border border-slate-200 rounded p-1.5 bg-white text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                {isHindi ? 'इकाई (Unit)' : 'Unit'}
              </label>
              <select
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value as Unit)}
                className="text-xs border border-slate-200 rounded p-1.5 bg-white text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="Inch">Inch (")</option>
                <option value="CM">CM (cm)</option>
                <option value="MM">MM (mm)</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center">
                {isHindi ? 'प्रति शीट लागत' : 'Sheet Cost'} ({currencySymbol})
              </label>
              <input
                type="number"
                step="any"
                min="0"
                required
                value={newCost}
                onChange={(e) => setNewCost(e.target.value)}
                className="text-xs border border-slate-200 rounded p-1.5 bg-white text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end mt-1">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="text-[10px] font-bold px-2 py-1 text-slate-500 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors cursor-pointer"
            >
              {isHindi ? 'रद्द करें' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="text-[10px] font-bold px-2.5 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 shadow-sm transition-colors cursor-pointer"
            >
              {isHindi ? 'सुरक्षित करें' : 'Save Material'}
            </button>
          </div>
        </form>
      )}

      {/* Materials List Scrollable Area */}
      <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
        {allMaterials.map((mat) => {
          const active = isActive(mat);
          return (
            <div
              key={mat.id}
              onClick={() => handleLoad(mat)}
              className={`group flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                active
                  ? 'bg-indigo-50/70 border-indigo-500/40 shadow-sm shadow-indigo-100/50'
                  : 'bg-white hover:bg-slate-50 border-slate-200/80 hover:border-slate-300'
              }`}
            >
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-bold text-slate-700 truncate flex items-center gap-1.5">
                  {mat.name}
                  {mat.isCustom && (
                    <span className="text-[8px] px-1 bg-slate-100 border border-slate-200/60 rounded text-slate-500 font-semibold uppercase tracking-wider scale-95 origin-left shrink-0">
                      {isHindi ? 'कस्टम' : 'Custom'}
                    </span>
                  )}
                </span>
                <span className="text-[10px] text-slate-400 font-semibold mt-0.5">
                  {mat.sheetL} x {mat.sheetW} {mat.unit === 'Inch' ? 'in' : mat.unit.toLowerCase()}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Cost value */}
                <span className={`text-xs font-extrabold ${active ? 'text-indigo-600' : 'text-slate-500 group-hover:text-slate-700'}`}>
                  {currencySymbol}{mat.cost.toFixed(0)}
                </span>

                {/* Status action or delete */}
                {active ? (
                  <div className="p-1 bg-emerald-500 rounded-full text-white">
                    <Check size={10} strokeWidth={3} />
                  </div>
                ) : mat.isCustom ? (
                  <button
                    onClick={(e) => handleDeleteCustom(mat.id, e)}
                    className="p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                    title={isHindi ? "हटाएं" : "Delete template"}
                  >
                    <Trash2 size={12} />
                  </button>
                ) : (
                  <div className="p-1 text-slate-300 group-hover:text-indigo-400 transition-colors">
                    <ArrowDownToLine size={12} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Button to quickly save active setup as a library material */}
      <button
        onClick={handleSaveCurrentAsCustom}
        className="w-full text-[11px] font-bold py-1.5 border border-dashed border-indigo-200 text-indigo-600 bg-indigo-50/20 hover:bg-indigo-50 hover:border-indigo-400/50 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
      >
        <span>📁 {isHindi ? 'वर्तमान विन्यास सहेजें' : 'Save current config as template'}</span>
      </button>
    </div>
  );
}
