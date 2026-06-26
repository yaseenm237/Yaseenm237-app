import React, { useState, useRef, useEffect } from 'react';
import { 
  MoreVertical, 
  Folder, 
  Calculator, 
  Rocket, 
  Undo2, 
  Redo2, 
  Languages,
  Upload,
  ChevronRight
} from 'lucide-react';
import { Language } from '../types';

interface HeaderMenuProps {
  language: Language;
  onOpenSavedFiles: () => void;
  onOpenCalc: () => void;
  onOpenExport: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onToggleLanguage: () => void;
  onImportJson: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function HeaderMenu({
  language,
  onOpenSavedFiles,
  onOpenCalc,
  onOpenExport,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onToggleLanguage,
  onImportJson
}: HeaderMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isHindi = language === 'Hindi';

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const closeMenu = () => setIsOpen(false);

  return (
    <div className="relative z-50" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-full bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all shadow-sm active:scale-95 border border-slate-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
        title={isHindi ? 'मेनू' : 'Menu'}
      >
        <MoreVertical size={20} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-3 w-64 max-w-[calc(100vw-2rem)] bg-white border border-slate-200 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] rounded-2xl overflow-hidden origin-top-right transition-all animate-in fade-in zoom-in-95 duration-200">
          <div className="p-3 border-b border-slate-100 bg-slate-50/80">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">
              {isHindi ? 'क्विक एक्शन्स' : 'Quick Actions'}
            </h3>
          </div>
          
          <div className="p-2 flex flex-col gap-1">
            <button
              onClick={() => { onOpenSavedFiles(); closeMenu(); }}
              className="flex items-center justify-between w-full p-2.5 rounded-xl hover:bg-slate-50 text-slate-700 hover:text-indigo-600 group transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-500 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                  <Folder size={16} />
                </div>
                <span className="text-sm font-semibold">{isHindi ? 'सेव की गई फाइलें' : 'Saved Files'}</span>
              </div>
              <ChevronRight size={14} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0" />
            </button>

            <button
              onClick={() => { onOpenCalc(); closeMenu(); }}
              className="flex items-center justify-between w-full p-2.5 rounded-xl hover:bg-slate-50 text-slate-700 hover:text-emerald-600 group transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-500 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors">
                  <Calculator size={16} />
                </div>
                <span className="text-sm font-semibold">{isHindi ? 'एस्टीमेट कैलकुलेटर' : 'Estimate Calculator'}</span>
              </div>
              <ChevronRight size={14} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0" />
            </button>

            <button
              onClick={() => { onOpenExport(); closeMenu(); }}
              className="flex items-center justify-between w-full p-2.5 rounded-xl hover:bg-slate-50 text-slate-700 hover:text-sky-600 group transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-sky-50 text-sky-500 group-hover:bg-sky-100 group-hover:text-sky-600 transition-colors">
                  <Rocket size={16} />
                </div>
                <span className="text-sm font-semibold">{isHindi ? 'एक्सपोर्ट सेंटर' : 'Export Center'}</span>
              </div>
              <ChevronRight size={14} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0" />
            </button>

            <label className="flex items-center justify-between w-full p-2.5 rounded-xl hover:bg-slate-50 text-slate-700 hover:text-amber-600 group transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-amber-50 text-amber-500 group-hover:bg-amber-100 group-hover:text-amber-600 transition-colors">
                  <Upload size={16} />
                </div>
                <span className="text-sm font-semibold">{isHindi ? 'JSON आयात करें' : 'Import JSON'}</span>
              </div>
              <input
                type="file"
                accept=".json"
                onChange={(e) => { onImportJson(e); closeMenu(); }}
                className="hidden"
              />
            </label>
          </div>

          <div className="p-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 bg-white rounded-lg p-1 border border-slate-200 shadow-sm">
              <button
                onClick={() => { onUndo(); closeMenu(); }}
                disabled={!canUndo}
                className={`p-1.5 rounded transition-all cursor-pointer ${
                  canUndo 
                    ? "text-slate-600 hover:bg-slate-100 hover:text-indigo-600" 
                    : "text-slate-300 cursor-not-allowed"
                }`}
                title={isHindi ? "पूर्ववत (Ctrl+Z)" : "Undo (Ctrl+Z)"}
              >
                <Undo2 size={16} />
              </button>
              <button
                onClick={() => { onRedo(); closeMenu(); }}
                disabled={!canRedo}
                className={`p-1.5 rounded transition-all cursor-pointer ${
                  canRedo 
                    ? "text-slate-600 hover:bg-slate-100 hover:text-indigo-600" 
                    : "text-slate-300 cursor-not-allowed"
                }`}
                title={isHindi ? "रीडू (Ctrl+Y)" : "Redo (Ctrl+Y)"}
              >
                <Redo2 size={16} />
              </button>
            </div>

            <button
              onClick={() => { onToggleLanguage(); closeMenu(); }}
              className="flex-1 flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-1.5 rounded-lg text-xs font-bold transition-colors border border-indigo-100 hover:border-indigo-200 cursor-pointer shadow-sm"
            >
              <Languages size={14} />
              {isHindi ? 'ENGLISH' : 'हिन्दी'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
