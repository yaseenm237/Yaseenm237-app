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

interface CompartmentNode {
  id: string;
  splitType: 'none' | 'h' | 'v';
  splitValue?: number;
  dividerType?: 'shelf' | 'partition' | 'dummy';
  child1?: CompartmentNode;
  child2?: CompartmentNode;
  isDrawer?: boolean;
  drawerFasciaW?: number;
  drawerFasciaH?: number;
  drawerSideL?: number;
  drawerSideH?: number;
  drawerInnerFrontH?: number;
  channelClearance?: number;
  drawerDummySide?: 'none' | 'left' | 'right' | 'both';
  drawerDummyWidth?: number;
  dummyWidth?: number;
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
  const [rootNode, setRootNode] = useState<CompartmentNode>({ id: 'root', splitType: 'none' });
  const [selectedElementId, setSelectedElementId] = useState<string>('root');
  const [showDrawerFascia, setShowDrawerFascia] = useState<boolean>(true);

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
  const updateNode = (tree: CompartmentNode, id: string, updater: (node: CompartmentNode) => CompartmentNode): CompartmentNode => {
    if (tree.id === id) return updater(tree);
    const newNode = { ...tree };
    if (newNode.child1) newNode.child1 = updateNode(newNode.child1, id, updater);
    if (newNode.child2) newNode.child2 = updateNode(newNode.child2, id, updater);
    return newNode;
  };

  const addInteriorElement = (type: 'shelf' | 'partition' | 'dummy' | 'drawer') => {
    if (!selectedElementId) return;
    setRootNode(prev => updateNode(prev, selectedElementId, (node) => {
      if (type === 'drawer') {
        return { ...node, isDrawer: true };
      }
      return {
        ...node,
        splitType: (type === 'shelf') ? 'h' : 'v',
        dividerType: type,
        splitValue: undefined,
        child1: { id: Date.now().toString() + '-1', splitType: 'none' },
        child2: { id: Date.now().toString() + '-2', splitType: 'none' }
      };
    }));
  };

