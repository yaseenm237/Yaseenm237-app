import React, { useState } from 'react';
import { Worker, Language } from '../types';
import { CheckCircle, AlertCircle, Phone, Fingerprint } from 'lucide-react';

interface WorkerSelfEntryPortalProps {
  workerId: string;
  language: Language;
}

export default function WorkerSelfEntryPortal({ workerId, language }: WorkerSelfEntryPortalProps) {
  const isHindi = language === 'Hindi';
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  // This would ideally fetch worker details or we assume it's just a raw submission
  // For now, we will create a generic submission button that generates a whatsapp link
  // or a recordAttendance link to send back.

  const handleMarkAttendance = (type: "P" | "H" | "A") => {
    // Generate a payload to send back to contractor via WhatsApp
    const payload = btoa(JSON.stringify({
      workerId: workerId,
      date: new Date().toISOString().split('T')[0],
      type,
      timestamp: Date.now()
    }));
    
    const link = `${window.location.origin}?recordAttendance=${payload}`;
    
    // In a real scenario, this might trigger a backend API,
    // but since this is offline-first via WhatsApp sync:
    
    let text = "";
    if (type === "P") text = isHindi ? "पूरी हाजिरी (Present)" : "Full Day (Present)";
    if (type === "H") text = isHindi ? "आधा दिन (Half Day)" : "Half Day";
    if (type === "A") text = isHindi ? "छुट्टी (Absent)" : "Absent";
    
    const message = encodeURIComponent(
      isHindi 
        ? `नमस्ते, मेरी आज की हाजिरी (${text}) दर्ज करें:\n\n${link}`
        : `Hello, please record my attendance for today (${text}):\n\n${link}`
    );
    
    // Attempt to open WhatsApp
    window.location.href = `https://wa.me/?text=${message}`;
    setStatus('success');
  };

  return (
    <div className="fixed inset-0 bg-slate-950 z-[100] flex flex-col animate-in fade-in">
      <div className="p-6 bg-indigo-600 shadow-md">
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <Fingerprint size={28} />
          {isHindi ? "मजदूर हाजिरी पोर्टल" : "Worker Attendance Portal"}
        </h1>
        <p className="text-indigo-100 mt-2 text-sm font-medium">
          {isHindi 
            ? "अपनी आज की हाजिरी ठेकेदार को भेजें।" 
            : "Submit your attendance for today to the contractor."}
        </p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 flex flex-col justify-center space-y-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 text-center">
          <p className="text-slate-500 mb-6 font-bold">
            {isHindi ? "हाजिरी का प्रकार चुनें:" : "Select attendance type:"}
          </p>
          
          <div className="space-y-4">
            <button
              onClick={() => handleMarkAttendance("P")}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-5 rounded-2xl font-black text-lg border-b-4 border-emerald-800 active:translate-y-[2px] active:border-b-2 shadow-sm flex items-center justify-center gap-3 cursor-pointer transition-all"
            >
              <CheckCircle size={24} />
              {isHindi ? "पूरी हाजिरी (Full Day)" : "Present (Full Day)"}
            </button>
            
            <button
              onClick={() => handleMarkAttendance("H")}
              className="w-full bg-amber-500 hover:bg-amber-400 text-white py-5 rounded-2xl font-black text-lg border-b-4 border-amber-700 active:translate-y-[2px] active:border-b-2 shadow-sm flex items-center justify-center gap-3 cursor-pointer transition-all"
            >
              {isHindi ? "आधा दिन (Half Day)" : "Half Day"}
            </button>
            
            <button
              onClick={() => handleMarkAttendance("A")}
              className="w-full bg-rose-500 hover:bg-rose-400 text-white py-5 rounded-2xl font-black text-lg border-b-4 border-rose-700 active:translate-y-[2px] active:border-b-2 shadow-sm flex items-center justify-center gap-3 cursor-pointer transition-all"
            >
              <AlertCircle size={24} />
              {isHindi ? "छुट्टी (Absent)" : "Absent (Leave)"}
            </button>
          </div>
        </div>
        
        {status === 'success' && (
          <div className="p-4 bg-emerald-50 text-emerald-700 rounded-2xl text-center border border-emerald-200 font-bold">
            {isHindi 
              ? "व्हाट्सएप खुल रहा है... कृपया मैसेज भेजें।"
              : "Opening WhatsApp... Please send the generated message."}
          </div>
        )}
      </div>
    </div>
  );
}
