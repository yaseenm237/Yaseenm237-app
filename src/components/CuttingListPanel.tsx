/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { PartInput, Language, Grain, Edges, SheetSettings } from '../types';
import { CARPENTRY_PRESETS } from '../utils/presets';
import { SmartBadge } from './SmartBadge';
import { Plus, Trash2, ListFilter, ClipboardList, RotateCw, Sparkles, AlertCircle, X, Navigation, Target } from 'lucide-react';

const GrainToggle = ({ 
  grain, 
  onChange,
  isHindi
}: { 
  grain: Grain, 
  onChange: (g: Grain) => void,
  isHindi: boolean
}) => {
  const nextGrain = grain === 'L' ? 'W' : grain === 'W' ? 'N' : 'L';
  
  return (
    <button
      type="button"
      onClick={() => onChange(nextGrain)}
      className="relative flex items-center justify-between w-full border border-slate-200 rounded-lg px-2 py-1 bg-white hover:bg-slate-50 transition-colors focus:ring-2 focus:ring-indigo-500/20 focus:outline-none h-[34px]"
      title={isHindi ? 'ग्रेन की दिशा बदलने के लिए क्लिक करें' : 'Click to toggle grain direction'}
    >
      <span className="text-xs font-semibold text-slate-700">
        {grain === 'L' ? (isHindi ? 'लंबाई' : 'Length') : 
         grain === 'W' ? (isHindi ? 'चौड़ाई' : 'Width') : 
         (isHindi ? 'कोई नहीं' : 'None')}
      </span>
      <div className={`w-6 h-6 border rounded-[4px] flex items-center justify-center shrink-0 shadow-sm ${grain === 'N' ? 'bg-slate-50 border-slate-200' : 'bg-amber-50 border-amber-200'} overflow-hidden`}>
        {grain === 'L' && (
          <div className="flex gap-[3px] h-full w-full justify-center py-[2px] transform">
            <div className="w-[1.5px] h-full bg-amber-600/50 rounded-full"></div>
            <div className="w-[1.5px] h-full bg-amber-600/50 rounded-full"></div>
            <div className="w-[1.5px] h-full bg-amber-600/50 rounded-full"></div>
          </div>
        )}
        {grain === 'W' && (
          <div className="flex flex-col gap-[3px] w-full h-full justify-center px-[2px] transform">
            <div className="h-[1.5px] w-full bg-amber-600/50 rounded-full"></div>
            <div className="h-[1.5px] w-full bg-amber-600/50 rounded-full"></div>
            <div className="h-[1.5px] w-full bg-amber-600/50 rounded-full"></div>
          </div>
        )}
        {grain === 'N' && (
          <div className="text-[10px] text-slate-400 font-bold leading-none">Ø</div>
        )}
      </div>
    </button>
  );
};

interface CuttingListPanelProps {
  parts: PartInput[];
  onChange: (parts: PartInput[]) => void;
  language: Language;
  translations: any;
  unit: string;
  settings: SheetSettings;
  onOpenCabinetDesigner?: () => void;
}

