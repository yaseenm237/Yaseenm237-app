/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Layers, 
  Hammer, 
  Users, 
  Calculator, 
  History, 
  Printer, 
  Sparkles, 
  ChevronRight, 
  Info,
  ShieldCheck,
  Award
} from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  isHindi: boolean;
}

export default function AboutModal({ isOpen, onClose, isHindi }: AboutModalProps) {
  if (!isOpen) return null;

  const features = [
    {
      icon: <Layers className="text-indigo-500" size={18} />,
      title: isHindi ? "स्मार्ट कटिंग मैप (Nesting Engine)" : "Smart Nesting Engine",
      desc: isHindi 
        ? "प्लाईवुड, एमडीएफ और मेलामाइन के लिए उच्च-दक्षता कटिंग आरेख बनाता है और बर्बादी (Waste) को न्यूनतम करता है।" 
        : "Generates high-efficiency cutting layout diagrams for Plywood, MDF, and Melamine, minimizing raw material waste."
    },
    {
      icon: <Hammer className="text-amber-500" size={18} />,
      title: isHindi ? "2D अलमारी डिज़ाइनर (Cabinet Designer)" : "2D Almirah & Cabinet Designer",
      desc: isHindi 
        ? "कस्टम अलमारी और दराज की संरचना को ड्रैग-एंड-ड्रॉप रूप से जोड़कर तुरंत कटिंग लिस्ट तैयार करें।" 
        : "Design complete custom wardrobe layouts and instantly compute their component cutting lists with visual templates."
    },
    {
      icon: <Users className="text-emerald-500" size={18} />,
      title: isHindi ? "हाजिरी और मजदूरी ट्रैकर (Attendance & Wages)" : "Attendance & Wage Logs",
      desc: isHindi 
        ? "दैनिक मजदूरों की उपस्थिति दर्ज करें और व्हाट्सएप के माध्यम से सेटअप या डायरेक्ट हाजिरी लिंक शेयर करें।" 
        : "Monitor daily attendance logs for woodworkers and carpenters. Shares a secure instant attendance reporting link on WhatsApp."
    },
    {
      icon: <Calculator className="text-pink-500" size={18} />,
      title: isHindi ? "एस्टीमेट बिल जनरेटर (Estimate Billing)" : "Estimate Billing Calculator",
      desc: isHindi 
        ? "सेंटीमीटर इनपुट देकर तुरंत स्क्वायर फीट बिल बनाएं, उसे सेव करें और व्हाट्सएप पर सुंदर फॉर्मेट में भेजें।" 
        : "Convert centimeter inputs into professional square feet bills, save estimates, and copy clean formats for WhatsApp billing."
    },
    {
      icon: <History className="text-sky-500" size={18} />,
      title: isHindi ? "असीमित इतिहास और पूर्ववत (Undo/Redo Workspace)" : "Infinite History & State Tracking",
      desc: isHindi 
        ? "Ctrl+Z/Ctrl+Y शॉर्टकट समर्थन के साथ पूरे वर्कस्पेस का इतिहास सुरक्षित रखें ताकि गलतियाँ तुरंत ठीक हो सकें।" 
        : "Tracks your exact adjustments in real-time. Instantly undo/redo layout modifications with standard keyboard shortcuts."
    },
    {
      icon: <Printer className="text-indigo-500" size={18} />,
      title: isHindi ? "प्रिंट एवं पीडीएफ रिपोर्ट (Professional PDFs)" : "High-Fidelity PDF Blueprint",
      desc: isHindi 
        ? "कार्यशाला (Workshop) में काम करने वाले कारीगरों के लिए सुंदर और स्पष्ट ब्लू-प्रिंट रिपोर्ट प्रिंट करें।" 
        : "Generates clear, clean, professional layouts and cut list tables specifically optimized for workshop craftsmen and printers."
    }
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/40">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-md shadow-indigo-200 dark:shadow-none">
                <Info size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {isHindi ? 'सॉफ्टवेयर के बारे में' : 'About Sahira Interior'}
                </h3>
                <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                  {isHindi ? 'स्मार्ट बढ़ईगिरी ऑप्टिमाइज़र प्रो' : 'Smart Carpentry Optimizer Pro'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Logo and Version details */}
            <div className="flex flex-col items-center justify-center text-center p-4 bg-gradient-to-br from-indigo-50/50 to-slate-50 dark:from-slate-950/30 dark:to-slate-950/10 border border-slate-100 dark:border-slate-800 rounded-2xl">
              <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white dark:border-slate-800 shadow-xl mb-3">
                <img src="/src/assets/images/shahirah_logo_1782493245476.jpg" alt="Sahira Interior Logo" className="w-full h-full object-cover" />
              </div>
              <h4 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                Sahira Interior Carpentry Engine
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {isHindi ? 'वर्जन' : 'Version'}: <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">2.4.0-PRO</span>
              </p>
              <div className="mt-2.5 inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                <ShieldCheck size={12} />
                {isHindi ? 'सक्रिय प्रो लाइसेंस' : 'Active Pro License'}
              </div>
            </div>

            {/* Core Capabilities */}
            <div className="space-y-3">
              <h5 className="text-xs font-extrabold uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                {isHindi ? 'मुख्य विशेषताएं' : 'Core Capabilities'}
              </h5>
              <div className="grid grid-cols-1 gap-3">
                {features.map((feat, index) => (
                  <div key={index} className="flex gap-4 p-3 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 rounded-xl hover:shadow-sm transition-all duration-200">
                    <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm shrink-0 flex items-center justify-center h-10 w-10">
                      {feat.icon}
                    </div>
                    <div>
                      <h6 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{feat.title}</h6>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{feat.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tech Specs */}
            <div className="bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 rounded-xl p-4 text-xs font-medium space-y-2">
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                {isHindi ? 'सिस्टम विशिष्टताएँ' : 'Technical Specifications'}
              </p>
              <div className="grid grid-cols-2 gap-4 text-slate-600 dark:text-slate-300">
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block">{isHindi ? 'एल्गोरिथम' : 'Nesting Algorithm'}:</span>
                  <span className="font-bold text-slate-800 dark:text-white">MaxRects BSSF & Guillotine Split</span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block">{isHindi ? 'यूनिट कनवर्टर' : 'Measurement Engines'}:</span>
                  <span className="font-bold text-slate-800 dark:text-white">Inch / CM / MM Multi-Grid</span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block">{isHindi ? 'स्थानीय संग्रहण' : 'Local Storage'}:</span>
                  <span className="font-bold text-slate-800 dark:text-white">{isHindi ? 'सुरक्षित ऑटो-बैकअप' : 'Encrypted Local Backups'}</span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block">{isHindi ? 'समर्थित डिवाइस' : 'Compatible Clients'}:</span>
                  <span className="font-bold text-slate-800 dark:text-white">iOS, Android, Windows, Mac</span>
                </div>
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-center text-xs text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row justify-between items-center gap-2">
            <span>© {new Date().getFullYear()} Sahira Interior. All rights reserved.</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">Crafted for Excellence</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
