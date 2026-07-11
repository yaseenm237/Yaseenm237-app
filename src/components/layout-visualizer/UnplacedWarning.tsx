import React from 'react';
import { AlertCircle } from 'lucide-react';

interface UnplacedWarningProps {
  unplacedParts: Array<{ name: string; qty: number }>;
  translations: any;
}

export default function UnplacedWarning({ unplacedParts, translations }: UnplacedWarningProps) {
  if (unplacedParts.length === 0) return null;

  return (
    <div id="unplaced-warning" className="bg-rose-50/75 border border-rose-200 rounded-2xl p-5 shadow-sm flex items-start gap-4">
      <div className="p-2 bg-rose-100 text-rose-700 rounded-xl shrink-0 mt-0.5 animate-bounce">
        <AlertCircle size={20} />
      </div>
      <div>
        <h4 className="font-bold text-rose-800 text-sm">{translations.unplaced_title}</h4>
        <p className="text-xs text-rose-700 mt-1">{translations.unplaced_desc}</p>
        <div className="flex flex-wrap gap-2 mt-3">
          {unplacedParts.map((p, idx) => (
            <span key={idx} className="bg-rose-100/80 text-rose-800 text-xs font-bold px-2.5 py-1 rounded-xl border border-rose-200">
              {p.name}: {p.qty} Qty
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
