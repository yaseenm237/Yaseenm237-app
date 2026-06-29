import React, { useState, useEffect, useRef } from 'react';
import { PartInput, SheetSettings, Language } from '../types';
import { Folder, FileText, Download, Share2, Trash2, X, Eye, MoreVertical, Code } from 'lucide-react';
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
  
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (!isOpen) return null;

  const handleShare = async (job: SavedJob) => {
    setOpenMenuId(null);
    try {
      const result = runPacking(job.parts, job.settings);
      let text = "";
      if (isHindi) {
        text = `*📐 स्मार्ट कारपेंट्री - सुरक्षित जॉब: ${job.name} 📐*\n\n`;
        text += `• कुल पुर्जे: ${job.parts.length} नग\n`;
        text += `• आवश्यक शीट्स: ${result.totalSheetsUsed} शीट्स\n`;
        text += `• दक्षता: ${result.totalUtilization.toFixed(1)}%\n\n`;
        text += `_साहिरा इंटीरियर - स्मार्ट बढ़ईगिरी ऑप्टिमाइज़र_`;
      } else {
        text = `*📐 Smart Carpentry - Saved Job: ${job.name} 📐*\n\n`;
        text += `• Total parts: ${job.parts.length} pcs\n`;
        text += `• Sheets required: ${result.totalSheetsUsed} sheets\n`;
        text += `• Efficiency: ${result.totalUtilization.toFixed(1)}%\n\n`;
        text += `_Sahira Interior - Smart Carpentry Optimizer_`;
      }

      if (navigator.share) {
        await navigator.share({
          title: job.name,
          text: text
        });
      } else {
        // Copy to clipboard fallback
        try {
          await navigator.clipboard.writeText(text);
        } catch (_) {}
        
        // Deep link share on WhatsApp
        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
        window.open(whatsappUrl, '_blank');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const generatePDF = (job: SavedJob) => {
    setOpenMenuId(null);
    const result = runPacking(job.parts, job.settings);
    generatePdfReport(job.parts, job.settings, result, language);
  };

  const exportJSON = (job: SavedJob) => {
    setOpenMenuId(null);
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(job, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `job_${job.name.replace(/\s+/g, '_')}_${new Date().getTime()}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800" ref={dropdownRef}>
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-950/50 rounded-xl flex items-center justify-center">
              <Folder className="text-indigo-600 dark:text-indigo-400" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                {isHindi ? 'सेव की गई फाइलें' : 'Saved Files'}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {isHindi ? 'आपके पहले सेव किए गए प्रोजेक्ट्स' : 'Your previously saved projects'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X size={20} className="text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/30 dark:bg-slate-950/20">
          {savedJobs.length === 0 ? (
            <div className="text-center py-10 text-slate-400 dark:text-slate-500">
              <Folder size={48} className="mx-auto mb-3 opacity-20" />
              <p>{isHindi ? 'कोई फाइल सेव नहीं की गई है।' : 'No files saved yet.'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedJobs.map(job => (
                <div key={job.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-colors flex flex-col relative">
                  <div className="flex justify-between items-start mb-2">
                    <div className="pr-6">
                      <h3 className="font-bold text-slate-800 dark:text-slate-100 truncate" title={job.name}>{job.name}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(job.date).toLocaleString()}</p>
                    </div>
                  </div>
                  
                  <div className="flex-1"></div>
                  
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => {
                        onLoadJob(job);
                        onClose();
                      }}
                      className="flex-1 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 py-2 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Eye size={16} />
                      {isHindi ? 'ओपन करें' : 'Open'}
                    </button>
                    
                    <div className="relative">
                      <button
                        onClick={() => setOpenMenuId(openMenuId === job.id ? null : job.id)}
                        className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 p-2 rounded-lg transition-colors flex items-center justify-center"
                      >
                        <MoreVertical size={20} />
                      </button>
                      
                      {openMenuId === job.id && (
                        <div className="absolute right-0 bottom-full mb-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-10 py-1 overflow-hidden">
                          <button
                            onClick={() => generatePDF(job)}
                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-200"
                          >
                            <FileText size={16} className="text-indigo-500" />
                            {isHindi ? 'PDF डाउनलोड करें' : 'Download PDF'}
                          </button>
                          
                          <button
                            onClick={() => exportJSON(job)}
                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-200"
                          >
                            <Code size={16} className="text-emerald-500" />
                            {isHindi ? 'JSON डाउनलोड करें' : 'Download JSON'}
                          </button>
                          
                          <button
                            onClick={() => handleShare(job)}
                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-200"
                          >
                            <Share2 size={16} className="text-sky-500" />
                            {isHindi ? 'शेयर करें' : 'Share'}
                          </button>
                          
                          <div className="h-px bg-slate-100 dark:bg-slate-700 my-1"></div>
                          
                          <button
                            onClick={() => {
                              onDeleteJob(job.id);
                              setOpenMenuId(null);
                            }}
                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-rose-50 dark:hover:bg-rose-900/20 flex items-center gap-2 text-rose-600 dark:text-rose-400"
                          >
                            <Trash2 size={16} />
                            {isHindi ? 'डिलीट करें' : 'Delete'}
                          </button>
                        </div>
                      )}
                    </div>
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
