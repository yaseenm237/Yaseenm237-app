import React from 'react';
import { SheetLayout } from '../../types';

interface PlacedPartsTableProps {
  layout: SheetLayout;
  translations: any;
  isHindi: boolean;
  unit: string;
  getPartColor: (name: string, index: number) => string;
  formatDimPair: (lMm: number, wMm: number) => string;
  getEdgeBandingSummary: (edges: any, isHindi: boolean) => string;
  getSunmicaName: (id?: string) => string;
  convertMmToUnit: (val: number, unit: string) => number;
}

export default function PlacedPartsTable({
  layout,
  translations,
  isHindi,
  unit,
  getPartColor,
  formatDimPair,
  getEdgeBandingSummary,
  getSunmicaName,
  convertMmToUnit
}: PlacedPartsTableProps) {
  return (
    <div className="lg:col-span-7">
      <h5 className="font-bold text-slate-700 text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded bg-indigo-600 inline-block" />
        {translations.sheet_parts_header}
      </h5>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse min-w-[500px]">
          <thead>
            <tr className="border-b border-slate-100 text-slate-400 font-bold whitespace-nowrap">
              <th className="pb-2">{translations.h_name}</th>
              <th className="pb-2">{translations.part_size}</th>
              <th className="pb-2">{translations.cut_size} ({unit})</th>
              <th className="pb-2">{translations.h_grain}</th>
              <th className="pb-2">{translations.applied_banding}</th>
              <th className="pb-2">{isHindi ? 'माइका (सामने/पीषे)' : 'Mica (Front/Back)'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
            {(() => {
              const groupedParts = new Map<string, any>();
              layout.parts.forEach(p => {
                const key = `${p.name}_${p.origL}_${p.origW}_${p.cutL}_${p.cutW}_${p.grain}_${JSON.stringify(p.edges)}_${p.frontLaminateId || ''}_${p.backLaminateId || ''}`;
                if (groupedParts.has(key)) {
                  groupedParts.get(key)!.qty += 1;
                } else {
                  groupedParts.set(key, { ...p, qty: 1 });
                }
              });
              
              return Array.from(groupedParts.values()).map((p, pIdx) => (
                <tr key={pIdx} className="hover:bg-slate-50/50 whitespace-nowrap">
                  <td className="py-2 flex items-center gap-2">
                    <span 
                      className="w-2.5 h-2.5 rounded-full inline-block border border-slate-300"
                      style={{ backgroundColor: getPartColor(p.name, pIdx) }}
                    />
                    {p.partNumber && (
                      <span className="px-1.5 py-0.5 text-[9px] font-black bg-indigo-50 border border-indigo-200 text-indigo-700 rounded select-none shrink-0 mr-1.5">
                        No. {p.partNumber}
                      </span>
                    )}
                    <span className="truncate max-w-[150px]">{p.name}</span> {p.qty > 1 && <span className="text-xs font-bold bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded-full ml-1">x{p.qty}</span>}
                  </td>
                  <td className="py-2 text-slate-800 font-semibold">
                    {formatDimPair(p.origL, p.origW)}
                  </td>
                  <td className="py-2 font-mono text-slate-500">
                    {convertMmToUnit(p.cutL, unit).toFixed(1)} x {convertMmToUnit(p.cutW, unit).toFixed(1)}
                  </td>
                  <td className="py-2">
                    {p.grain === 'L' ? (isHindi ? 'लंबाई ↕' : 'Length ↕') : p.grain === 'W' ? (isHindi ? 'चौड़ाई ↔' : 'Width ↔') : (isHindi ? 'कोई नहीं' : 'None')}
                  </td>
                  <td className="py-2 text-indigo-600 font-semibold text-[11px]">
                    {getEdgeBandingSummary(p.edges, isHindi)}
                  </td>
                  <td className="py-2 text-emerald-600 font-semibold text-[11px]">
                    {p.frontLaminateId || p.backLaminateId ? (
                      <span className="flex flex-col gap-0.5">
                        {p.frontLaminateId && <span>{isHindi ? 'सामने: ' : 'F: '}{getSunmicaName(p.frontLaminateId)}</span>}
                        {p.backLaminateId && <span>{isHindi ? 'पीछे: ' : 'B: '}{getSunmicaName(p.backLaminateId)}</span>}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ));
            })()}
          </tbody>
        </table>
      </div>
    </div>
  );
}
