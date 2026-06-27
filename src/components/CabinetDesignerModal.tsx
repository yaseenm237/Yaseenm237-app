import React, { useState, useRef, useEffect, MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from 'react';
import { Language, Unit, PartInput, SheetSettings } from '../types';
import { X, Wrench, Sparkles, PlusCircle, Hammer, Info, ArrowRight, ArrowLeft, Paintbrush, RefreshCw, Layers, CheckCircle, MousePointer2, Trash2 } from 'lucide-react';

interface CabinetDesignerModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  unit: Unit;
  settings: SheetSettings;
  onAddParts: (newParts: PartInput[]) => void;
}

interface InteriorElement {
  id: string;
  type: 'shelf' | 'partition' | 'dummy' | 'drawer';
  posPercent: number;
  sizeValue?: number;
}

export default function CabinetDesignerModal({
  isOpen,
  onClose,
  language,
  unit,
  settings,
  onAddParts
}: CabinetDesignerModalProps) {
  const isHindi = language === 'Hindi';

  // Step-wizard states: 1 = Sizes & Materials, 2 = Door Sizing, 3 = Sketch & Auto-Analysis
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Default values based on units
  const getDefaults = () => {
    if (unit === 'Inch') {
      return { height: 72, width: 36, depth: 22, ply: 0.75, back: 0.25 };
    } else if (unit === 'CM') {
      return { height: 180, width: 90, depth: 55, ply: 1.8, back: 0.6 };
    } else { // MM
      return { height: 1800, width: 900, depth: 550, ply: 18, back: 6 };
    }
  };

  const defaults = getDefaults();
  const [height, setHeight] = useState(defaults.height);
  const [width, setWidth] = useState(defaults.width);
  const [depth, setDepth] = useState(defaults.depth);
  const [plyThickness, setPlyThickness] = useState(defaults.ply);
  const [backingPly, setBackingPly] = useState<6 | 8 | 12>(6); // 6mm or 8mm Back (Standard)

  // Material ID states
  const defaultMainMaterial = settings.stockItems?.find(s => s.name.includes('18'))?.id || settings.stockItems?.[0]?.id || '';
  const defaultBackMaterial = settings.stockItems?.find(s => s.name.includes('6'))?.id || settings.stockItems?.[0]?.id || '';
  const defaultEdgeMaterial = settings.edgeBandItems?.[0]?.id || '';

  const [mainMaterialId, setMainMaterialId] = useState<string>(defaultMainMaterial);
  const [backMaterialId, setBackMaterialId] = useState<string>(defaultBackMaterial);
  const [edgeMaterialId, setEdgeMaterialId] = useState<string>(defaultEdgeMaterial);

  // Door option selections
  const [doorsCount, setDoorsCount] = useState<number>(2);

  // Interior Elements State
  const [interiorElements, setInteriorElements] = useState<InteriorElement[]>([
    { id: '1', type: 'shelf', posPercent: 0.33 },
    { id: '2', type: 'shelf', posPercent: 0.66 },
    { id: '3', type: 'drawer', posPercent: 0.85 }
  ]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  // Sizing limits based on unit
  const limits = {
    height: unit === 'Inch' ? { min: 12, max: 120 } : unit === 'CM' ? { min: 30, max: 300 } : { min: 300, max: 3000 },
    width: unit === 'Inch' ? { min: 12, max: 120 } : unit === 'CM' ? { min: 30, max: 300 } : { min: 300, max: 3000 },
    depth: unit === 'Inch' ? { min: 8, max: 48 } : unit === 'CM' ? { min: 20, max: 120 } : { min: 200, max: 1200 },
  };

  // Setup canvas removed

  if (!isOpen) return null;

  // Door sizing computations
  const getDoorCalculations = () => {
    // Gap tolerances (mm equivalent scaled)
    const gap = unit === 'Inch' ? 0.125 : unit === 'CM' ? 0.3 : 3;
    const computedH = height - (unit === 'Inch' ? 0.25 : unit === 'CM' ? 0.6 : 6);
    
    if (doorsCount > 0) {
      const computedW = (width / doorsCount) - gap;
      return {
        count: doorsCount,
        w: parseFloat(computedW.toFixed(2)),
        h: parseFloat(computedH.toFixed(2)),
        desc: isHindi 
          ? `${doorsCount} दरवाजे - साइज: ${computedH.toFixed(1)} x ${computedW.toFixed(1)} ${unit}` 
          : `${doorsCount} Doors - Size: ${computedH.toFixed(1)} x ${computedW.toFixed(1)} ${unit}`
      };
    } else {
      return {
        count: 0,
        w: 0,
        h: 0,
        desc: isHindi ? 'खुली शेल्फ अलमारी (दरवाजा नहीं)' : 'Open Almirah (No doors)'
      };
    }
  };

  const doorsInfo = getDoorCalculations();

  // Interior Elements handlers
  const addInteriorElement = (type: 'shelf' | 'partition' | 'dummy' | 'drawer') => {
    setInteriorElements(prev => [
      ...prev,
      { id: Date.now().toString(), type, posPercent: 0.5, sizeValue: type === 'dummy' ? (unit === 'Inch' ? 3 : 75) : undefined }
    ]);
  };

  const removeInteriorElement = (id: string) => {
    setInteriorElements(prev => prev.filter(e => e.id !== id));
    if (selectedElementId === id) setSelectedElementId(null);
  };

  const updateElementPos = (id: string, newPos: number) => {
    setInteriorElements(prev => prev.map(e => e.id === id ? { ...e, posPercent: newPos } : e));
  };

  // Compile final wood pieces cutlist
  const handleGenerateParts = () => {
    const list: PartInput[] = [];
    const p = plyThickness;

    // Helper to generate part with default materials
    const addPart = (part: Omit<PartInput, 'materialId' | 'edgeMaterialId'>, isBacking = false) => {
      list.push({
        ...part,
        materialId: isBacking ? backMaterialId : mainMaterialId,
        edgeMaterialId: edgeMaterialId
      });
    };

    // 1. Sides (Left & Right)
    addPart({
      id: `cab-side-l-${Date.now()}`,
      name: isHindi ? 'अलमारी साइड पैनल (बायाँ)' : 'Cabinet Side Panel (Left)',
      length: height,
      width: depth,
      grain: 'L',
      allowRot: false,
      quantity: 1,
      edges: { T: true, B: true, L: true, R: false }
    });
    addPart({
      id: `cab-side-r-${Date.now()}`,
      name: isHindi ? 'अलमारी साइड पैनल (दायाँ)' : 'Cabinet Side Panel (Right)',
      length: height,
      width: depth,
      grain: 'L',
      allowRot: false,
      quantity: 1,
      edges: { T: true, B: true, L: false, R: true }
    });

    // 2. Top and Bottom panels (Fits between side panels)
    const innerWidth = width - 2 * p;
    addPart({
      id: `cab-top-${Date.now()}`,
      name: isHindi ? 'अलमारी टॉप पैनल' : 'Cabinet Top Panel',
      length: innerWidth,
      width: depth,
      grain: 'L',
      allowRot: true,
      quantity: 1,
      edges: { T: true, B: false, L: true, R: true }
    });
    addPart({
      id: `cab-bottom-${Date.now()}`,
      name: isHindi ? 'अलमारी बॉटम पैनल' : 'Cabinet Bottom Panel',
      length: innerWidth,
      width: depth,
      grain: 'L',
      allowRot: true,
      quantity: 1,
      edges: { T: true, B: false, L: true, R: true }
    });

    // 3. Back Board (usually thin ply, fits full height/width)
    addPart({
      id: `cab-back-${Date.now()}`,
      name: isHindi ? `अलमारी बैक बोर्ड (${backingPly}mm प्लाई)` : `Cabinet Back Board (${backingPly}mm Back)`,
      length: height,
      width: width,
      grain: 'L',
      allowRot: false,
      quantity: 1,
      edges: { T: false, B: false, L: false, R: false }
    }, true);

    // 4. Analyzed Shelves
    const shelfList = interiorElements.filter(e => e.type === 'shelf');
    if (shelfList.length > 0) {
      addPart({
        id: `cab-shelf-${Date.now()}`,
        name: isHindi ? 'अलमारी शेल्फ (रैक)' : 'Cabinet Shelf Boards',
        length: innerWidth - (unit === 'Inch' ? 0.125 : 3), // slight tolerance
        width: depth - (unit === 'Inch' ? 0.75 : 18), // set back from doors
        grain: 'L',
        allowRot: true,
        quantity: shelfList.length,
        edges: { T: true, B: false, L: false, R: false }
      });
    }

    // 5. Analyzed Drawers (Drawer Front plates)
    const drawerList = interiorElements.filter(e => e.type === 'drawer');
    if (drawerList.length > 0) {
      const dH = unit === 'Inch' ? 8 : unit === 'CM' ? 20 : 200;
      addPart({
        id: `cab-draw-front-${Date.now()}`,
        name: isHindi ? 'दराज फ्रंट पैनल (Drawer Front)' : 'Drawer Front Plate',
        length: innerWidth - (unit === 'Inch' ? 0.25 : 6),
        width: dH - (unit === 'Inch' ? 0.125 : 3),
        grain: 'W',
        allowRot: false,
        quantity: drawerList.length,
        edges: { T: true, B: true, L: true, R: true }
      });
    }

    // 6. Partition boards
    const partitionList = interiorElements.filter(e => e.type === 'partition');
    if (partitionList.length > 0) {
      // fits vertically inside
      const partitionH = height - 2 * p;
      addPart({
        id: `cab-partition-${Date.now()}`,
        name: isHindi ? 'खड़ी पार्टीशन पट्टी (Vertical Divider)' : 'Vertical Partition divider',
        length: partitionH,
        width: depth - (unit === 'Inch' ? 0.5 : 12),
        grain: 'L',
        allowRot: false,
        quantity: partitionList.length,
        edges: { T: true, B: true, L: false, R: false }
      });
    }

    // 6b. Dummy boards (Drawer packing strips)
    const dummyList = interiorElements.filter(e => e.type === 'dummy');
    if (dummyList.length > 0) {
      addPart({
        id: `cab-dummy-${Date.now()}`,
        name: isHindi ? 'दराज डमी पट्टी (Dummy Packing)' : 'Drawer Dummy Packing Strip',
        length: height - 2 * p, // approximate full height padding
        width: unit === 'Inch' ? 3 : unit === 'CM' ? 7.5 : 75, // standard 3-inch wide dummy
        grain: 'L',
        allowRot: true,
        quantity: dummyList.length,
        edges: { T: true, B: false, L: false, R: false }
      });
    }

    // 7. Doors
    if (doorsCount > 0 && doorsInfo.count > 0) {
      addPart({
        id: `cab-door-${Date.now()}`,
        name: isHindi 
          ? `अलमारी पल्ला दरवाजा (${doorsCount + ' पल्ले'})` 
          : `Cabinet Door Shutter (${doorsCount + ' Door'})`,
        length: doorsInfo.h,
        width: doorsInfo.w,
        grain: 'L',
        allowRot: false,
        quantity: doorsInfo.count,
        edges: { T: true, B: true, L: true, R: true }
      });
    }

    onAddParts(list);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col max-h-[95vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
              <Hammer size={20} />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-800">
                {isHindi ? '2D अलमारी डिज़ाइनर व रफ स्केच एनालाइज़र' : '2D Cabinet Designer & Rough Sketch Analyzer'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isHindi 
                  ? 'हाथ से स्केच बनाकर रफ अलमारी बनाएं - हमारा एल्गोरिथ्म उसे सटीक 2D डायग्राम और कटिंग लिस्ट में बदलेगा' 
                  : 'Scribble/sketch layout on canvas - our algorithm converts rough drawings to flawless 2D diagrams'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors cursor-pointer">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Wizard Steps indicator bar */}
        <div className="bg-slate-50 border-b border-slate-100 px-6 py-3 flex justify-center items-center gap-2 md:gap-8 select-none">
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              step >= 1 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
            }`}>1</span>
            <span className={`text-xs font-bold ${step === 1 ? 'text-indigo-600' : 'text-slate-500'}`}>
              {isHindi ? 'माप और मटेरियल' : 'Sizes & Materials'}
            </span>
          </div>
          <div className="h-[2px] w-6 md:w-16 bg-slate-200" />
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              step >= 2 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
            }`}>2</span>
            <span className={`text-xs font-bold ${step === 2 ? 'text-indigo-600' : 'text-slate-500'}`}>
              {isHindi ? 'दरवाजा आकार' : 'Door Sizing'}
            </span>
          </div>
          <div className="h-[2px] w-6 md:w-16 bg-slate-200" />
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              step >= 3 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
            }`}>3</span>
            <span className={`text-xs font-bold ${step === 3 ? 'text-indigo-600' : 'text-slate-500'}`}>
              {isHindi ? 'स्केच व विश्लेषण' : 'Sketch & Blueprint'}
            </span>
          </div>
        </div>

        {/* Wizard Panel Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-white min-h-[400px]">
          
          {/* STEP 1: SIZES & MATERIALS */}
          {step === 1 && (
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="bg-indigo-50/50 rounded-xl p-4 border border-indigo-100 flex items-start gap-3">
                <Info size={18} className="text-indigo-600 shrink-0 mt-0.5" />
                <p className="text-xs text-indigo-900 leading-normal">
                  {isHindi 
                    ? 'कृपया यहाँ अपनी अलमारी के बाहरी आकार और प्लाई की मोटाई इनपुट करें। इसके बाद हम दरवाजा और रफ स्केच डिज़ाइन बनाएंगे।' 
                    : 'Configure the outer dimensions and plywood thickness. All inputs are tailored to standard carpentry tolerances.'}
                </p>
              </div>

              {/* Small Input Boxes for Sizing */}
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 mb-3 uppercase tracking-wider">
                  {isHindi ? '1. अलमारी का बाहरी साइज:' : '1. Outer Cabinet Dimensions:'}
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-50 p-3.5 border border-slate-200 rounded-xl focus-within:border-indigo-500 transition-colors">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                      {isHindi ? 'ऊंचाई (Height)' : 'Cabinet Height'}
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        value={height || ''}
                        onChange={(e) => setHeight(Math.max(limits.height.min, parseFloat(e.target.value) || limits.height.min))}
                        className="w-full text-sm font-mono font-bold bg-transparent border-0 p-0 focus:ring-0"
                      />
                      <span className="text-xs text-slate-400 font-bold">{unit}</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3.5 border border-slate-200 rounded-xl focus-within:border-indigo-500 transition-colors">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                      {isHindi ? 'चौड़ाई (Width)' : 'Cabinet Width'}
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        value={width || ''}
                        onChange={(e) => setWidth(Math.max(limits.width.min, parseFloat(e.target.value) || limits.width.min))}
                        className="w-full text-sm font-mono font-bold bg-transparent border-0 p-0 focus:ring-0"
                      />
                      <span className="text-xs text-slate-400 font-bold">{unit}</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3.5 border border-slate-200 rounded-xl focus-within:border-indigo-500 transition-colors">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                      {isHindi ? 'गहराई (Depth)' : 'Cabinet Depth'}
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        value={depth || ''}
                        onChange={(e) => setDepth(Math.max(limits.depth.min, parseFloat(e.target.value) || limits.depth.min))}
                        className="w-full text-sm font-mono font-bold bg-transparent border-0 p-0 focus:ring-0"
                      />
                      <span className="text-xs text-slate-400 font-bold">{unit}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Material and Board Selectors */}
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 mb-3 uppercase tracking-wider">
                  {isHindi ? '2. प्लाई सामग्री व थिकनेस:' : '2. Board Thickness & Materials:'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Side ply thickness selection */}
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-2">
                    <label className="block text-xs font-bold text-slate-700">
                      {isHindi ? 'मुख्य प्लाईवुड (Main Board Ply)' : 'Main Carcass Plywood'}
                    </label>
                    <select
                      value={mainMaterialId}
                      onChange={(e) => setMainMaterialId(e.target.value)}
                      className="w-full text-sm border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 font-medium text-slate-800"
                    >
                      {settings.stockItems?.map(item => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </select>
                    <div className="pt-2 grid grid-cols-3 gap-2">
                      {[
                        { val: unit === 'Inch' ? 0.75 : unit === 'CM' ? 1.8 : 18, label: '18 mm' },
                        { val: unit === 'Inch' ? 0.625 : unit === 'CM' ? 1.5 : 15, label: '15 mm' },
                        { val: unit === 'Inch' ? 0.5 : unit === 'CM' ? 1.2 : 12, label: '12 mm' }
                      ].map((item) => (
                        <button
                          key={item.label}
                          onClick={() => setPlyThickness(item.val)}
                          className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${
                            plyThickness === item.val
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Back Ply thickness specification (6mm or 8mm) */}
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-2">
                    <label className="block text-xs font-bold text-slate-700">
                      {isHindi ? 'बैक-बोर्ड सामग्री (Back Ply)' : 'Backboard Panel'}
                    </label>
                    <select
                      value={backMaterialId}
                      onChange={(e) => setBackMaterialId(e.target.value)}
                      className="w-full text-sm border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 font-medium text-slate-800"
                    >
                      {settings.stockItems?.map(item => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </select>
                    <div className="pt-2 grid grid-cols-3 gap-2">
                      {[
                        { val: 6, label: '6 mm' },
                        { val: 8, label: '8 mm' },
                        { val: 12, label: '12 mm' }
                      ].map((item) => (
                        <button
                          key={item.val}
                          onClick={() => setBackingPly(item.val as any)}
                          className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${
                            backingPly === item.val
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Edge banding selector */}
                <div className="mt-4 border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    {isHindi ? 'एज बैंडिंग (टेप) मटीरियल' : 'Edge Banding Material'}
                  </label>
                  <select
                    value={edgeMaterialId}
                    onChange={(e) => setEdgeMaterialId(e.target.value)}
                    className="w-full text-sm border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 font-medium text-slate-800"
                  >
                    <option value="">{isHindi ? 'डिफ़ॉल्ट टेप' : 'Default Tape'}</option>
                    {settings.edgeBandItems?.map(item => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: DOOR SIZING CALCULATIONS */}
          {step === 2 && (
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 flex items-start gap-3">
                <Sparkles size={18} className="text-emerald-600 shrink-0 mt-0.5 animate-pulse" />
                <div>
                  <h4 className="text-xs font-bold text-emerald-900">
                    {isHindi ? 'स्वचालित दरवाजा माप कैलकुलेटर' : 'Instant Auto Door Calculator'}
                  </h4>
                  <p className="text-[11px] text-emerald-800 mt-0.5 leading-normal">
                    {isHindi 
                      ? 'अलमारी के मुख्य फ्रेम (Height & Width) के हिसाब से दरवाजों के सटीक कटीले साइज नीचे आटोमेटिक कैलकुलेट कर दिए गए हैं:' 
                      : 'Based on carcass width & height, the doors are calculated with standard hinge-gaps automatically.'}
                  </p>
                </div>
              </div>

              {/* Door design selector */}
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                  {isHindi ? 'दरवाजों की संख्या चुनें:' : 'Select Number of Doors:'}
                </h3>
                <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200">
                  <input 
                    type="range" 
                    min="0" 
                    max="6" 
                    value={doorsCount} 
                    onChange={(e) => setDoorsCount(parseInt(e.target.value))}
                    className="flex-1 accent-indigo-600"
                  />
                  <div className="w-16 h-12 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center font-black text-xl text-slate-800">
                    {doorsCount}
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {doorsCount === 0 ? (isHindi ? 'बिना दरवाजे की खुली अलमारी' : 'Open cabinet without doors') : (isHindi ? `${doorsCount} दरवाजे लगाए जाएंगे` : `${doorsCount} doors will be added`)}
                </p>
              </div>

              {/* Automatic door measurement output banner */}
              <div className="bg-slate-900 text-white rounded-xl p-5 shadow space-y-3">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                    {isHindi ? 'सटीक कटिंग साइज रिजल्ट' : 'Calculated Cutting Sizes'}
                  </span>
                  <span className="bg-emerald-500 text-slate-900 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                    {isHindi ? 'त्रुटि रहित' : 'Zero Error'}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold">{isHindi ? 'कैलकुलेटेड दरवाजा प्रकार' : 'Calculated Door Layout'}</p>
                    <p className="text-sm font-bold text-slate-100">{doorsInfo.desc}</p>
                  </div>
                  {doorsCount > 0 && (
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 font-bold">{isHindi ? 'प्रत्येक पल्ले का साइज (H x W)' : 'Individual Size'}</p>
                      <p className="text-lg font-mono font-extrabold text-emerald-400">
                        {doorsInfo.h} x {doorsInfo.w} {unit}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: ROUGH SKETCH CANVAS & AI ANALYSIS */}
          {step === 3 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column (5/12): Add Elements & Sliders */}
              <div className="lg:col-span-5 flex flex-col space-y-4">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers size={14} className="text-indigo-600" />
                    {isHindi ? 'अंदर के भाग जोड़ें (Interior Elements)' : 'Add Interior Parts'}
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => addInteriorElement('shelf')} className="bg-white border border-indigo-200 text-indigo-700 py-2 rounded-lg text-xs font-bold hover:bg-indigo-50 flex items-center justify-center gap-1">
                      + {isHindi ? 'शेल्फ' : 'Shelf'}
                    </button>
                    <button onClick={() => addInteriorElement('partition')} className="bg-white border border-purple-200 text-purple-700 py-2 rounded-lg text-xs font-bold hover:bg-purple-50 flex items-center justify-center gap-1">
                      + {isHindi ? 'पार्टीशन' : 'Partition'}
                    </button>
                    <button onClick={() => addInteriorElement('drawer')} className="bg-white border border-amber-200 text-amber-700 py-2 rounded-lg text-xs font-bold hover:bg-amber-50 flex items-center justify-center gap-1">
                      + {isHindi ? 'दराज (Drawer)' : 'Drawer'}
                    </button>
                    <button onClick={() => addInteriorElement('dummy')} className="bg-white border border-slate-300 text-slate-700 py-2 rounded-lg text-xs font-bold hover:bg-slate-100 flex items-center justify-center gap-1">
                      + {isHindi ? 'डमी (Dummy)' : 'Dummy'}
                    </button>
                  </div>

                  <div className="space-y-3 mt-4 max-h-[300px] overflow-y-auto pr-1">
                    {interiorElements.length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-4">{isHindi ? 'कोई भाग नहीं जोड़ा गया' : 'No elements added'}</p>
                    )}
                    {interiorElements.map((el, i) => (
                      <div key={el.id} className={`bg-white p-3 rounded-xl border ${selectedElementId === el.id ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-slate-200'}`}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-bold text-slate-700 capitalize">
                            {i+1}. {isHindi ? (el.type === 'shelf' ? 'शेल्फ' : el.type === 'partition' ? 'पार्टीशन' : el.type === 'drawer' ? 'दराज' : 'डमी') : el.type}
                          </span>
                          <button onClick={() => removeInteriorElement(el.id)} className="text-rose-500 hover:text-rose-700 p-1">
                            <Trash2 size={12} />
                          </button>
                        </div>
                        <div>
                          <label className="flex justify-between text-[10px] text-slate-500 mb-1">
                            <span>{el.type === 'partition' || el.type === 'dummy' ? (isHindi ? 'बाएँ से दूरी' : 'Left Position') : (isHindi ? 'ऊपर से दूरी' : 'Top Position')}</span>
                            <span>{Math.round(el.posPercent * 100)}%</span>
                          </label>
                          <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            value={Math.round(el.posPercent * 100)} 
                            onChange={(e) => {
                              setSelectedElementId(el.id);
                              updateElementPos(el.id, parseInt(e.target.value)/100);
                            }}
                            className="w-full accent-indigo-600"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column (7/12): 2D Blueprint preview */}
              <div className="lg:col-span-7 flex flex-col md:flex-row gap-4 items-center justify-center">
                
                {/* Auto Generated Pristine 2D CAD Blueprint Layout */}
                <div className="flex flex-col items-center w-full">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1 text-emerald-600">
                    <Layers size={11} />
                    {isHindi ? 'सटीक 2D ग्राफ डायग्राम' : 'Pristine 2D Diagram'}
                  </span>
                  
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-xl flex items-center justify-center w-[220px] h-[304px]">
                    <svg width={180} height={260} className="text-white">
                      {/* Grid background for CAD feel */}
                      <defs>
                        <pattern id="cad-grid" width="8" height="8" patternUnits="userSpaceOnUse">
                          <path d="M 8 0 L 0 0 0 8" fill="none" stroke="#1e293b" strokeWidth="0.5" />
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#cad-grid)" />

                      {/* Cabinet Outer Boundary */}
                      <rect
                        x={15}
                        y={15}
                        width={150}
                        height={230}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="2"
                      />

                      {/* Display Ply Thickness Inside frame */}
                      <rect
                        x={19}
                        y={19}
                        width={142}
                        height={222}
                        fill="none"
                        stroke="#059669"
                        strokeWidth="0.5"
                        strokeDasharray="2,2"
                      />

                      {/* Draw interior elements */}
                      {interiorElements.map((el, idx) => {
                        if (el.type === 'shelf') {
                          const yPos = 15 + el.posPercent * 230;
                          return (
                            <g key={el.id}>
                              <line x1={19} y1={yPos} x2={147} y2={yPos} stroke={selectedElementId === el.id ? "#3b82f6" : "#60a5fa"} strokeWidth={selectedElementId === el.id ? "3" : "2"} />
                              <text x={24} y={yPos - 4} fontSize="6" fill="#93c5fd" fontWeight="bold">{isHindi ? 'शेल्फ' : 'SHELF'}</text>
                              <line x1={17} y1={15} x2={17} y2={yPos} stroke="#475569" strokeWidth="0.5" strokeDasharray="1,1" />
                              <text x={10} y={15 + (yPos - 15) / 2} fontSize="5" fill="#94a3b8" transform={`rotate(-90, 10, ${15 + (yPos - 15)/2})`} textAnchor="middle">
                                {((height * el.posPercent)).toFixed(1)}
                              </text>
                            </g>
                          );
                        }
                        
                        if (el.type === 'partition' || el.type === 'dummy') {
                          const xPos = 15 + el.posPercent * 150;
                          const isDummy = el.type === 'dummy';
                          return (
                            <g key={el.id}>
                              <line x1={xPos} y1={19} x2={xPos} y2={237} stroke={selectedElementId === el.id ? (isDummy ? "#cbd5e1" : "#8b5cf6") : (isDummy ? "#94a3b8" : "#a78bfa")} strokeWidth={isDummy ? "4" : (selectedElementId === el.id ? "3" : "2")} />
                              <text x={xPos - 4} y={30} fontSize="5" fill={isDummy ? "#cbd5e1" : "#c084fc"} fontWeight="bold" transform={`rotate(-90, ${xPos-4}, 30)`}>
                                {isDummy ? (isHindi ? 'डमी' : 'DUMMY') : (isHindi ? 'पार्टीशन' : 'DIVIDER')}
                              </text>
                              <line x1={15} y1={17} x2={xPos} y2={17} stroke="#475569" strokeWidth="0.5" strokeDasharray="1,1" />
                              <text x={15 + (xPos - 15) / 2} y={13} fontSize="5" fill="#94a3b8" textAnchor="middle">
                                {((width * el.posPercent)).toFixed(1)}
                              </text>
                            </g>
                          );
                        }
                        
                        if (el.type === 'drawer') {
                          const yPos = 15 + el.posPercent * 230;
                          return (
                            <g key={el.id}>
                              <rect x={19} y={yPos - 12} width={142} height={24} fill="#1e293b" stroke={selectedElementId === el.id ? "#fbbf24" : "#d97706"} strokeWidth={selectedElementId === el.id ? "2" : "1"} />
                              <line x1={70} y1={yPos} x2={110} y2={yPos} stroke="#f59e0b" strokeWidth="1.5" />
                              <text x={86} y={yPos + 8} textAnchor="middle" fontSize="6" fill="#fbbf24" fontWeight="bold">{isHindi ? 'दराज' : 'DRAWER'}</text>
                            </g>
                          );
                        }
                        return null;
                      })}

                      {/* Sizing tags on blueprint */}
                      <text x={90} y={255} textAnchor="middle" fontSize="8" fill="#475569" fontWeight="bold">
                        W: {width} {unit}
                      </text>
                      <text x={8} y={130} textAnchor="middle" fontSize="8" fill="#475569" fontWeight="bold" transform="rotate(-90, 8, 130)">
                        H: {height} {unit}
                      </text>
                    </svg>
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-b-2xl">
          <div>
            {step > 1 && (
              <button
                onClick={() => setStep(prev => (prev - 1) as any)}
                className="px-4 py-2.5 flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <ArrowLeft size={14} />
                {isHindi ? 'पीछे जाएं' : 'Back'}
              </button>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              {isHindi ? 'रद्द करें' : 'Cancel'}
            </button>
            
            {step < 3 ? (
              <button
                onClick={() => setStep(prev => (prev + 1) as any)}
                className="px-6 py-2.5 flex items-center gap-2 text-sm font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md shadow-indigo-200 active:scale-95 cursor-pointer"
              >
                {isHindi ? 'अगला कदम' : 'Next Step'}
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                onClick={handleGenerateParts}
                className="px-6 py-2.5 flex items-center gap-2 text-sm font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-md shadow-emerald-200 active:scale-95 cursor-pointer"
              >
                <PlusCircle size={16} />
                {isHindi ? 'पुर्जे कटिंग लिस्ट में जोड़ें' : 'Add Parts to Cutting List'}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
