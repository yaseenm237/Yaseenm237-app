import React from 'react';
import { SheetLayout, SheetSettings } from '../../types';
import { getEdgeBandingSummary } from '../../utils/packer';

interface GrandTotalSummaryProps {
  layouts: SheetLayout[];
  settings: SheetSettings;
  translations: any;
  isHindi: boolean;
  showGrandSummary: boolean;
  setShowGrandSummary: (show: boolean) => void;
}

export default function GrandTotalSummary({
  layouts,
  settings,
  translations,
  isHindi,
  showGrandSummary,
  setShowGrandSummary
}: GrandTotalSummaryProps) {
  if (layouts.length === 0) return null;

  return (
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
                  const materialName = layout.materialName || 'Standard';
                  layout.parts.forEach(p => {
                    const edgesSummary = getEdgeBandingSummary(p.edges, isHindi);
                    const edgeTape = p.edgeMaterialId 
                      ? (settings.edgeBandItems?.find(e => e.id === p.edgeMaterialId)?.name || 'Default Tape')
                      : 'Default Tape';
                    
                    const key = `${p.name}_${p.origL}_${p.origW}_${materialName}_${edgesSummary}_${edgeTape}`;
                    if (globalGroup.has(key)) {
                      globalGroup.get(key)!.qty += (p.isSuper ? ((p.colCount || 1) * (p.rowCount || 1)) : 1);
                    } else {
                      globalGroup.set(key, { 
                        name: p.name, 
                        l: p.origL, 
                        w: p.origW, 
                        qty: (p.isSuper ? ((p.colCount || 1) * (p.rowCount || 1)) : 1),
                        material: materialName,
                        edges: edgesSummary,
                        edgeTape: edgeTape
                      });
                    }
                  });
                });
                
                let grandTotalQty = 0;
                
                return Array.from(globalGroup.values()).map((p, idx) => {
                  grandTotalQty += p.qty;
                  
                  return (
                    <tr key={idx} className="hover:bg-indigo-800/20">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-lg">{p.name}</div>
                        <div className="text-sm text-indigo-300 font-mono mt-1">{p.l.toFixed(1)} x {p.w.toFixed(1)} {settings.unit}</div>
                        <div className="flex flex-col gap-0.5 mt-2 text-xs text-indigo-200">
                          <div><span className="opacity-60">{isHindi ? 'बोर्ड मटीरियल:' : 'Board Material:'}</span> {p.material}</div>
                          {settings.edgeTh > 0 && !p.edges.includes('None') && !p.edges.includes('कोई नहीं') && (
                            <div>
                              <span className="opacity-60">{isHindi ? 'एज बैंडिंग:' : 'Edge Banding:'}</span> {p.edges} ({p.edgeTape})
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center align-middle font-black text-2xl text-emerald-300">
                        {p.qty}
                      </td>
                    </tr>
                  );
                }).concat([
                  <tr key="total" className="bg-indigo-800/50 font-bold text-lg border-t-2 border-indigo-500">
                    <td className="py-4 px-4 text-right">
                      {isHindi ? 'कुल पीसेस (Total Pieces) :' : 'Total Pieces :'}
                    </td>
                    <td className="py-4 px-4 text-center text-emerald-400 font-black text-2xl">
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
  );
}
