import React from 'react';
import { SheetSettings, Unit } from '../../types';
import { convertMmToUnit } from '../../utils/packer';

interface KpiStatsGridProps {
  totalUtilization: number;
  overallWastePercent: number;
  totalSheetsUsed: number;
  totalBandingLength: number;
  totalKerfLossMm2?: number;
  settings: SheetSettings;
  translations: any;
  isHindi: boolean;
  unit: Unit;
}

export default function KpiStatsGrid({
  totalUtilization,
  overallWastePercent,
  totalSheetsUsed,
  totalBandingLength,
  totalKerfLossMm2 = 0,
  settings,
  translations,
  isHindi,
  unit
}: KpiStatsGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
      {/* Efficiency */}
      <div className="bg-indigo-900 text-white rounded-2xl p-6 shadow-md shadow-indigo-100 flex flex-col justify-between h-full group hover:scale-[1.01] transition-transform duration-200">
        <div>
          <p className="text-xs font-bold text-indigo-300 uppercase tracking-widest">{translations.efficiency}</p>
          <h3 className="text-4xl font-light mt-4 tracking-tight">
            {totalUtilization.toFixed(1)}<span className="text-xl font-medium">%</span>
          </h3>
        </div>
        <div className="mt-4">
          <div className="w-full bg-indigo-950/60 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-emerald-400 h-full rounded-full transition-all duration-500" 
              style={{ width: `${totalUtilization}%` }}
            />
          </div>
          <span className="text-[10px] text-indigo-200 font-semibold mt-2 block">
            {isHindi ? 'मटीरियल का उत्कृष्ट उपयोग' : 'Excellent material nesting'}
          </span>
        </div>
      </div>

      {/* Waste */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 shadow-md flex flex-col justify-between h-full group hover:scale-[1.01] transition-transform duration-200">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{translations.waste}</p>
          <h3 className="text-4xl font-light mt-4 tracking-tight">
            {overallWastePercent.toFixed(1)}<span className="text-xl font-medium">%</span>
          </h3>
        </div>
        <div className="mt-4">
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-amber-400 h-full rounded-full transition-all duration-500" 
              style={{ width: `${overallWastePercent}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-400 font-semibold mt-2 block">
            {isHindi ? 'बचा हुआ कतरन भाग' : 'Off-cuts & sawdust loss'}
          </span>
        </div>
      </div>

      {/* Sheets Used */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between h-full group hover:scale-[1.01] transition-transform duration-200">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{translations.sheets_used}</p>
          <h3 className="text-4xl font-light text-slate-900 mt-4 tracking-tight">
            {totalSheetsUsed} <span className="text-lg text-slate-400 font-medium">/ {settings.stock}</span>
          </h3>
        </div>
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] text-slate-500 font-semibold">
            {isHindi ? 'मटीरियल स्टॉक' : 'Stock availability'}
          </span>
        </div>
      </div>

      {/* Edge Banding length */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between h-full group hover:scale-[1.01] transition-transform duration-200">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{translations.total_banding}</p>
          <h3 className="text-3xl font-light text-slate-900 mt-4 tracking-tight">
            {convertMmToUnit(totalBandingLength, unit).toFixed(1)}
            <span className="text-base text-slate-400 font-bold ml-1">{unit}</span>
          </h3>
        </div>
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-500" />
          <span className="text-[10px] text-slate-500 font-semibold">
            {isHindi ? 'लागत आकलन हेतु सहायक' : 'Helps in banding estimation'}
          </span>
        </div>
      </div>
    </div>
  );
}
