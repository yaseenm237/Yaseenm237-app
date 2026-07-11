import React from 'react';
import { Check, PlusCircle } from 'lucide-react';
import { SheetLayout, SheetSettings } from '../../types';

interface OffcutsTableProps {
  layout: SheetLayout;
  settings: SheetSettings;
  savedOffcuts: string[];
  isHindi: boolean;
  onUpdateSettings?: (settings: SheetSettings) => void;
  handleSaveOffcut: (w: { x: number; y: number; w: number; h: number }, wIdx: number, sheetIndex: number, materialName?: string) => void;
  formatDim: (val: number) => string;
}

export default function OffcutsTable({
  layout,
  settings,
  savedOffcuts,
  isHindi,
  onUpdateSettings,
  handleSaveOffcut,
  formatDim
}: OffcutsTableProps) {
  return (
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
                {onUpdateSettings && <th className="pb-2 pl-2">{isHindi ? 'कार्रवाई' : 'Action'}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
              {layout.wasteRects.map((w, wIdx) => {
                // Determine if waste piece is highly reusable (e.g., larger than 300mm on both sides)
                const isReusable = w.w >= 300 && w.h >= 300;
                const isSaved = savedOffcuts.includes(`${layout.sheetIndex}-${wIdx}`);
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
                    {onUpdateSettings && (
                      <td className="py-2 pl-2">
                        {isReusable ? (
                          isSaved ? (
                            <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                              <Check size={12} /> {isHindi ? 'सहेजा गया' : 'Saved'}
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSaveOffcut(w, wIdx, layout.sheetIndex, layout.materialName)}
                              className="flex items-center gap-1 text-[10px] bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-2 py-0.5 rounded font-bold transition-all border border-indigo-200"
                              title={isHindi ? 'स्टॉक सूची में जोड़ें' : 'Save to Stock material list'}
                            >
                              <PlusCircle size={10} />
                              {isHindi ? 'सहेजें' : 'Save'}
                            </button>
                          )
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">-</span>
                        )}
                      </td>
                    )}
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
  );
}
