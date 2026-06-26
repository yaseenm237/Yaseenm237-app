import React, { useState } from 'react';
import { PartInput, SheetSettings, Language } from '../types';
import { Folder, FileText, Download, Share2, Trash2, X, Eye } from 'lucide-react';
import { generatePdfReport } from '../utils/pdfGenerator';
import { runPacking } from '../utils/packer';

export interface SavedJob {
  id: string;
  name: string;
  date: string;
  parts: PartInput[];
  settings: SheetSettings;
}

interface SavedFilesModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedJobs: SavedJob[];
  onDeleteJob: (id: string) => void;
  onLoadJob: (job: SavedJob) => void;
  language: Language;
}

export default function SavedFilesModal({
  isOpen,
  onClose,
  savedJobs,
  onDeleteJob,
  onLoadJob,
  language
}: SavedFilesModalProps) {
  const isHindi = language === 'Hindi';
  
  const [viewingJob, setViewingJob] = useState<SavedJob | null>(null);

  if (!isOpen) return null;

  const handleShare = async (job: SavedJob) => {
    try {
      const result = runPacking(job.parts, job.settings);
      
      // We will generate the PDF and share it
      // using the Web Share API if available
      if (navigator.share) {
        // Unfortunately pdf generation is synchronous and creates a download,
        // we might just share the JSON text for now, or generate a simple text summary.
        // Or we can share the configuration as JSON.
        const text = `Carpentry Plan: ${job.name}\nParts: ${job.parts.length}\nSheets required: ${result.totalSheetsUsed}`;
        await navigator.share({
          title: job.name,
          text: text
        });
      } else {
        alert(isHindi ? 'शेयरिंग इस ब्राउज़र में समर्थित नहीं है।' : 'Sharing not supported in this browser.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const generatePDF = (job: SavedJob) => {
    const result = runPacking(job.parts, job.settings);
    generatePdfReport(job.parts, job.settings, result, language);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Folder className="text-indigo-600" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                {isHindi ? 'सेव की गई फाइलें' : 'Saved Files'}
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                {isHindi ? 'आपके पहले सेव किए गए प्रोजेक्ट्स' : 'Your previously saved projects'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/30">
          {savedJobs.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <Folder size={48} className="mx-auto mb-3 opacity-20" />
              <p>{isHindi ? 'कोई फाइल सेव नहीं की गई है।' : 'No files saved yet.'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedJobs.map(job => (
                <div key={job.id} className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm hover:border-indigo-300 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-slate-800">{job.name}</h3>
                      <p className="text-xs text-slate-500">{new Date(job.date).toLocaleString()}</p>
                    </div>
                    <button onClick={() => onDeleteJob(job.id)} className="text-rose-400 hover:text-rose-600 p-1">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                    <button
                      onClick={() => {
                        onLoadJob(job);
                        onClose();
                      }}
                      className="flex-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Eye size={14} />
                      {isHindi ? 'ओपन करें' : 'Open'}
                    </button>
                    <button
                      onClick={() => generatePDF(job)}
                      className="flex-1 bg-slate-100 text-slate-700 hover:bg-slate-200 py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Download size={14} />
                      {isHindi ? 'PDF' : 'PDF'}
                    </button>
                    <button
                      onClick={() => handleShare(job)}
                      className="flex-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Share2 size={14} />
                      {isHindi ? 'शेयर' : 'Share'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
