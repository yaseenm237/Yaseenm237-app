import React from 'react';
import { ClipboardCheck, Ruler, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { SheetLayout, SheetSettings } from '../../types';
import { generateSahiraSteps } from '../../utils/sequencer';

interface SahiraSequencerProps {
  layout: SheetLayout;
  settings: SheetSettings;
  isHindi: boolean;
  activeStepIndices: Record<number, number>;
  setActiveStepIndices: React.Dispatch<React.SetStateAction<Record<number, number>>>;
  completedSteps: Record<number, Record<number, boolean>>;
  toggleStepCompleted: (sheetIndex: number, stepIndex: number, totalStepsCount: number) => void;
  convertMmToUnit: (val: number, unit: string) => number;
  getPartColor: (name: string, index: number) => string;
}

export default function SahiraSequencer({
  layout,
  settings,
  isHindi,
  activeStepIndices,
  setActiveStepIndices,
  completedSteps,
  toggleStepCompleted,
  convertMmToUnit,
  getPartColor
}: SahiraSequencerProps) {
  const sahiraSteps = generateSahiraSteps(layout, settings);
  if (sahiraSteps.length === 0) return null;

  const activeStepIdx = activeStepIndices[layout.sheetIndex] ?? 0;
  const activeStep = sahiraSteps[activeStepIdx];
  const sheetCompleted = completedSteps[layout.sheetIndex] || {};
  const completedCount = Object.values(sheetCompleted).filter(Boolean).length;
  const progressPercent = Math.round((completedCount / sahiraSteps.length) * 100);

  return (
    <div className="border-t border-slate-800 bg-slate-900 text-slate-100 rounded-b-2xl overflow-hidden p-6 animate-fade-in">
      {/* Header with Progress Tracker */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-900/30">
            <ClipboardCheck size={20} />
          </div>
          <div>
            <h4 className="text-sm font-black tracking-tight text-white flex items-center gap-2">
              {isHindi ? "📋 सहिरा: स्मार्ट कटिंग अनुक्रम गाइड" : "📋 Sahira: Smart Cutting Sequence Guide"}
            </h4>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
              {isHindi ? "साहिरा इंटीरियर - शुद्धता एवं सुरक्षा हेतु निर्देशित स्टेप्स" : "Sahira Interior - Precision Guided Carpentry Steps"}
            </p>
          </div>
        </div>

        {/* Visual Completion Progress Bar */}
        <div className="flex items-center gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 min-w-[200px]">
          <div className="flex-1">
            <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              <span>{isHindi ? "प्रगति (Progress)" : "Progress"}</span>
              <span className="text-emerald-400 font-mono">{progressPercent}%</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-500 h-full transition-all duration-500" 
                style={{ width: `${progressPercent}%` }} 
              />
            </div>
          </div>
          <span className="text-xs font-mono font-bold bg-slate-900 text-slate-300 px-2.5 py-1 rounded-md border border-slate-800 shrink-0">
            {completedCount}/{sahiraSteps.length}
          </span>
        </div>
      </div>

      {/* Timeline Tracker Stepper */}
      <div className="flex items-center gap-1.5 mb-6 overflow-x-auto pb-3 pr-2 scrollbar-thin scrollbar-thumb-slate-800">
        {sahiraSteps.map((step, idx) => {
          const isCurrent = idx === activeStepIdx;
          const isDone = !!sheetCompleted[idx];
          return (
            <button
              type="button"
              key={step.stepId}
              onClick={() => setActiveStepIndices(prev => ({ ...prev, [layout.sheetIndex]: idx }))}
              className={`flex items-center justify-center shrink-0 w-8 h-8 rounded-lg font-mono font-black text-xs border transition-all cursor-pointer ${
                isCurrent
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-900/40 scale-105'
                  : isDone
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 line-through'
                  : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:bg-slate-800'
              }`}
              title={`Step ${step.stepId}`}
            >
              {isDone ? '✓' : step.stepId}
            </button>
          );
        })}
      </div>

      {/* Active Instruction Terminal Screen */}
      {activeStep && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-950/70 rounded-2xl p-5 border border-slate-800 shadow-inner mb-6">
          {/* Left Column: Large Instruction Text */}
          <div className="lg:col-span-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-black uppercase bg-indigo-50/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-0.5 rounded-full">
                  {isHindi ? `स्टेप ${activeStep.stepId} / ${sahiraSteps.length}` : `Step ${activeStep.stepId} of ${sahiraSteps.length}`}
                </span>
                <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                  activeStep.localName.includes('RIP') || activeStep.localName.includes('पट्टी')
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-teal-500/10 text-teal-400 border-teal-500/20'
                }`}>
                  {activeStep.localName}
                </span>
                {sheetCompleted[activeStepIdx] && (
                  <span className="text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                    {isHindi ? "पूर्ण (COMPLETED)" : "COMPLETED"}
                  </span>
                )}
              </div>

              <p className="text-lg md:text-xl font-black text-white leading-relaxed tracking-tight py-2 border-b border-slate-800/50 mb-3">
                {activeStep.advice}
              </p>
            </div>

            {/* Quick guidance tips for rip cuts vs cross cuts */}
            <div className="mt-2 text-xs text-slate-400 flex items-start gap-2.5 bg-slate-900/40 p-3 rounded-xl border border-slate-800/40">
              <span className="text-indigo-400">💡</span>
              <p className="leading-relaxed">
                {activeStep.localName.includes('RIP') || activeStep.localName.includes('पट्टी')
                  ? (isHindi 
                    ? "पट्टी कट (RIP CUT) लगाते समय हमेशा प्लाई को गाइड रेल या फेंस के समानांतर सीधा धकेलें। स्थिरता के लिए पुश स्टिक का उपयोग करें।"
                    : "When making a RIP CUT, always keep the board flat against the fence. Use a push stick for narrow pieces to ensure maximum hand safety.")
                  : (isHindi
                    ? "क्रॉस कट (CROSS CUT) लगाते समय यह सुनिश्चित करें कि आपका कटर समकोण (90 डिग्री) पर है। टुकड़े को फिसलने न दें।"
                    : "When making a CROSS CUT, use a miter gauge or crosscut sled. Keep the workpiece firmly pressed to prevent drifting.")}
              </p>
            </div>
          </div>

          {/* Right Column: Ruler Fence Setting HUD */}
          <div className="lg:col-span-4 flex flex-col justify-between bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
            <div>
              <p className="text-[10px] font-black tracking-widest uppercase text-slate-400 flex items-center gap-1 mb-1.5">
                <Ruler size={11} className="text-amber-500" />
                {isHindi ? "सॉ-फेंस माप सेटिंग" : "Saw-Fence Setting"}
              </p>
              
              {/* Saw Fence Digital Gauge */}
              <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 font-black p-4 rounded-xl flex flex-col items-center justify-center shadow-lg border border-amber-400 select-none">
                <span className="text-[9px] uppercase tracking-wider font-black opacity-70">
                  {isHindi ? "फेंस दूरी" : "FENCE DISTANCE"}
                </span>
                <span className="text-3xl font-mono font-black mt-0.5 tracking-tight">
                  {convertMmToUnit(activeStep.fenceSetting, settings.unit).toFixed(1)}
                </span>
                <span className="text-[10px] font-black mt-0.5 opacity-80 uppercase tracking-widest">
                  {settings.unit}
                </span>
              </div>
            </div>

            {/* Affected Parts Indicator */}
            {activeStep.affectedPartIds.length > 0 && (
              <div className="mt-4 border-t border-slate-800/60 pt-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  {isHindi ? "संबंधित पुर्जे:" : "Produced Parts:"}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {activeStep.affectedPartIds.map(pId => {
                    const prt = layout.parts.find(p => p.id === pId);
                    if (!prt) return null;
                    return (
                      <span key={pId} className="inline-flex items-center gap-1.5 text-[10px] font-bold bg-slate-950 text-slate-300 px-2 py-1 rounded-md border border-slate-800 shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: getPartColor(prt.name, 0) }} />
                        {prt.name}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step Navigation and Completion Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-950/40 p-4 rounded-2xl border border-slate-800 mb-6">
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
          <button
            type="button"
            disabled={activeStepIdx === 0}
            onClick={() => {
              setActiveStepIndices(prev => ({ ...prev, [layout.sheetIndex]: activeStepIdx - 1 }));
            }}
            className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-slate-300 px-4 py-2.5 rounded-xl text-xs font-black cursor-pointer transition-all border border-slate-700/80 disabled:cursor-not-allowed select-none"
          >
            <ChevronLeft size={16} />
            {isHindi ? "पीछे" : "Previous"}
          </button>

          <button
            type="button"
            disabled={activeStepIdx === sahiraSteps.length - 1}
            onClick={() => {
              setActiveStepIndices(prev => ({ ...prev, [layout.sheetIndex]: activeStepIdx + 1 }));
            }}
            className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-slate-300 px-4 py-2.5 rounded-xl text-xs font-black cursor-pointer transition-all border border-slate-700/80 disabled:cursor-not-allowed select-none"
          >
            {isHindi ? "आगे" : "Next"}
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Interactive Task Completion Checker button */}
        <button
          type="button"
          onClick={() => toggleStepCompleted(layout.sheetIndex, activeStepIdx, sahiraSteps.length)}
          className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs font-black cursor-pointer transition-all shadow-md select-none ${
            sheetCompleted[activeStepIdx]
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/20'
          }`}
        >
          <Check size={15} className={sheetCompleted[activeStepIdx] ? 'scale-110 font-bold' : ''} />
          {sheetCompleted[activeStepIdx]
            ? (isHindi ? "पूर्ण चिह्नित है (Completed ✓)" : "Marked Completed ✓")
            : (isHindi ? "कट पूरा हुआ! (Mark Completed)" : "Mark Step Done")}
        </button>
      </div>

      {/* All Steps Table Stepper List */}
      <div>
        <h5 className="font-extrabold text-[10px] text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
          {isHindi ? "सम्पूर्ण कटिंग अनुक्रम सूची" : "Full Cutting Sequence Stepper"}
        </h5>
        <div className="max-h-64 overflow-y-auto divide-y divide-slate-800/50 rounded-xl border border-slate-800 bg-slate-950/20 shadow-inner pr-1.5 scrollbar-thin scrollbar-thumb-slate-800">
          {sahiraSteps.map((step, idx) => {
            const isCurrent = idx === activeStepIdx;
            const isDone = !!sheetCompleted[idx];
            return (
              <div
                key={step.stepId}
                onClick={() => {
                  setActiveStepIndices(prev => ({ ...prev, [layout.sheetIndex]: idx }));
                }}
                className={`flex items-start gap-3 p-3 transition-colors cursor-pointer select-none ${
                  isCurrent 
                    ? 'bg-indigo-950/40 border-l-4 border-indigo-500 text-white font-semibold' 
                    : isDone
                    ? 'bg-slate-950/20 border-l-4 border-emerald-500 text-slate-400 opacity-60'
                    : 'hover:bg-slate-800/30 text-slate-400 border-l-4 border-transparent'
                }`}
              >
                {/* Step Number Checker circle */}
                <div 
                  onClick={(e) => {
                    e.stopPropagation(); // Avoid activating the row just by checking the box
                    toggleStepCompleted(layout.sheetIndex, idx, sahiraSteps.length);
                  }}
                  className={`w-6 h-6 rounded-lg font-mono font-black text-xs flex items-center justify-center shrink-0 mt-0.5 border cursor-pointer transition-all ${
                    isCurrent 
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-900/30' 
                      : isDone
                      ? 'bg-emerald-500 text-slate-950 border-emerald-500'
                      : 'bg-slate-800 text-slate-500 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  {isDone ? '✓' : step.stepId}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className={`text-[10px] font-black uppercase tracking-wider ${
                      isCurrent ? 'text-indigo-400' : isDone ? 'text-emerald-500 line-through' : 'text-slate-500'
                    }`}>
                      {step.localName}
                    </span>
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                      isCurrent 
                        ? 'bg-amber-500/15 text-amber-400 border-amber-500/10' 
                        : isDone
                        ? 'bg-emerald-950/20 text-emerald-400 border-emerald-950/10 line-through'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {isHindi ? "फेंस दूरी" : "FENCE"}: {convertMmToUnit(step.fenceSetting, settings.unit).toFixed(1)} {settings.unit}
                    </span>
                  </div>
                  <p className={`text-xs ${
                    isCurrent ? 'font-bold text-slate-100' : isDone ? 'text-slate-500 line-through' : 'font-medium text-slate-400'
                  }`}>
                    {step.advice}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
