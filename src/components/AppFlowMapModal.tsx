import React from 'react';
import { X, ArrowRight, ArrowDown } from 'lucide-react';
import { Language } from '../types';

interface AppFlowMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

export default function AppFlowMapModal({ isOpen, onClose, language }: AppFlowMapModalProps) {
  if (!isOpen) return null;

  const isHindi = language === 'hi';

  const Node = ({ title, desc, color }: { title: string, desc?: string, color: string }) => (
    <div className={`p-3 rounded-lg border-2 ${color} bg-white shadow-sm w-48 shrink-0 flex flex-col items-center text-center`}>
      <div className="font-bold text-sm text-slate-800">{title}</div>
      {desc && <div className="text-xs text-slate-500 mt-1 leading-tight">{desc}</div>}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-slate-50 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-white border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              {isHindi ? 'एप्लिकेशन वर्किंग मैप (App Flow)' : 'Application Working Map (Flow)'}
            </h2>
            <p className="text-sm text-slate-500">
              {isHindi ? 'सॉफ्टवेयर के काम करने का लॉजिक और स्ट्रक्चर' : 'Logic and structure of how the software works'}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content (Flow Chart) */}
        <div className="flex-1 overflow-auto p-8 relative">
          <div className="flex flex-col items-center gap-6 min-w-[800px]">
            
            <div className="flex items-start gap-12">
              <div className="flex flex-col items-center gap-2">
                <Node title="App Workspace" desc="Main Application Entry Point (AppWorkspace.tsx)" color="border-indigo-500" />
                <ArrowDown className="text-slate-400" />
                <div className="flex gap-8">
                  <div className="flex flex-col items-center gap-2">
                    <Node title="Left Panel" desc="Input Parts & Settings" color="border-sky-500" />
                    <ArrowDown className="text-slate-400" />
                    <Node title="Packing Engine" desc="Algorithm calculates 2D Layouts" color="border-amber-500" />
                    <ArrowDown className="text-slate-400" />
                    <Node title="Layout Visualizer" desc="Interactive SVG Layout Map" color="border-emerald-500" />
                  </div>
                  
                  <div className="flex flex-col items-center gap-2">
                    <Node title="Header Menu (MoreVertical)" desc="Main navigation for tools" color="border-violet-500" />
                    <ArrowDown className="text-slate-400" />
                    
                    <div className="grid grid-cols-2 gap-4 bg-slate-100 p-4 rounded-xl border border-slate-200">
                      
                      <div className="flex flex-col items-center gap-2">
                        <Node title="Hajiri Portal (Attendance)" desc="Manage Staff & Attendance" color="border-rose-500" />
                        <ArrowDown className="text-slate-400" />
                        <div className="flex flex-col gap-2">
                           <Node title="Daily Attendance" desc="Present/Absent tracking" color="border-rose-300" />
                           <Node title="Advance & Salary" desc="Manage payments" color="border-rose-300" />
                           <Node title="Worker Data" desc="Local Storage DB" color="border-rose-300" />
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-center gap-2">
                        <Node title="PDF Export" desc="Generate Reports" color="border-red-500" />
                        <Node title="Estimate Calculator" desc="Cost & Materials" color="border-green-500" />
                        <Node title="Saved Files" desc="Cloud/Local Sync" color="border-blue-500" />
                        <Node title="User Sessions" desc="Access control" color="border-purple-500" />
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 p-4 bg-indigo-50 rounded-xl border border-indigo-200 text-sm text-indigo-900 max-w-3xl text-center">
              <strong>{isHindi ? 'लॉजिक कैसे काम करता है (Logic Flow):' : 'How the Logic Works (Logic Flow):'}</strong>
              <p className="mt-2 text-indigo-700">
                {isHindi ? 
                  'यूजर Left Panel में कटिंग लिस्ट डालता है -> Packing Engine उसे प्रोसेस करता है -> Layout Visualizer उसे ग्राफिक्स में दिखाता है। साथ ही, Header Menu से हम PDF रिपोर्ट बना सकते हैं, Estimate निकाल सकते हैं, और Hajiri Portal के जरिये कारीगरों की हाजिरी और एडवांस सैलरी मैनेज कर सकते हैं।' : 
                  'User inputs cutting list in Left Panel -> Packing Engine processes it -> Layout Visualizer renders graphics. From Header Menu, users can generate PDF reports, Calculate Estimates, and manage worker attendance & salary advance via Hajiri Portal.'}
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