  const removeInteriorElement = (id: string) => {
    setRootNode(prev => updateNode(prev, id, (node) => ({
      id: node.id,
      splitType: 'none',
      isDrawer: false
    })));
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

    // 4. Analyzed Shelves, Partitions & Drawers (Recursive)
    const traverse = (node: CompartmentNode, cw: number, ch: number) => {
      if (node.splitType === 'none') {
        if (node.isDrawer) {
          const dumSide = node.drawerDummySide || 'none';
          const dumW = node.drawerDummyWidth || (unit === 'Inch' ? 1.5 : unit === 'CM' ? 3.5 : 35);
          
          let effCw = cw;
          // Add Drawer Dummy
          if (dumSide === 'left' || dumSide === 'both') {
            effCw -= p;
            addPart({
              id: `cab-draw-duml-${Date.now()}-${Math.random()}`,
              name: isHindi ? 'दराज डमी (Left)' : 'Drawer Dummy (Left)',
              length: ch,
              width: dumW,
              grain: 'L',
              allowRot: true,
              quantity: 1,
              edges: { T: true, B: false, L: false, R: false }
            });
          }
          if (dumSide === 'right' || dumSide === 'both') {
            effCw -= p;
            addPart({
              id: `cab-draw-dumr-${Date.now()}-${Math.random()}`,
              name: isHindi ? 'दराज डमी (Right)' : 'Drawer Dummy (Right)',
              length: ch,
              width: dumW,
              grain: 'L',
              allowRot: true,
              quantity: 1,
              edges: { T: true, B: false, L: false, R: false }
            });
          }

          const clearance = node.channelClearance || (unit === 'Inch' ? 1 : unit === 'CM' ? 2.5 : 25);
          const fasciaW = node.drawerFasciaW || Math.max(effCw - (unit === 'Inch' ? 0.25 : 6), 0);
          const fasciaH = node.drawerFasciaH || ch - (unit === 'Inch' ? 0.125 : 3);
          const sideL = node.drawerSideL || (depth - (unit === 'Inch' ? 1 : 25));
          const sideH = node.drawerSideH || Math.max(fasciaH - (unit === 'Inch' ? 1 : 25), 0);
          const boxW = Math.max(effCw - clearance - (2 * p), 0);
          const innerFrontH = node.drawerInnerFrontH || (unit === 'Inch' ? 3 : unit === 'CM' ? 7 : 70);

          // Drawer Front (Fascia)
          addPart({
            id: `cab-draw-front-${Date.now()}-${Math.random()}`,
            name: isHindi ? 'दराज फ्रंट पैनल (Drawer Front)' : 'Drawer Front Plate',
            length: fasciaW,
            width: fasciaH,
            grain: 'W',
            allowRot: false,
            quantity: 1,
            edges: { T: true, B: true, L: true, R: true }
          });
          
          // Drawer Box Sides
          addPart({
            id: `cab-draw-side-${Date.now()}-${Math.random()}`,
            name: isHindi ? 'दराज साइड बॉक्स (Drawer Side)' : 'Drawer Side Box',
            length: sideL,
            width: sideH,
            grain: 'L',
            allowRot: true,
            quantity: 2,
            edges: { T: true, B: false, L: false, R: false }
          });
          
          // Drawer Box Back
          addPart({
            id: `cab-draw-back-${Date.now()}-${Math.random()}`,
            name: isHindi ? 'दराज बैक बॉक्स (Drawer Back)' : 'Drawer Back Box',
            length: boxW,
            width: sideH,
            grain: 'L',
            allowRot: true,
            quantity: 1,
            edges: { T: true, B: false, L: false, R: false }
          });

          // Drawer Inner Front Strip (Support)
          addPart({
            id: `cab-draw-front-inner-${Date.now()}-${Math.random()}`,
            name: isHindi ? 'दराज अंदरूनी फ्रंट (Drawer Inner Front)' : 'Drawer Inner Front Strip',
            length: boxW,
            width: innerFrontH,
            grain: 'L',
            allowRot: true,
            quantity: 1,
            edges: { T: true, B: false, L: false, R: false }
          });
          
          // Drawer Bottom
          addPart({
            id: `cab-draw-bot-${Date.now()}-${Math.random()}`,
            name: isHindi ? 'दराज का बेस (Drawer Bottom)' : 'Drawer Bottom',
            length: boxW,
            width: sideL,
            grain: 'L',
            allowRot: true,
            quantity: 1,
            edges: { T: false, B: false, L: false, R: false }
          });
        }
        return;
      }
      
      if (node.splitType === 'h' && node.child1 && node.child2) {
        const val = node.splitValue || (ch - p) / 2;
        addPart({
          id: `cab-shelf-${Date.now()}-${Math.random()}`,
          name: isHindi ? 'अलमारी शेल्फ (रैक)' : 'Cabinet Shelf Board',
          length: cw - (unit === 'Inch' ? 0.125 : 3), // slight tolerance
          width: depth - (unit === 'Inch' ? 0.75 : 18), // set back from doors
          grain: 'L',
          allowRot: true,
          quantity: 1,
          edges: { T: true, B: false, L: false, R: false }
        });
        traverse(node.child1, cw, val);
        traverse(node.child2, cw, ch - val - p);
      } else if (node.splitType === 'v' && node.child1 && node.child2) {
        const val = node.splitValue || (cw - p) / 2;
        if (node.dividerType === 'dummy') {
          addPart({
            id: `cab-dummy-${Date.now()}-${Math.random()}`,
            name: isHindi ? 'दराज डमी पट्टी (Dummy Packing)' : 'Drawer Dummy Packing Strip',
            length: ch,
            width: node.dummyWidth || (unit === 'Inch' ? 1.5 : unit === 'CM' ? 3.5 : 35),
            grain: 'L',
            allowRot: true,
            quantity: 1,
            edges: { T: true, B: false, L: false, R: false }
          });
        } else {
          addPart({
            id: `cab-partition-${Date.now()}-${Math.random()}`,
            name: isHindi ? 'खड़ी पार्टीशन पट्टी (Vertical Divider)' : 'Vertical Partition divider',
            length: ch,
            width: depth - (unit === 'Inch' ? 0.5 : 12),
            grain: 'L',
            allowRot: false,
            quantity: 1,
            edges: { T: true, B: true, L: false, R: false }
          });
        }
        traverse(node.child1, val, ch);
        traverse(node.child2, cw - val - p, ch);
      }
    };
    
    traverse(rootNode, innerWidth, height - 2 * p);

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
                  
                  <p className="text-xs text-slate-500 leading-relaxed mb-4">
                    {isHindi ? 'दाएं तरफ बने डायग्राम में किसी भी खाली खाने (Compartment) पर क्लिक करें और उसे डिवाइड करें।' : 'Click on any empty compartment in the 2D diagram on the right to divide it.'}
                  </p>

                  <div className="space-y-3 mt-4">
                    {(() => {
                      const findNode = (n: CompartmentNode, id: string): CompartmentNode | null => {
                        if (n.id === id) return n;
                        if (n.child1) {
                          const f = findNode(n.child1, id);
                          if (f) return f;
                        }
                        if (n.child2) {
                          const f = findNode(n.child2, id);
                          if (f) return f;
                        }
                        return null;
                      };
                      
                      const selectedNode = findNode(rootNode, selectedElementId);
                      if (!selectedNode) return null;

                      if (selectedNode.splitType === 'none') {
                        return (
                          <div className="space-y-3">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                              {isHindi ? 'चुने गए खाने में जोड़ें:' : 'Add to selected area:'}
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                              <button onClick={() => addInteriorElement('shelf')} className="bg-white border border-indigo-200 text-indigo-700 py-2 rounded-lg text-xs font-bold hover:bg-indigo-50 flex items-center justify-center gap-1">
                                + {isHindi ? 'शेल्फ' : 'Shelf'}
                              </button>
                              <button onClick={() => addInteriorElement('partition')} className="bg-white border border-purple-200 text-purple-700 py-2 rounded-lg text-xs font-bold hover:bg-purple-50 flex items-center justify-center gap-1">
                                + {isHindi ? 'पार्टीशन' : 'Partition'}
                              </button>
                              <button onClick={() => addInteriorElement('drawer')} className="bg-white border border-amber-200 text-amber-700 py-2 rounded-lg text-xs font-bold hover:bg-amber-50 flex items-center justify-center gap-1">
                                + {isHindi ? 'दराज' : 'Drawer'}
                              </button>
                              <button onClick={() => addInteriorElement('dummy')} className="bg-white border border-slate-300 text-slate-700 py-2 rounded-lg text-xs font-bold hover:bg-slate-100 flex items-center justify-center gap-1">
                                + {isHindi ? 'डमी' : 'Dummy'}
                              </button>
                            </div>
                            {selectedNode.isDrawer && (
                              <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-3">
                                <div className="flex justify-between items-center mb-1">
                                  <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
                                    {isHindi ? 'दराज की सेटिंग' : 'Drawer Settings'}
                                  </p>
                                  <button onClick={() => removeInteriorElement(selectedNode.id)} className="text-rose-500 hover:text-rose-700 p-1 bg-white rounded">
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                                
                                <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                                  {/* Dummy settings */}
                                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                                    <label className="flex justify-between items-center text-xs font-bold text-slate-900 mb-2">
                                      <span>{isHindi ? 'दराज डमी (Drawer Dummy)' : 'Drawer Dummy'}</span>
                                      <select
                                        className="text-[10px] bg-slate-50 border-slate-200 rounded p-1 font-bold focus:ring-0"
                                        value={selectedNode.drawerDummySide || 'none'}
                                        onChange={(e) => setRootNode(prev => updateNode(prev, selectedNode.id, n => ({ ...n, drawerDummySide: e.target.value as any })))}
                                      >
                                        <option value="none">{isHindi ? 'कोई नहीं' : 'None'}</option>
                                        <option value="left">{isHindi ? 'सिर्फ बाएँ' : 'Left Only'}</option>
                                        <option value="right">{isHindi ? 'सिर्फ दाएँ' : 'Right Only'}</option>
                                        <option value="both">{isHindi ? 'दोनों तरफ' : 'Both Sides'}</option>
                                      </select>
                                    </label>
                                    {(selectedNode.drawerDummySide && selectedNode.drawerDummySide !== 'none') && (
                                      <label className="flex justify-between items-center text-xs font-bold text-slate-900">
                                        <span>{isHindi ? 'डमी चौड़ाई' : 'Dummy Width'}</span>
                                        <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded px-1 py-1">
                                          <input
                                            type="number"
                                            min="0"
                                            step="0.1"
                                            value={selectedNode.drawerDummyWidth || (unit === 'Inch' ? 1.5 : unit === 'CM' ? 3.5 : 35)}
                                            onChange={(e) => {
                                              let v = parseFloat(e.target.value) || 0;
                                              setRootNode(prev => updateNode(prev, selectedNode.id, n => ({ ...n, drawerDummyWidth: v })));
                                            }}
                                            className="w-12 bg-transparent border-0 p-0 text-right text-xs font-bold text-slate-900 focus:ring-0"
                                          />
                                          <span className="text-[10px] text-slate-400 font-bold">{unit}</span>
                                        </div>
                                      </label>
                                    )}
                                  </div>

                                  {/* Front Panel (Fascia) */}
                                  <div className="bg-white p-2 rounded-lg border border-slate-200 space-y-2">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase">{isHindi ? 'फ्रंट पैनल (Fascia)' : 'Front Panel (Fascia)'}</p>
                                    <label className="flex justify-between items-center text-xs font-bold text-slate-900">
                                      <span>{isHindi ? 'ऊंचाई (Height)' : 'Height'}</span>
                                      <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded px-1 py-1">
                                        <input
                                          type="number"
                                          min="0"
                                          step="0.1"
                                          value={selectedNode.drawerFasciaH || ''}
                                          placeholder="Auto"
                                          onChange={(e) => {
                                            let v = parseFloat(e.target.value);
                                            setRootNode(prev => updateNode(prev, selectedNode.id, n => ({ ...n, drawerFasciaH: isNaN(v) ? undefined : v })));
                                          }}
                                          className="w-12 bg-transparent border-0 p-0 text-right text-xs font-bold text-slate-900 focus:ring-0 placeholder:text-slate-300"
                                        />
                                        <span className="text-[10px] text-slate-400 font-bold">{unit}</span>
                                      </div>
                                    </label>
                                    <label className="flex justify-between items-center text-xs font-bold text-slate-900">
                                      <span>{isHindi ? 'चौड़ाई (Width)' : 'Width'}</span>
                                      <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded px-1 py-1">
                                        <input
                                          type="number"
                                          min="0"
                                          step="0.1"
                                          value={selectedNode.drawerFasciaW || ''}
                                          placeholder="Auto"
                                          onChange={(e) => {
                                            let v = parseFloat(e.target.value);
                                            setRootNode(prev => updateNode(prev, selectedNode.id, n => ({ ...n, drawerFasciaW: isNaN(v) ? undefined : v })));
                                          }}
                                          className="w-12 bg-transparent border-0 p-0 text-right text-xs font-bold text-slate-900 focus:ring-0 placeholder:text-slate-300"
                                        />
                                        <span className="text-[10px] text-slate-400 font-bold">{unit}</span>
                                      </div>
                                    </label>
                                  </div>
                                  
                                  {/* Drawer Box Sides */}
                                  <div className="bg-white p-2 rounded-lg border border-slate-200 space-y-2">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase">{isHindi ? 'साइड बॉक्स (Sides)' : 'Drawer Sides'}</p>
                                    <label className="flex justify-between items-center text-xs font-bold text-slate-900">
                                      <span>{isHindi ? 'लंबाई (Depth)' : 'Length (Depth)'}</span>
                                      <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded px-1 py-1">
                                        <input
                                          type="number"
                                          min="0"
                                          step="0.1"
                                          value={selectedNode.drawerSideL || ''}
                                          placeholder="Auto"
                                          onChange={(e) => {
                                            let v = parseFloat(e.target.value);
                                            setRootNode(prev => updateNode(prev, selectedNode.id, n => ({ ...n, drawerSideL: isNaN(v) ? undefined : v })));
                                          }}
                                          className="w-12 bg-transparent border-0 p-0 text-right text-xs font-bold text-slate-900 focus:ring-0 placeholder:text-slate-300"
                                        />
                                        <span className="text-[10px] text-slate-400 font-bold">{unit}</span>
                                      </div>
                                    </label>
                                    <label className="flex justify-between items-center text-xs font-bold text-slate-900">
                                      <span>{isHindi ? 'ऊंचाई (Height)' : 'Height'}</span>
                                      <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded px-1 py-1">
                                        <input
                                          type="number"
                                          min="0"
                                          step="0.1"
                                          value={selectedNode.drawerSideH || ''}
                                          placeholder="Auto"
                                          onChange={(e) => {
                                            let v = parseFloat(e.target.value);
                                            setRootNode(prev => updateNode(prev, selectedNode.id, n => ({ ...n, drawerSideH: isNaN(v) ? undefined : v })));
                                          }}
                                          className="w-12 bg-transparent border-0 p-0 text-right text-xs font-bold text-slate-900 focus:ring-0 placeholder:text-slate-300"
                                        />
                                        <span className="text-[10px] text-slate-400 font-bold">{unit}</span>
                                      </div>
                                    </label>
                                    <label className="flex justify-between items-center text-xs font-bold text-slate-900">
                                      <span title="Total space taken by both side channels (e.g. 1 inch or 25mm)">
                                        {isHindi ? 'चैनल क्लीयरेंस' : 'Channel Clearance'}
                                      </span>
                                      <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded px-1 py-1">
                                        <input
                                          type="number"
                                          min="0"
                                          step="0.1"
                                          value={selectedNode.channelClearance || (unit === 'Inch' ? 1 : unit === 'CM' ? 2.5 : 25)}
                                          onChange={(e) => {
                                            let v = parseFloat(e.target.value) || 0;
                                            setRootNode(prev => updateNode(prev, selectedNode.id, n => ({ ...n, channelClearance: v })));
                                          }}
                                          className="w-12 bg-transparent border-0 p-0 text-right text-xs font-bold text-slate-900 focus:ring-0"
                                        />
                                        <span className="text-[10px] text-slate-400 font-bold">{unit}</span>
                                      </div>
                                    </label>
                                  </div>

                                  {/* Drawer Box Inner Front */}
                                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                                    <label className="flex justify-between items-center text-xs font-bold text-slate-900">
                                      <span className="w-24 leading-tight">{isHindi ? 'अंदरूनी फ्रंट (Inner Front)' : 'Inner Front Strip'}</span>
                                      <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded px-1 py-1">
                                        <input
                                          type="number"
                                          min="0"
                                          step="0.1"
                                          value={selectedNode.drawerInnerFrontH || (unit === 'Inch' ? 3 : unit === 'CM' ? 7 : 70)}
                                          onChange={(e) => {
                                            let v = parseFloat(e.target.value) || 0;
                                            setRootNode(prev => updateNode(prev, selectedNode.id, n => ({ ...n, drawerInnerFrontH: v })));
                                          }}
                                          className="w-12 bg-transparent border-0 p-0 text-right text-xs font-bold text-slate-900 focus:ring-0"
                                        />
                                        <span className="text-[10px] text-slate-400 font-bold">{unit}</span>
                                      </div>
                                    </label>
                                  </div>

                                  <button
                                    onClick={() => setSelectedElementId('root')}
                                    className="w-full mt-2 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold transition-colors"
                                  >
                                    {isHindi ? 'सेव करें (Save)' : 'Done / Save Settings'}
                                  </button>

                                </div>
                              </div>
                            )}
                          </div>
                        );
                      } else {
                        const boundsMap: Record<string, { w: number, h: number }> = {};
                        const calcBounds = (n: CompartmentNode, cw: number, ch: number) => {
                          boundsMap[n.id] = { w: cw, h: ch };
                          if (n.splitType === 'h' && n.child1 && n.child2) {
                            const val = n.splitValue || (ch - plyThickness) / 2;
                            calcBounds(n.child1, cw, val);
                            calcBounds(n.child2, cw, ch - val - plyThickness);
                          } else if (n.splitType === 'v' && n.child1 && n.child2) {
                            const val = n.splitValue || (cw - plyThickness) / 2;
                            calcBounds(n.child1, val, ch);
                            calcBounds(n.child2, cw - val - plyThickness, ch);
                          }
                        };
                        calcBounds(rootNode, width - 2 * plyThickness, height - 2 * plyThickness);
                        
                        const b = boundsMap[selectedNode.id];
                        const maxVal = selectedNode.splitType === 'h' ? (b.h - plyThickness) : (b.w - plyThickness);
                        const currentVal = selectedNode.splitValue || (maxVal / 2);
                        
                        return (
                          <div className="bg-white p-4 rounded-xl border border-indigo-500 ring-1 ring-indigo-500 shadow-sm space-y-4">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-xs font-bold text-slate-700 capitalize">
                                {isHindi ? 'चुना गया: ' : 'Selected: '} 
                                {selectedNode.dividerType === 'shelf' ? (isHindi ? 'शेल्फ' : 'Shelf') : 
                                 selectedNode.dividerType === 'partition' ? (isHindi ? 'पार्टीशन' : 'Partition') : 
                                 selectedNode.dividerType === 'dummy' ? (isHindi ? 'डमी' : 'Dummy') : ''}
                              </span>
                              <button onClick={() => removeInteriorElement(selectedNode.id)} className="text-rose-500 hover:text-rose-700 p-1 bg-rose-50 rounded">
                                <Trash2 size={14} />
                              </button>
                            </div>
                            
                            <div>
                              <label className="flex justify-between text-[10px] font-bold text-slate-500 mb-2 uppercase">
                                <span>{selectedNode.splitType === 'v' ? (isHindi ? 'बाएँ से दूरी (Inner Size)' : 'Left Size (Inner)') : (isHindi ? 'ऊपर से दूरी (Inner Size)' : 'Top Size (Inner)')}</span>
                              </label>
                              <div className="flex items-center gap-3">
                                <input 
                                  type="range" 
                                  min="0" 
                                  max={maxVal} 
                                  step="0.1"
                                  value={currentVal} 
                                  onChange={(e) => {
                                    const v = parseFloat(e.target.value);
                                    setRootNode(prev => updateNode(prev, selectedNode.id, n => ({ ...n, splitValue: v })));
                                  }}
                                  className="flex-1 accent-indigo-600"
                                />
                                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded px-2 py-1">
                                  <input
                                    type="number"
                                    min="0"
                                    max={maxVal}
                                    step="0.1"
                                    value={Number(currentVal.toFixed(1))}
                                    onChange={(e) => {
                                      let v = parseFloat(e.target.value) || 0;
                                      if (v > maxVal) v = maxVal;
                                      setRootNode(prev => updateNode(prev, selectedNode.id, n => ({ ...n, splitValue: v })));
                                    }}
                                    className="w-16 bg-transparent border-0 p-0 text-right text-xs font-bold text-slate-700 focus:ring-0"
                                  />
                                  <span className="text-[10px] font-bold text-slate-400">{unit}</span>
                                </div>
                              </div>
                            </div>
                            
                            {selectedNode.dividerType === 'dummy' && (
                              <div className="pt-3 border-t border-indigo-100">
                                <label className="flex justify-between items-center text-xs text-slate-700 font-medium">
                                  <span>{isHindi ? 'डमी चौड़ाई (Width)' : 'Dummy Width'}</span>
                                  <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded px-2 py-1">
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.1"
                                      value={selectedNode.dummyWidth || (unit === 'Inch' ? 1.5 : unit === 'CM' ? 3.5 : 35)}
                                      onChange={(e) => {
                                        let v = parseFloat(e.target.value) || 0;
                                        setRootNode(prev => updateNode(prev, selectedNode.id, n => ({ ...n, dummyWidth: v })));
                                      }}
                                      className="w-12 bg-transparent border-0 p-0 text-right text-xs focus:ring-0"
                                    />
                                    <span className="text-[10px] text-slate-400">{unit}</span>
                                  </div>
                                </label>
                              </div>
                            )}
                          </div>
                        );
                      }
                    })()}
                  </div>
                </div>
              </div>

              {/* Right Column (7/12): 2D Blueprint preview */}
              <div className="lg:col-span-7 flex flex-col md:flex-row gap-4 items-center justify-center">
                
                {/* Auto Generated Pristine 2D CAD Blueprint Layout */}
                <div className="flex flex-col items-center w-full">
                  <div className="flex justify-between items-center w-full max-w-[220px] mb-1.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 text-emerald-600">
                      <Layers size={11} />
                      {isHindi ? '2D डायग्राम' : '2D Diagram'}
                    </span>
                    <button
                      onClick={() => setShowDrawerFascia(!showDrawerFascia)}
                      className="text-[10px] flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded border border-slate-300 font-bold transition-colors"
                      title={isHindi ? 'दराज का फ्रंट पैनल दिखाएं/छिपाएं' : 'Toggle Drawer Front Panel'}
                    >
                      {showDrawerFascia ? (isHindi ? 'फ्रंट ऑफ' : 'Front Off') : (isHindi ? 'फ्रंट ऑन' : 'Front On')}
                    </button>
                  </div>
                  
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

                      {/* Draw interior tree recursively */}
                      {(() => {
                        const innerW = width - 2*plyThickness;
                        const innerH = height - 2*plyThickness;
                        const scaleX = 142 / innerW;
                        const scaleY = 222 / innerH;
                        
                        const renderTree = (node: CompartmentNode, rx: number, ry: number, rw: number, rh: number): React.ReactNode => {
                          const isSelected = selectedElementId === node.id;
                          
                          if (node.splitType === 'none') {
                            return (
                              <g key={node.id} onClick={() => setSelectedElementId(node.id)} className="cursor-pointer">
                                <rect 
                                  x={19 + rx * scaleX} 
                                  y={19 + ry * scaleY} 
                                  width={Math.max(rw * scaleX, 0)} 
                                  height={Math.max(rh * scaleY, 0)} 
                                  fill={isSelected ? 'rgba(59, 130, 246, 0.15)' : 'transparent'} 
                                  stroke={isSelected ? '#3b82f6' : 'transparent'}
                                  strokeWidth="1.5"
                                  className="hover:fill-blue-50/50 transition-colors"
                                />
                                {node.isDrawer && (
                                  <g pointerEvents="none">
                                    {showDrawerFascia ? (
                                      // Render Fascia
                                      (() => {
                                        const fW = node.drawerFasciaW || Math.max(rw - (unit === 'Inch' ? 0.25 : 6), 0);
                                        const fH = node.drawerFasciaH || Math.max(rh - (unit === 'Inch' ? 0.125 : 3), 0);
                                        const fx = rx + (rw - fW) / 2;
                                        const fy = ry + (rh - fH) / 2;
                                        return (
                                          <g>
                                            <rect 
                                              x={19 + fx * scaleX} 
                                              y={19 + fy * scaleY} 
                                              width={Math.max(fW * scaleX, 0)} 
                                              height={Math.max(fH * scaleY, 0)} 
                                              fill="#1e293b" stroke="#d97706" strokeWidth="1" 
                                            />
                                            <line 
                                              x1={19 + fx * scaleX + Math.max(fW * scaleX, 0) / 2 - 10} 
                                              y1={19 + fy * scaleY + Math.max(fH * scaleY, 0) / 2} 
                                              x2={19 + fx * scaleX + Math.max(fW * scaleX, 0) / 2 + 10} 
                                              y2={19 + fy * scaleY + Math.max(fH * scaleY, 0) / 2} 
                                              stroke="#f59e0b" strokeWidth="1.5" 
                                            />
                                          </g>
                                        );
                                      })()
                                    ) : (
                                      // Render Inner Box and Dummies
                                      (() => {
                                        const clearance = node.channelClearance || (unit === 'Inch' ? 1 : unit === 'CM' ? 2.5 : 25);
                                        const dumSide = node.drawerDummySide || 'none';
                                        const dumW = node.drawerDummyWidth || (unit === 'Inch' ? 1.5 : unit === 'CM' ? 3.5 : 35);
                                        const innerFrontH = node.drawerInnerFrontH || (unit === 'Inch' ? 3 : unit === 'CM' ? 7 : 70);
                                        
                                        let dumL = 0;
                                        let dumR = 0;
                                        if (dumSide === 'left' || dumSide === 'both') dumL = dumW;
                                        if (dumSide === 'right' || dumSide === 'both') dumR = dumW;
                                        
                                        const boxOuterW = Math.max(rw - dumL - dumR - clearance, 0);
                                        const bx = rx + dumL + clearance / 2;
                                        
                                        return (
                                          <g>
                                            {/* Left Dummy */}
                                            {dumL > 0 && (
                                              <rect x={19 + rx * scaleX} y={19 + ry * scaleY} width={Math.max(dumL * scaleX, 0)} height={Math.max(rh * scaleY, 0)} fill="#475569" stroke="#334155" strokeWidth="0.5" />
                                            )}
                                            {/* Right Dummy */}
                                            {dumR > 0 && (
                                              <rect x={19 + (rx + rw - dumR) * scaleX} y={19 + ry * scaleY} width={Math.max(dumR * scaleX, 0)} height={Math.max(rh * scaleY, 0)} fill="#475569" stroke="#334155" strokeWidth="0.5" />
                                            )}
                                            {/* Drawer Inner Box */}
                                            <rect x={19 + bx * scaleX} y={19 + (ry + (rh - innerFrontH) / 2) * scaleY} width={Math.max(boxOuterW * scaleX, 0)} height={Math.max(innerFrontH * scaleY, 0)} fill="none" stroke="#38bdf8" strokeWidth="1" strokeDasharray="2,2" />
                                            <text x={19 + bx * scaleX + Math.max(boxOuterW * scaleX, 0)/2} y={19 + (ry + (rh - innerFrontH) / 2) * scaleY + Math.max(innerFrontH * scaleY, 0)/2 + 2} fontSize="5" fill="#38bdf8" textAnchor="middle">BOX</text>
                                          </g>
                                        );
                                      })()
                                    )}
                                  </g>
                                )}
                              </g>
                            );
                          }
                          
                          if (node.splitType === 'h' && node.child1 && node.child2) {
                            const val = node.splitValue || (rh - plyThickness) / 2;
                            const yPos = ry + val;
                            return (
                              <g key={node.id}>
                                <rect 
                                  x={19 + rx * scaleX} 
                                  y={19 + yPos * scaleY} 
                                  width={rw * scaleX} 
                                  height={plyThickness * scaleY} 
                                  fill="#60a5fa" 
                                  onClick={() => setSelectedElementId(node.id)}
                                  className="cursor-pointer hover:fill-blue-400 transition-colors"
                                />
                                {isSelected && (
                                  <rect 
                                    x={19 + rx * scaleX - 1} 
                                    y={19 + yPos * scaleY - 1} 
                                    width={rw * scaleX + 2} 
                                    height={plyThickness * scaleY + 2} 
                                    fill="none" stroke="#3b82f6" strokeWidth="1.5"
                                    pointerEvents="none"
                                  />
                                )}
                                {renderTree(node.child1, rx, ry, rw, val)}
                                {renderTree(node.child2, rx, yPos + plyThickness, rw, rh - val - plyThickness)}
                              </g>
                            );
                          }
                          
                          if (node.splitType === 'v' && node.child1 && node.child2) {
                            const val = node.splitValue || (rw - plyThickness) / 2;
                            const xPos = rx + val;
                            const isDummy = node.dividerType === 'dummy';
                            return (
                              <g key={node.id}>
                                <rect 
                                  x={19 + xPos * scaleX} 
                                  y={19 + ry * scaleY} 
                                  width={plyThickness * scaleX} 
                                  height={rh * scaleY} 
                                  fill={isDummy ? "#cbd5e1" : "#a78bfa"} 
                                  onClick={() => setSelectedElementId(node.id)}
                                  className="cursor-pointer hover:opacity-80 transition-opacity"
                                />
                                {isSelected && (
                                  <rect 
                                    x={19 + xPos * scaleX - 1} 
                                    y={19 + ry * scaleY - 1} 
                                    width={plyThickness * scaleX + 2} 
                                    height={rh * scaleY + 2} 
                                    fill="none" stroke={isDummy ? "#94a3b8" : "#8b5cf6"} strokeWidth="1.5"
                                    pointerEvents="none"
                                  />
                                )}
                                {renderTree(node.child1, rx, ry, val, rh)}
                                {renderTree(node.child2, xPos + plyThickness, ry, rw - val - plyThickness, rh)}
                              </g>
                            );
                          }
                          return null;
                        };
                        
                        return renderTree(rootNode, 0, 0, innerW, innerH);
                      })()}

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