export default function CuttingListPanel({
  parts,
  onChange,
  language,
  translations,
  unit,
  settings,
  onOpenCabinetDesigner
}: CuttingListPanelProps) {
  const isHindi = language === 'Hindi';
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [isPasteModalOpen, setIsPasteModalOpen] = useState<boolean>(false);
  const [pasteText, setPasteText] = useState<string>('');
  const [pasteError, setPasteError] = useState<string>('');
  const [pasteMode, setPasteMode] = useState<'append' | 'replace'>('append');
  const hasMultiMaterials = (settings.stockItems?.length || 0) > 1 || (settings.recipes?.length || 0) > 0;
  const hasEdgeMaterials = (settings.edgeBandItems?.length || 0) > 0;
  const [editingHolesFor, setEditingHolesFor] = useState<string | null>(null);

  const getPartThickness = (part: any) => {
    const recipe = settings.recipes?.find(r => r.id === part.materialId);
    if (recipe) {
      return recipe.calculatedThickness;
    }
    const baseMat = settings.stockItems?.find(s => s.id === part.materialId) || settings.stockItems?.[0];
    const micaA = settings.sunmicaItems?.find(s => s.id === part.frontLaminateId);
    const micaB = settings.sunmicaItems?.find(s => s.id === part.backLaminateId);
    
    const baseTh = baseMat?.thickness || 18.0;
    const micaATh = micaA?.thickness || 0.0;
    const micaBTh = micaB?.thickness || 0.0;
    return Number((baseTh + micaATh + micaBTh).toFixed(2));
  };

  // Lock body scroll when paste modal is open
  useEffect(() => {
    if (isPasteModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isPasteModalOpen]);

  // Smart spreadsheet rows parser
  const parsePastedData = (text: string): PartInput[] => {
    const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length === 0) return [];

    const parsedParts: PartInput[] = [];
    
    // Header detection matching both English and Hindi
    const firstLineTokens = lines[0].split(/\t/).map(t => t.trim().toLowerCase());
    let hasHeaders = false;
    let nameColIdx = -1;
    let lengthColIdx = -1;
    let widthColIdx = -1;
    let qtyColIdx = -1;

    const nameHeaders = ['name', 'part', 'item', 'details', 'नाम', 'पुर्जा', 'विवरण'];
    const lengthHeaders = ['length', 'l', 'len', 'लंबाई', 'l (cm)', 'l (mm)', 'l (inch)', 'लम्बाई'];
    const widthHeaders = ['width', 'w', 'wid', 'चौड़ाई', 'w (cm)', 'w (mm)', 'w (inch)', 'चौड़ाई'];
    const qtyHeaders = ['qty', 'quantity', 'count', 'no', 'मात्रा', 'पीस', 'संख्या'];

    firstLineTokens.forEach((token, idx) => {
      if (nameHeaders.some(h => token.includes(h))) {
        nameColIdx = idx;
        hasHeaders = true;
      } else if (lengthHeaders.some(h => token === h || token.startsWith(h))) {
        lengthColIdx = idx;
        hasHeaders = true;
      } else if (widthHeaders.some(h => token === h || token.startsWith(h))) {
        widthColIdx = idx;
        hasHeaders = true;
      } else if (qtyHeaders.some(h => token === h || token.startsWith(h))) {
        qtyColIdx = idx;
        hasHeaders = true;
      }
    });

    const startIndex = hasHeaders ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      const tokens = line.split(/\t/).map(t => t.trim());
      
      let finalTokens = tokens;
      // Fallback split modes (comma, semi-colon, double-spaces)
      if (tokens.length === 1) {
        if (line.includes(',')) {
          finalTokens = line.split(',').map(t => t.trim());
        } else if (line.includes(';')) {
          finalTokens = line.split(';').map(t => t.trim());
        } else {
          const spaceTokens = line.split(/ {2,}/).map(t => t.trim());
          if (spaceTokens.length > 1) {
            finalTokens = spaceTokens;
          }
        }
      }

      if (finalTokens.length === 0 || (finalTokens.length === 1 && !finalTokens[0])) continue;

      let name = '';
      let length = 0;
      let width = 0;
      let qty = 1;

      if (hasHeaders) {
        if (nameColIdx !== -1 && nameColIdx < finalTokens.length) {
          name = finalTokens[nameColIdx];
        }
        if (lengthColIdx !== -1 && lengthColIdx < finalTokens.length) {
          length = parseFloat(finalTokens[lengthColIdx]) || 0;
        }
        if (widthColIdx !== -1 && widthColIdx < finalTokens.length) {
          width = parseFloat(finalTokens[widthColIdx]) || 0;
        }
        if (qtyColIdx !== -1 && qtyColIdx < finalTokens.length) {
          qty = Math.max(1, parseInt(finalTokens[qtyColIdx], 10) || 1);
        }
      } else {
        // Automatic column content matching based on column counts
        if (finalTokens.length >= 4) {
          const firstIsNum = !isNaN(Number(finalTokens[0]));
          if (!firstIsNum) {
            name = finalTokens[0];
            length = parseFloat(finalTokens[1]) || 0;
            width = parseFloat(finalTokens[2]) || 0;
            qty = Math.max(1, parseInt(finalTokens[3], 10) || 1);
          } else {
            length = parseFloat(finalTokens[0]) || 0;
            width = parseFloat(finalTokens[1]) || 0;
            qty = Math.max(1, parseInt(finalTokens[2], 10) || 1);
            name = finalTokens[3] || `Part ${length}x${width}`;
          }
        } else if (finalTokens.length === 3) {
          length = parseFloat(finalTokens[0]) || 0;
          width = parseFloat(finalTokens[1]) || 0;
          qty = Math.max(1, parseInt(finalTokens[2], 10) || 1);
          name = `Part ${length}x${width}`;
        } else if (finalTokens.length === 2) {
          length = parseFloat(finalTokens[0]) || 0;
          width = parseFloat(finalTokens[1]) || 0;
          qty = 1;
          name = `Part ${length}x${width}`;
        } else {
          length = parseFloat(finalTokens[0]) || 0;
          width = 0;
          qty = 1;
          name = `Part ${length}`;
        }
      }

      if (!name) {
        name = `Part ${length}x${width}`;
      }

      parsedParts.push({
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
        name: name,
        length: length,
        width: width,
        grain: 'L',
        allowRot: false,
        quantity: qty,
        edges: { T: false, B: false, L: false, R: false }
      });
    }

    return parsedParts;
  };

  const handleAddRow = () => {
    const defaultMaterialId = settings.stockItems && settings.stockItems.length > 0
      ? settings.stockItems[0].id
      : undefined;

    const newPart: PartInput = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
      name: '',
      length: 0,
      width: 0,
      grain: 'L',
      allowRot: false,
      quantity: 1,
      edges: { T: false, B: false, L: false, R: false },
      materialId: defaultMaterialId
    };
    onChange([...parts, newPart]);
  };

  const handleDeleteRow = (id: string) => {
    onChange(parts.filter(p => p.id !== id));
  };

  const handleRowChange = (id: string, field: keyof PartInput, value: any) => {
    onChange(parts.map(p => {
      if (p.id === id) {
        return { ...p, [field]: value };
      }
      return p;
    }));
  };

  const handleEdgeToggle = (id: string, edge: keyof Edges) => {
    onChange(parts.map(p => {
      if (p.id === id) {
        const updatedEdges = {
          ...p.edges,
          [edge]: !p.edges[edge]
        };
        return { ...p, edges: updatedEdges };
      }
      return p;
    }));
  };

  const handlePresetLoad = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const presetId = e.target.value;
    setSelectedPresetId(presetId);
    if (!presetId) return;

    const preset = CARPENTRY_PRESETS.find(pr => pr.id === presetId);
    if (!preset) return;

    // Map preset parts to actual inputs
    const mappedParts: PartInput[] = preset.parts.map(p => ({
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
      name: p.name,
      length: p.length,
      width: p.width,
      grain: p.grain,
      allowRot: p.allowRot,
      quantity: p.quantity,
      edges: { ...p.edges }
    }));

    onChange(mappedParts);
  };

  const handleClearList = () => {
    if (window.confirm(isHindi ? 'क्या आप सूची साफ़ करना चाहते हैं?' : 'Are you sure you want to clear the list?')) {
      onChange([]);
    }
  };

  return (
    <div id="cutting-list-panel" className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-md shadow-indigo-100">
            <ClipboardList size={20} id="cutlist-icon" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 text-lg">{translations.cut_list}</h2>
            <p className="text-xs text-slate-500 font-medium">
              {isHindi ? 'कटे जाने वाले पुर्जों की विमाएँ दर्ज करें' : 'Enter dimensions of parts to be cut'}
            </p>
          </div>
        </div>

        {/* Actions bar (Presets + Sheets Paste) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Preset Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg p-1">
            <Sparkles size={14} className="text-indigo-600 animate-pulse ml-1" />
            <select
              id="preset-loader"
              value={selectedPresetId}
              onChange={handlePresetLoad}
              className="text-xs font-bold border-none bg-transparent text-indigo-900 focus:outline-none focus:ring-0 cursor-pointer pr-4"
            >
              <option value="">-- {translations.presets} --</option>
              {CARPENTRY_PRESETS.map(pr => (
                <option key={pr.id} value={pr.id}>
                  {isHindi ? pr.nameHi : pr.nameEn}
                </option>
              ))}
            </select>
          </div>

          {/* Paste from Sheets Button */}
          <button
            onClick={() => setIsPasteModalOpen(true)}
            className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/60 text-xs font-bold px-3 py-2 rounded-lg transition-all active:scale-95 cursor-pointer shadow-sm shadow-emerald-50"
            title={isHindi ? "एक्सेल या गूगल शीट्स से पेस्ट करें" : "Paste from Excel / Google Sheets"}
          >
            <ClipboardList size={14} />
            {isHindi ? "शीट से पेस्ट" : "Paste from Sheets"}
          </button>

          {/* 2D Cabinet Designer Trigger Button */}
          {onOpenCabinetDesigner && (
            <button
              onClick={onOpenCabinetDesigner}
              className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/60 text-xs font-bold px-3 py-2 rounded-lg transition-all active:scale-95 cursor-pointer shadow-sm shadow-indigo-50"
              title={isHindi ? "2D अलमारी डिज़ाइनर खोलें" : "Open 2D Cabinet Designer"}
            >
              <Sparkles size={14} className="text-indigo-500 animate-pulse" />
              {isHindi ? "2D अलमारी डिज़ाइनर" : "2D Cabinet Designer"}
            </button>
          )}
        </div>
      </div>

      {/* Main Table / Grid */}
      <div className="flex-1 overflow-x-auto min-h-[300px]">
        {parts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3 border-2 border-dashed border-slate-100 rounded-2xl p-6">
            <AlertCircle size={36} className="text-slate-300" />
            <p className="text-sm font-medium">
              {isHindi ? 'सूची खाली है। नया पुर्जा जोड़ने के लिए बटन दबाएं।' : 'No parts added yet. Click Add Row to start.'}
            </p>
            <button
              id="empty-state-add-btn"
              onClick={handleAddRow}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-indigo-100 transition-colors cursor-pointer"
            >
              <Plus size={14} />
              {translations.add_row}
            </button>
          </div>
        ) : (
          <div 
            id="cutlist-grid"
            className="grid gap-y-1 min-w-max pb-4 items-center" 
            style={{ 
              gridTemplateColumns: [
                'minmax(220px, auto)',
                hasMultiMaterials ? 'minmax(180px, auto)' : null,
                'minmax(100px, auto)',
                'minmax(100px, auto)',
                'minmax(110px, auto)',
                'minmax(90px, auto)',
                '80px',
                'minmax(140px, auto)',
                hasEdgeMaterials ? 'minmax(140px, auto)' : null,
                'minmax(140px, auto)',
                'minmax(140px, auto)',
                '80px'
              ].filter(Boolean).join(' ') 
            }}
          >
            {/* Header */}
            <div className="contents text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <div className="pb-3 border-b border-slate-100 px-1">{translations.h_name}</div>
              {hasMultiMaterials && <div className="pb-3 border-b border-slate-100 px-1">{isHindi ? 'मटीरियल' : 'Material'}</div>}
              <div className="pb-3 border-b border-slate-100 px-1">{translations.h_l} ({unit})</div>
              <div className="pb-3 border-b border-slate-100 px-1">{translations.h_w} ({unit})</div>
              <div className="pb-3 border-b border-slate-100 px-1">{translations.h_grain}</div>
              <div className="pb-3 border-b border-slate-100 px-1">{translations.allow_rot}</div>
              <div className="pb-3 border-b border-slate-100 px-1">{translations.h_qty}</div>
              <div className="pb-3 border-b border-slate-100 px-1">{translations.h_edges} (T, B, L, R)</div>
              {hasEdgeMaterials && <div className="pb-3 border-b border-slate-100 px-1">{isHindi ? 'एज बैंड टेप' : 'Edge Band'}</div>}
              <div className="pb-3 border-b border-slate-100 px-1">{isHindi ? 'सामने का माइका' : 'Front Mica'}</div>
              <div className="pb-3 border-b border-slate-100 px-1">{isHindi ? 'पीछे का माइका' : 'Back Mica'}</div>
              <div className="pb-3 border-b border-slate-100 px-1 text-center"></div>
            </div>

            {/* Body */}
            {parts.map((part) => (
              <div key={part.id} className="grid col-span-full items-center hover:bg-slate-50/50 transition-colors p-1 rounded-xl group" style={{ gridTemplateColumns: 'subgrid' }}>

                  {/* Name */}
                  <div className="py-2.5 pr-2">
                    <div className="flex items-center gap-1.5 w-full">
                      {part.partNumber && (
                        <span 
                          className="px-1.5 py-0.5 text-[9px] font-black bg-indigo-50 border border-indigo-200 text-indigo-700 rounded select-none shrink-0"
                          title={isHindi ? `भाग संख्या: ${part.partNumber}` : `Part Number: ${part.partNumber}`}
                        >
                          {part.partNumber}
                        </span>
                      )}
                      {(() => {
                        const thick = getPartThickness(part);
                        return (
                          <div title={isHindi ? `कुल दबाया हुआ पैनल मोटाई` : `Total pressed panel thickness`}>
                            <SmartBadge bgColor="#10b981" text={`${thick}mm`} className="!text-[10px]" />
                          </div>
                        );
                      })()}
                      <div className="relative inline-grid w-full">
                        <span className="invisible col-start-1 row-start-1 px-2.5 py-1.5 text-sm whitespace-pre min-w-[140px] w-full">
                          {part.name || (isHindi ? 'पुर्जा' : 'e.g., Side Panel')}
                        </span>
                        <input
                          type="text"
                          placeholder={isHindi ? 'पुर्जा' : 'e.g., Side Panel'}
                          value={part.name}
                          onChange={(e) => handleRowChange(part.id, 'name', e.target.value)}
                          className="col-start-1 row-start-1 w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Material */}
                  {hasMultiMaterials && (
                    <div className="py-2.5 pr-2">
                      <select
                        value={part.materialId || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          handleRowChange(part.id, 'materialId', val || undefined);
                          const recipe = settings.recipes?.find(r => r.id === val);
                          if (recipe) {
                            handleRowChange(part.id, 'frontLaminateId', recipe.sideAMicaId || undefined);
                            handleRowChange(part.id, 'backLaminateId', recipe.sideBMicaId || undefined);
                          }
                        }}
                        className="w-full text-xs border border-slate-200 rounded-lg px-2 py-2 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none font-medium text-slate-700"
                      >
                        <option value="">{isHindi ? 'चुनें...' : 'Choose Board / Recipe...'}</option>
                        {settings.recipes && settings.recipes.length > 0 && (
                          <optgroup label={isHindi ? "प्रेसिंग रेसिपी (Pressed Panels)" : "Pressed Recipes (SKUs)"}>
                            {settings.recipes.map(recipe => (
                              <option key={recipe.id} value={recipe.id}>
                                {recipe.name} ({recipe.calculatedThickness}mm)
                              </option>
                            ))}
                          </optgroup>
                        )}
                        <optgroup label={isHindi ? "कच्चा बोर्ड (Raw Boards)" : "Raw Stock Boards"}>
                          {settings.stockItems?.filter(item => !item.isOffcut).map(item => (
                            <option key={item.id} value={item.id}>
                              {item.name} ({item.thickness || 18}mm)
                            </option>
                          ))}
                        </optgroup>
                        {settings.stockItems?.some(item => item.isOffcut) && (
                          <optgroup label={isHindi ? "कतरन बोर्ड (Offcuts / Leftovers)" : "Offcuts / Leftovers"}>
                            {settings.stockItems?.filter(item => item.isOffcut).map(item => (
                              <option key={item.id} value={item.id}>
                                {item.name}
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                    </div>
                  )}

                  {/* Length */}
                  <div className="py-2.5 pr-2">
                    <div className="relative inline-grid w-full">
                      <span className="invisible col-start-1 row-start-1 px-2.5 py-1.5 text-sm font-medium whitespace-pre min-w-[80px] w-full">
                        {part.length || '0.0'}
                      </span>
                      <input
                        type="number"
                        step="any"
                        min="0.1"
                        placeholder="0.0"
                        value={part.length === 0 ? '' : part.length}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const val = e.target.value;
                          handleRowChange(part.id, 'length', val === '' ? 0 : parseFloat(val) || 0);
                        }}
                        className="col-start-1 row-start-1 w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {/* Width */}
                  <div className="py-2.5 pr-2">
                    <div className="relative inline-grid w-full">
                      <span className="invisible col-start-1 row-start-1 px-2.5 py-1.5 text-sm font-medium whitespace-pre min-w-[80px] w-full">
                        {part.width || '0.0'}
                      </span>
                      <input
                        type="number"
                        step="any"
                        min="0.1"
                        placeholder="0.0"
                        value={part.width === 0 ? '' : part.width}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const val = e.target.value;
                          handleRowChange(part.id, 'width', val === '' ? 0 : parseFloat(val) || 0);
                        }}
                        className="col-start-1 row-start-1 w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {/* Grain */}
                  <div className="py-2.5 pr-2">
                    <GrainToggle
                      grain={part.grain}
                      onChange={(g) => handleRowChange(part.id, 'grain', g)}
                      isHindi={isHindi}
                    />
                  </div>

                  {/* Rotation */}
                  <div className="py-2.5 pr-2">
                    <button
                      type="button"
                      disabled={part.grain !== 'N'}
                      onClick={() => handleRowChange(part.id, 'allowRot', !part.allowRot)}
                      className={`w-full text-xs font-semibold py-1.5 px-2 rounded-lg border transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        part.grain !== 'N'
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                          : part.allowRot
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/80'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <RotateCw size={11} className={part.allowRot && part.grain === 'N' ? 'animate-spin-slow' : ''} />
                      {part.grain !== 'N' 
                        ? (isHindi ? 'बंद' : 'Locked') 
                        : part.allowRot 
                        ? (isHindi ? 'हाँ' : 'On') 
                        : (isHindi ? 'नहीं' : 'Off')}
                    </button>
                  </div>

                  {/* Quantity */}
                  <div className="py-2.5 pr-2">
                    <input
                      type="number"
                      min="1"
                      value={part.quantity === 0 ? '' : part.quantity}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const val = e.target.value;
                        handleRowChange(part.id, 'quantity', val === '' ? 0 : Math.max(0, parseInt(val) || 0));
                      }}
                      onBlur={() => {
                        if (part.quantity === 0) {
                          handleRowChange(part.id, 'quantity', 1);
                        }
                      }}
                      className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 text-center font-semibold text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-colors"
                    />
                  </div>

                  {/* Edge Banding Selection T, B, L, R */}
                  <div className="py-2.5 pr-2">
                    <div className="flex gap-1 justify-start">
                      {(['T', 'B', 'L', 'R'] as const).map((edge) => (
                        <button
                          key={edge}
                          type="button"
                          onClick={() => handleEdgeToggle(part.id, edge)}
                          className={`w-6 h-6 text-[10px] font-bold rounded flex items-center justify-center transition-all cursor-pointer border ${
                            part.edges[edge]
                              ? 'bg-indigo-600 text-white border-indigo-600 font-extrabold scale-105 shadow-sm'
                              : 'bg-white hover:bg-slate-50 text-slate-400 border-slate-200 hover:text-slate-600'
                          }`}
                          title={`${isHindi ? 'किनारा' : 'Edge'} ${edge}`}
                        >
                          {edge}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Edge Band Material */}
                  {hasEdgeMaterials && (
                    <div className="py-2.5 pr-2">
                      <select
                        value={part.edgeMaterialId || ''}
                        disabled={!part.edges.T && !part.edges.B && !part.edges.L && !part.edges.R}
                        onChange={(e) => handleRowChange(part.id, 'edgeMaterialId', e.target.value || undefined)}
                        className={`w-full text-xs border rounded-lg px-2 py-2 focus:outline-none font-medium transition-colors ${
                          (!part.edges.T && !part.edges.B && !part.edges.L && !part.edges.R)
                            ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
                            : 'bg-white border-slate-200 text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                        }`}
                      >
                        <option value="">{isHindi ? 'डिफ़ॉल्ट टेप' : 'Default Tape'}</option>
                        {settings.edgeBandItems?.map(item => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Front Mica */}
                  <div className="py-2.5 pr-2">
                    <select
                      value={part.frontLaminateId || ''}
                      onChange={(e) => handleRowChange(part.id, 'frontLaminateId', e.target.value || undefined)}
                      className="w-full text-xs border border-slate-200 rounded-lg px-2 py-2 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none font-medium text-slate-700"
                    >
                      <option value="">{isHindi ? 'कोई नहीं' : 'None'}</option>
                      {settings.sunmicaItems?.map(item => (
                        <option key={item.id} value={item.id}>
                          {item.name} {item.code ? `[${item.code}]` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Back Mica */}
                  <div className="py-2.5 pr-2">
                    <select
                      value={part.backLaminateId || ''}
                      onChange={(e) => handleRowChange(part.id, 'backLaminateId', e.target.value || undefined)}
                      className="w-full text-xs border border-slate-200 rounded-lg px-2 py-2 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none font-medium text-slate-700"
                    >
                      <option value="">{isHindi ? 'कोई नहीं' : 'None'}</option>
                      {settings.sunmicaItems?.map(item => (
                        <option key={item.id} value={item.id}>
                          {item.name} {item.code ? `[${item.code}]` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Actions (Holes + Delete) */}
                  <div className="py-2.5 text-center flex items-center justify-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditingHolesFor(part.id)}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${part.drillHoles?.length ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                      title={isHindi ? 'छेद (Holes) सेट करें' : 'Manage Drill Holes'}
                    >
                      <Target size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteRow(part.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title={isHindi ? 'पुर्जा हटाएं' : 'Remove Part'}
                    >
                      <Trash2 id={`delete-btn-${part.id}`} size={15} />
                    </button>
                  </div>
                
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="border-t border-slate-100 pt-4 mt-4 flex items-center justify-between">
        <button
          id="add-row-btn"
          onClick={handleAddRow}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-100 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        >
          <Plus size={16} />
          {translations.add_row}
        </button>

        {parts.length > 0 && (
          <button
            id="clear-list-btn"
            onClick={handleClearList}
            className="flex items-center gap-1.5 text-slate-400 hover:text-rose-600 font-medium text-xs py-2 px-3 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
          >
            <Trash2 size={13} />
            {translations.clear_list}
          </button>
        )}
      </div>

      {/* Paste from Excel / Google Sheets Modal */}
      {isPasteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                  <ClipboardList size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">
                    {isHindi ? 'एक्सेल / गूगल शीट्स से पेस्ट करें' : 'Paste from Excel / Google Sheets'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isHindi 
                      ? 'स्प्रेडशीट से कॉलम कॉपी करके नीचे पेस्ट करें (नाम, लंबाई, चौड़ाई, मात्रा)' 
                      : 'Copy columns from your spreadsheet and paste them below (Name, Length, Width, Qty)'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setIsPasteModalOpen(false);
                  setPasteText('');
                  setPasteError('');
                }} 
                className="p-2 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1 bg-white space-y-4">
              {/* Instructions */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs text-slate-600 space-y-2">
                <p className="font-bold text-slate-700">
                  {isHindi ? '💡 कैसे इस्तेमाल करें:' : '💡 Instructions:'}
                </p>
                <ul className="list-disc list-inside space-y-1">
                  <li>
                    {isHindi 
                      ? 'कॉलम का क्रम हो सकता है: नाम, लंबाई, चौड़ाई, मात्रा' 
                      : 'Supported formats: "Name [tab] Length [tab] Width [tab] Qty"'}
                  </li>
                  <li>
                    {isHindi 
                      ? 'कॉलम के हेडर (Name, Length, Width, Qty) भी शामिल हो सकते हैं, एल्गोरिदम उन्हें खुद पहचान लेगा।' 
                      : 'Includes header detection. If column headers exist, the app automatically matches them.'}
                  </li>
                  <li>
                    {isHindi 
                      ? 'अगर केवल 3 कॉलम हैं, तो उन्हें लंबाई, चौड़ाई और मात्रा माना जाएगा।' 
                      : 'If 3 columns are pasted, they are treated as: Length, Width, Qty (and names are auto-generated).'}
                  </li>
                </ul>
                <div className="mt-2 pt-2 border-t border-slate-200 flex justify-between items-center text-[11px] text-slate-400 font-mono">
                  <span>Example format:</span>
                  <span>Side Panel [tab] 720 [tab] 560 [tab] 4</span>
                </div>
              </div>

              {/* Paste area */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  {isHindi ? 'यहाँ पेस्ट करें:' : 'Paste Here:'}
                </label>
                <textarea
                  value={pasteText}
                  onChange={(e) => {
                    setPasteText(e.target.value);
                    if (e.target.value.trim()) setPasteError('');
                  }}
                  rows={8}
                  placeholder={
                    isHindi 
                      ? "उदाहरण के लिए:\nSide Panel\t720\t560\t4\nTop Shelf\t600\t350\t2" 
                      : "Paste spreadsheet rows here (Ctrl+V / Cmd+V)...\ne.g.\nSide Panel\t720\t560\t4\nTop Shelf\t600\t350\t2"
                  }
                  className="w-full text-sm font-mono border-slate-300 rounded-xl shadow-inner focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 p-3.5 h-48 focus:outline-none resize-none transition-all"
                />
              </div>

              {/* Error state */}
              {pasteError && (
                <div className="flex items-start gap-2.5 bg-rose-50 border border-rose-200 text-rose-700 p-3.5 rounded-xl text-xs font-semibold">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{pasteError}</span>
                </div>
              )}

              {/* Options */}
              <div className="flex items-center gap-6 bg-slate-50/50 p-3 rounded-xl border border-slate-100 text-sm">
                <span className="font-bold text-slate-700 text-xs uppercase tracking-wider">
                  {isHindi ? 'आयात विकल्प:' : 'Import Option:'}
                </span>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="radio"
                    name="pasteMode"
                    value="append"
                    checked={pasteMode === 'append'}
                    onChange={() => setPasteMode('append')}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>{isHindi ? 'मौजूदा सूची में जोड़ें' : 'Append to current list'}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="radio"
                    name="pasteMode"
                    value="replace"
                    checked={pasteMode === 'replace'}
                    onChange={() => setPasteMode('replace')}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>{isHindi ? 'पूरी सूची बदलें' : 'Replace entire list'}</span>
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50 rounded-b-2xl">
              <button
                onClick={() => {
                  setIsPasteModalOpen(false);
                  setPasteText('');
                  setPasteError('');
                }}
                className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors shadow-sm cursor-pointer"
              >
                {isHindi ? 'रद्द करें' : 'Cancel'}
              </button>
              <button
                onClick={() => {
                  const cleanedText = pasteText.trim();
                  if (!cleanedText) {
                    setPasteError(isHindi ? 'कृपया पहले डेटा पेस्ट करें!' : 'Please paste some data first!');
                    return;
                  }
                  
                  const parsed = parsePastedData(cleanedText);
                  if (parsed.length === 0) {
                    setPasteError(isHindi ? 'कोई वैध डेटा नहीं मिला। कृपया फॉर्मेट की जांच करें।' : 'No valid parts found. Please check your data format.');
                    return;
                  }

                  if (pasteMode === 'replace') {
                    onChange(parsed);
                  } else {
                    onChange([...parts, ...parsed]);
                  }

                  setIsPasteModalOpen(false);
                  setPasteText('');
                  setPasteError('');
                }}
                className="px-6 py-2.5 flex items-center gap-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-md shadow-emerald-200 active:scale-95 cursor-pointer"
              >
                {isHindi ? 'डेटा इम्पोर्ट करें' : 'Import Parts'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Hole Editing Modal */}
      {editingHolesFor && (() => {
        const part = parts.find(p => p.id === editingHolesFor);
        if (!part) return null;

        const holes = part.drillHoles || [];

        const updateHoles = (newHoles: any[]) => {
          handleRowChange(part.id, 'drillHoles', newHoles);
        };

        const addHole = () => {
          updateHoles([...holes, { id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2), x: 50, y: 50, diameter: 5, label: 'Hinge' }]);
        };

        const updateHole = (id: string, field: string, value: any) => {
          updateHoles(holes.map(h => h.id === id ? { ...h, [field]: value } : h));
        };

        const deleteHole = (id: string) => {
          updateHoles(holes.filter(h => h.id !== id));
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div>
                  <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                    <Target className="text-indigo-600" size={20} />
                    {isHindi ? 'ड्रिल होल सेट करें' : 'Manage Drill Holes'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {part.name} ({part.length}x{part.width})
                  </p>
                </div>
                <button
                  onClick={() => setEditingHolesFor(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-xl transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-4 overflow-y-auto flex-1">
                <div className="space-y-3">
                  {holes.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">
                      {isHindi ? 'इस पुर्जे में कोई छेद नहीं है।' : 'No drill holes defined for this part.'}
                    </div>
                  ) : (
                    holes.map((h, i) => (
                      <div key={h.id} className="flex gap-2 items-center bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <span className="text-xs font-bold text-slate-400 w-4">{i + 1}.</span>
                        <input
                          type="text"
                          placeholder={isHindi ? 'लेबल' : 'Label'}
                          value={h.label || ''}
                          onChange={(e) => updateHole(h.id, 'label', e.target.value)}
                          className="flex-1 min-w-0 text-xs border border-slate-200 rounded px-2 py-1.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-500 font-bold">X:</span>
                          <input
                            type="number"
                            value={h.x === 0 ? '' : h.x}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateHole(h.id, 'x', val === '' ? 0 : parseFloat(val) || 0);
                            }}
                            className="w-16 text-xs border-slate-200 rounded px-2 py-1.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-500 font-bold">Y:</span>
                          <input
                            type="number"
                            value={h.y === 0 ? '' : h.y}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateHole(h.id, 'y', val === '' ? 0 : parseFloat(val) || 0);
                            }}
                            className="w-16 text-xs border-slate-200 rounded px-2 py-1.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-500 font-bold">Ø:</span>
                          <input
                            type="number"
                            value={h.diameter === 0 ? '' : h.diameter}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateHole(h.id, 'diameter', val === '' ? 0 : parseFloat(val) || 0);
                            }}
                            className="w-14 text-xs border-slate-200 rounded px-2 py-1.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                          />
                        </div>
                        <button
                          onClick={() => deleteHole(h.id)}
                          className="p-1 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
                
                <button
                  onClick={addHole}
                  className="mt-4 w-full py-2 flex items-center justify-center gap-2 text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors cursor-pointer border border-indigo-100"
                >
                  <Plus size={16} />
                  {isHindi ? 'नया छेद जोड़ें' : 'Add Drill Hole'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
