/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PartInput, Language, Grain, Edges } from '../types';
import { CARPENTRY_PRESETS } from '../utils/presets';
import { Plus, Trash2, ListFilter, ClipboardList, RotateCw, Sparkles, AlertCircle } from 'lucide-react';

interface CuttingListPanelProps {
  parts: PartInput[];
  onChange: (parts: PartInput[]) => void;
  language: Language;
  translations: any;
  unit: string;
}

export default function CuttingListPanel({
  parts,
  onChange,
  language,
  translations,
  unit
}: CuttingListPanelProps) {
  const isHindi = language === 'Hindi';
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');

  const handleAddRow = () => {
    const newPart: PartInput = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
      name: '',
      length: 0,
      width: 0,
      grain: 'L',
      allowRot: false,
      quantity: 1,
      edges: { T: false, B: false, L: false, R: false }
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

        {/* Preset Selector */}
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-indigo-600 animate-pulse" />
          <select
            id="preset-loader"
            value={selectedPresetId}
            onChange={handlePresetLoad}
            className="text-xs font-bold border border-slate-200 rounded-lg py-1.5 px-3 bg-indigo-50/60 text-indigo-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">-- {translations.presets} --</option>
            {CARPENTRY_PRESETS.map(pr => (
              <option key={pr.id} value={pr.id}>
                {isHindi ? pr.nameHi : pr.nameEn}
              </option>
            ))}
          </select>
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
          <table id="cutlist-table" className="w-full text-left border-collapse min-w-[760px]">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="pb-3 w-[180px]">{translations.h_name}</th>
                <th className="pb-3 w-[100px]">{translations.h_l} ({unit})</th>
                <th className="pb-3 w-[100px]">{translations.h_w} ({unit})</th>
                <th className="pb-3 w-[110px]">{translations.h_grain}</th>
                <th className="pb-3 w-[90px]">{translations.allow_rot}</th>
                <th className="pb-3 w-[80px]">{translations.h_qty}</th>
                <th className="pb-3 w-[120px]">{translations.h_edges} (T, B, L, R)</th>
                <th className="pb-3 w-[50px] text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {parts.map((part) => (
                <tr key={part.id} className="hover:bg-slate-50/50 transition-colors group">
                  {/* Name */}
                  <td className="py-2.5 pr-2">
                    <input
                      type="text"
                      placeholder={isHindi ? 'पुर्जा' : 'e.g., Side Panel'}
                      value={part.name}
                      onChange={(e) => handleRowChange(part.id, 'name', e.target.value)}
                      className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-colors"
                    />
                  </td>

                  {/* Length */}
                  <td className="py-2.5 pr-2">
                    <input
                      type="number"
                      step="any"
                      min="0.1"
                      placeholder="0.0"
                      value={part.length || ''}
                      onChange={(e) => handleRowChange(part.id, 'length', Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-colors"
                    />
                  </td>

                  {/* Width */}
                  <td className="py-2.5 pr-2">
                    <input
                      type="number"
                      step="any"
                      min="0.1"
                      placeholder="0.0"
                      value={part.width || ''}
                      onChange={(e) => handleRowChange(part.id, 'width', Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-colors"
                    />
                  </td>

                  {/* Grain */}
                  <td className="py-2.5 pr-2">
                    <select
                      value={part.grain}
                      onChange={(e) => handleRowChange(part.id, 'grain', e.target.value as Grain)}
                      className="w-full text-xs border border-slate-200 rounded-lg px-2 py-2 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none font-medium text-slate-700"
                    >
                      <option value="L">{isHindi ? 'लंबाई ↕' : 'Length ↕'}</option>
                      <option value="W">{isHindi ? 'चौड़ाई ↔' : 'Width ↔'}</option>
                      <option value="N">{isHindi ? 'कोई नहीं ♻' : 'None ♻'}</option>
                    </select>
                  </td>

                  {/* Rotation */}
                  <td className="py-2.5 pr-2">
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
                  </td>

                  {/* Quantity */}
                  <td className="py-2.5 pr-2">
                    <input
                      type="number"
                      min="1"
                      value={part.quantity}
                      onChange={(e) => handleRowChange(part.id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 text-center font-semibold text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-colors"
                    />
                  </td>

                  {/* Edge Banding Selection T, B, L, R */}
                  <td className="py-2.5 pr-2">
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
                  </td>

                  {/* Delete Button */}
                  <td className="py-2.5 text-center">
                    <button
                      type="button"
                      onClick={() => handleDeleteRow(part.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title={isHindi ? 'पुर्जा हटाएं' : 'Remove Part'}
                    >
                      <Trash2 id={`delete-btn-${part.id}`} size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
    </div>
  );
}
