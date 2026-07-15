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
  // Project Metadata
  clientName?: string;
  siteAddress?: string;
  notes?: string;
  cabinetCount?: number;
  status?: 'draft' | 'approved' | 'in-progress' | 'completed';
  totalCostEstimate?: number;
}

interface SavedFilesModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedJobs: SavedJob[];
  onDeleteJob: (id: string) => void;
  onLoadJob: (job: SavedJob) => void;
  language: Language;
  onUpdateJob?: (job: SavedJob) => void;
}

export default function SavedFilesModal({
  isOpen,
  onClose,
  savedJobs,
  onDeleteJob,
  onLoadJob,
  language,
  onUpdateJob
}: SavedFilesModalProps) {
  const isHindi = language === 'Hindi';
  
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Metadata Editor States
  const [editingJobMetadata, setEditingJobMetadata] = useState<SavedJob | null>(null);
  const [metaName, setMetaName] = useState("");
  const [metaClientName, setMetaClientName] = useState("");
  const [metaSiteAddress, setMetaSiteAddress] = useState("");
  const [metaCabinetCount, setMetaCabinetCount] = useState("");
  const [metaStatus, setMetaStatus] = useState<'draft' | 'approved' | 'in-progress' | 'completed'>('draft');
  const [metaTotalCostEstimate, setMetaTotalCostEstimate] = useState("");
  const [metaNotes, setMetaNotes] = useState("");

  const handleOpenMetaEditor = (job: SavedJob) => {
    setOpenMenuId(null);
    setEditingJobMetadata(job);
    setMetaName(job.name || "");
    setMetaClientName(job.clientName || "");
    setMetaSiteAddress(job.siteAddress || "");
    setMetaCabinetCount(job.cabinetCount !== undefined ? String(job.cabinetCount) : "");
    setMetaStatus(job.status || 'draft');
    setMetaTotalCostEstimate(job.totalCostEstimate !== undefined ? String(job.totalCostEstimate) : "");
    setMetaNotes(job.notes || "");
  };

  const handleSaveMetaChanges = () => {
    if (!editingJobMetadata) return;
    const updated: SavedJob = {
      ...editingJobMetadata,
      name: metaName,
      clientName: metaClientName || undefined,
      siteAddress: metaSiteAddress || undefined,
      cabinetCount: metaCabinetCount ? parseInt(metaCabinetCount, 10) : undefined,
      status: metaStatus,
      totalCostEstimate: metaTotalCostEstimate ? parseFloat(metaTotalCostEstimate) : undefined,
      notes: metaNotes || undefined,
    };
    if (onUpdateJob) {
      onUpdateJob(updated);
    }
    setEditingJobMetadata(null);
  };

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
        text += `_Shahirah Interior - Smart Carpentry Optimizer_`;
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
    const jsonStr = JSON.stringify(job, null, 2);
    const fileName = `job_${job.name.replace(/\s+/g, '_')}_${new Date().getTime()}.json`;
    const jsonBlob = new Blob([jsonStr], { type: "application/json" });
    const file = new File([jsonBlob], fileName, { type: "application/json" });

    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({
          files: [file],
          title: "Carpentry Job Backup",
          text: "Here is your saved job backup."
        }).catch((e) => {
          console.log("Share cancelled", e);
          const url = URL.createObjectURL(jsonBlob);
          const link = document.createElement("a");
          link.href = url;
          link.download = fileName;
          link.click();
          URL.revokeObjectURL(url);
        });
      } else {
        const url = URL.createObjectURL(jsonBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error(e);
    }
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
                {isHindi ? 'सेव की गई फाइलें (प्रोजेक्ट्स)' : 'Saved Projects & Files'}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {isHindi ? 'आपके पहले सेव किए गए प्रोजेक्ट्स एवं कटिंग सूचियां' : 'Manage your saved carpentry project metadata, cutting lists and status'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer">
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
              {savedJobs.map(job => {
                const getStatusStyle = (status?: string) => {
                  switch (status) {
                    case 'approved': return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900';
                    case 'in-progress': return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900';
                    case 'completed': return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900';
                    default: return 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900/50 dark:text-slate-400 dark:border-slate-800';
                  }
                };

                const getStatusText = (status?: string) => {
                  if (status === 'approved') return isHindi ? 'स्वीकृत' : 'Approved';
                  if (status === 'in-progress') return isHindi ? 'चालू' : 'In Progress';
                  if (status === 'completed') return isHindi ? 'पूरा हुआ' : 'Completed';
                  return isHindi ? 'ड्राफ्ट' : 'Draft';
                };

                return (
                  <div key={job.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-all flex flex-col justify-between relative">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <div className="pr-6 max-w-[85%]">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="font-bold text-slate-850 dark:text-slate-100 truncate text-sm" title={job.name}>{job.name}</h3>
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${getStatusStyle(job.status)}`}>
                              {getStatusText(job.status)}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">{new Date(job.date).toLocaleString()}</p>
                        </div>
                      </div>

                      {/* Metadata summary on card body */}
                      <div className="space-y-1.5 my-2.5 text-xs">
                        {job.clientName && (
                          <p className="text-slate-600 dark:text-slate-350 truncate">
                            👤 <span className="font-semibold text-slate-400 dark:text-slate-500">{isHindi ? 'ग्राहक: ' : 'Client: '}</span> {job.clientName}
                          </p>
                        )}
                        {job.siteAddress && (
                          <p className="text-slate-600 dark:text-slate-350 truncate">
                            📍 <span className="font-semibold text-slate-400 dark:text-slate-500">{isHindi ? 'साइट: ' : 'Site: '}</span> {job.siteAddress}
                          </p>
                        )}
                        
                        <div className="grid grid-cols-2 gap-1 bg-slate-50 dark:bg-slate-950/40 p-2 rounded-lg border border-slate-100 dark:border-slate-850 text-[10px] font-semibold text-slate-500">
                          <div>
                            📦 {isHindi ? 'कैबिनेट:' : 'Cabinets:'} <span className="font-black text-slate-700 dark:text-slate-300">{job.cabinetCount !== undefined ? job.cabinetCount : '—'}</span>
                          </div>
                          <div>
                            ₹ {isHindi ? 'बजट:' : 'Budget:'} <span className="font-black text-slate-700 dark:text-slate-300">{job.totalCostEstimate !== undefined ? `₹${job.totalCostEstimate.toLocaleString()}` : '—'}</span>
                          </div>
                        </div>

                        {job.notes && (
                          <p className="text-[10px] text-slate-400 italic line-clamp-1 bg-amber-50/50 dark:bg-amber-950/10 px-1.5 py-0.5 rounded border border-amber-100/50 dark:border-amber-950/20" title={job.notes}>
                            📝 {job.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => {
                          onLoadJob(job);
                          onClose();
                        }}
                        className="flex-1 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 py-2 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Eye size={16} />
                        {isHindi ? 'ओपन करें' : 'Open'}
                      </button>
                      
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === job.id ? null : job.id)}
                          className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 p-2 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
                        >
                          <MoreVertical size={20} />
                        </button>
                        
                        {openMenuId === job.id && (
                          <div className="absolute right-0 bottom-full mb-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-10 py-1 overflow-hidden">
                            <button
                              onClick={() => generatePDF(job)}
                              className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-200 cursor-pointer"
                            >
                              <FileText size={16} className="text-indigo-500" />
                              {isHindi ? 'PDF डाउनलोड करें' : 'Download PDF'}
                            </button>
                            
                            <button
                              onClick={() => exportJSON(job)}
                              className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-200 cursor-pointer"
                            >
                              <Code size={16} className="text-emerald-500" />
                              {isHindi ? 'JSON डाउनलोड करें' : 'Download JSON'}
                            </button>
                            
                            <button
                              onClick={() => handleShare(job)}
                              className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-200 cursor-pointer"
                            >
                              <Share2 size={16} className="text-sky-500" />
                              {isHindi ? 'शेयर करें' : 'Share'}
                            </button>

                            <button
                              onClick={() => handleOpenMetaEditor(job)}
                              className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-200 cursor-pointer"
                            >
                              <span className="text-amber-500 text-sm">✏️</span>
                              {isHindi ? 'विवरण बदलें' : 'Edit Details'}
                            </button>
                            
                            <div className="h-px bg-slate-100 dark:bg-slate-700 my-1"></div>
                            
                            <button
                              onClick={() => {
                                onDeleteJob(job.id);
                                setOpenMenuId(null);
                              }}
                              className="w-full text-left px-4 py-2.5 text-sm hover:bg-rose-50 dark:hover:bg-rose-900/20 flex items-center gap-2 text-rose-600 dark:text-rose-400 cursor-pointer"
                            >
                              <Trash2 size={16} />
                              {isHindi ? 'डिलीट करें' : 'Delete'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Project Metadata Editor Modal Popup Overlay */}
      {editingJobMetadata && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md w-full space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="font-black text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
                <span>🛠️</span>
                {isHindi ? "प्रोजेक्ट विवरण संपादित करें" : "Edit Project Metadata"}
              </h3>
              <button
                onClick={() => setEditingJobMetadata(null)}
                className="text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs max-h-[60vh] overflow-y-auto pr-1">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                  {isHindi ? "प्रोजेक्ट का नाम (Project Name) *" : "Project Name *"}
                </label>
                <input
                  type="text"
                  value={metaName}
                  onChange={(e) => setMetaName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-xl text-xs font-bold text-slate-850 dark:text-slate-100 focus:outline-indigo-500"
                  placeholder={isHindi ? "जैसे: किचन अलमारी" : "e.g., Kitchen Wardrobe"}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                  {isHindi ? "ग्राहक का नाम (Client Name)" : "Client Name"}
                </label>
                <input
                  type="text"
                  value={metaClientName}
                  onChange={(e) => setMetaClientName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-xl text-xs font-bold text-slate-850 dark:text-slate-100 focus:outline-indigo-500"
                  placeholder={isHindi ? "जैसे: राजेश कुमार" : "e.g., Rajesh Kumar"}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                  {isHindi ? "साइट का पता (Site Address)" : "Site Address"}
                </label>
                <input
                  type="text"
                  value={metaSiteAddress}
                  onChange={(e) => setMetaSiteAddress(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-xl text-xs font-bold text-slate-850 dark:text-slate-100 focus:outline-indigo-500"
                  placeholder={isHindi ? "जैसे: सेक्टर 62, नोएडा" : "e.g., Sector 62, Noida"}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                    {isHindi ? "कुल अलमारी (Cabinet Count)" : "Cabinet Count"}
                  </label>
                  <input
                    type="number"
                    value={metaCabinetCount}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setMetaCabinetCount(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-xl text-xs font-bold text-slate-850 dark:text-slate-100 focus:outline-indigo-500"
                    placeholder="e.g., 5"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                    {isHindi ? "अनुमानित बजट (Budget ₹)" : "Budget (₹)"}
                  </label>
                  <input
                    type="number"
                    value={metaTotalCostEstimate}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setMetaTotalCostEstimate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-xl text-xs font-bold text-slate-850 dark:text-slate-100 focus:outline-indigo-500"
                    placeholder="e.g., 15000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                  {isHindi ? "परियोजना स्थिति (Project Status)" : "Project Status"}
                </label>
                <select
                  value={metaStatus}
                  onChange={(e) => setMetaStatus(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-xl text-xs font-bold text-slate-850 dark:text-slate-100 focus:outline-indigo-500 cursor-pointer"
                >
                  <option value="draft">{isHindi ? "📝 ड्राफ्ट (Draft)" : "Draft"}</option>
                  <option value="approved">{isHindi ? "✅ स्वीकृत (Approved)" : "Approved"}</option>
                  <option value="in-progress">{isHindi ? "⚙️ कार्य प्रगति पर (In Progress)" : "In Progress"}</option>
                  <option value="completed">{isHindi ? "🎉 पूरा हुआ (Completed)" : "Completed"}</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                  {isHindi ? "विशेष नोट्स (Notes / Description)" : "Notes / Description"}
                </label>
                <textarea
                  rows={3}
                  value={metaNotes}
                  onChange={(e) => setMetaNotes(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-xl text-xs font-bold text-slate-850 dark:text-slate-100 focus:outline-indigo-500"
                  placeholder={isHindi ? "जैसे: 18mm एचडीएमआर बोर्ड का उपयोग करें।" : "e.g., Use 18mm HDMR boards."}
                />
              </div>
            </div>

            <div className="flex gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
              <button
                onClick={() => setEditingJobMetadata(null)}
                className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 py-2 rounded-xl text-xs font-black transition-all cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                {isHindi ? "रद्द करें" : "Cancel"}
              </button>
              <button
                onClick={handleSaveMetaChanges}
                disabled={!metaName.trim()}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-300 text-white py-2 rounded-xl text-xs font-black transition-all cursor-pointer border-b-4 border-indigo-800 active:translate-y-[2px] active:border-b-2"
              >
                {isHindi ? "सुरक्षित करें" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
