import sys

with open('src/components/layout-visualizer/KpiStatsGrid.tsx', 'r') as f:
    content = f.read()

content = content.replace("totalBandingLength: number;", "totalBandingLength: number;\\n  totalKerfLossMm2?: number;")
content = content.replace("totalBandingLength,", "totalBandingLength,\\n  totalKerfLossMm2 = 0,")
content = content.replace("grid-cols-1 sm:grid-cols-2 md:grid-cols-4", "grid-cols-1 sm:grid-cols-2 md:grid-cols-5")

kerf_column = """
      {/* Total Kerf Loss */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between h-full group hover:scale-[1.01] transition-transform duration-200">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{isHindi ? 'कुल ब्लेड कटाई (Kerf)' : 'Total Kerf Loss'}</p>
          <h3 className="text-3xl font-light text-slate-900 mt-4 tracking-tight">
            {(totalKerfLossMm2 / 1000).toFixed(1)}
            <span className="text-base text-slate-400 font-bold ml-1">cm²</span>
          </h3>
        </div>
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-orange-500" />
          <span className="text-[10px] text-slate-500 font-semibold">
            {isHindi ? `ब्लेड मोटाई: ${settings.bladeTh}mm` : `Blade: ${settings.bladeTh}mm`}
          </span>
        </div>
      </div>
"""

content = content.replace("    </div>\\n  );", kerf_column + "    </div>\\n  );")

with open('src/components/layout-visualizer/KpiStatsGrid.tsx', 'w') as f:
    f.write(content.replace("\\n", "\n"))
