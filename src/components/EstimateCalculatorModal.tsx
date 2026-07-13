import React, { useState } from 'react';
import { Language } from '../types';
import { X, Calculator, Plus, Trash2, IndianRupee, Save, Share2, FileText, Check, AlertCircle, Calendar, RefreshCw } from 'lucide-react';
import { useCarpentry } from '../context/CarpentryContext';

interface EstimateItem {
  id: string;
  name: string;
  length: number;
  width: number;
  qty: number;
  rate: number;
}

interface SavedEstimate {
  id: string;
  name: string;
  date: string;
  items: EstimateItem[];
}

interface EstimateCalculatorModalProps {
  onClose: () => void;
  language: Language;
}

export default function EstimateCalculatorModal({ onClose, language }: EstimateCalculatorModalProps) {
  const { settings } = useCarpentry();
  const unit = settings.unit;
  const isHindi = language === 'Hindi';
  const [activeTab, setActiveTab] = useState<'calculator' | 'history'>('calculator');
  const [items, setItems] = useState<EstimateItem[]>([
    { id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2), name: '', length: 0, width: 0, qty: 1, rate: 0 }
  ]);
  const [showFinalTotal, setShowFinalTotal] = useState(false);

  const [savedEstimates, setSavedEstimates] = useState<SavedEstimate[]>(() => {
    try {
      const stored = window.localStorage.getItem('carpentry_saved_estimates');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [estimateName, setEstimateName] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const handleAddItem = () => {
    setItems([
      ...items,
      { id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2), name: '', length: 0, width: 0, qty: 1, rate: 0 }
    ]);
  };

  const handleUpdate = (id: string, field: keyof EstimateItem, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
    setShowFinalTotal(false);
  };

  const handleRemove = (id: string) => {
    setItems(items.filter(item => item.id !== id));
    setShowFinalTotal(false);
  };

  const calculateItem = (item: EstimateItem) => {
    let divisor = 144; // Default for Inch
    if (unit === 'CM') divisor = 929.0304;
    if (unit === 'MM') divisor = 92903.04;
    
    const sqft = (item.length * item.width * item.qty) / divisor;
    return {
      sqft: sqft,
      cost: sqft * item.rate
    };
  };

  const totalCost = items.reduce((acc, item) => acc + calculateItem(item).cost, 0);
  const totalSqft = items.reduce((acc, item) => acc + calculateItem(item).sqft, 0);

  // Save calculation to local list
  const handleSaveEstimate = () => {
    const defaultName = isHindi 
      ? `बिल - ${new Date().toLocaleDateString('hi-IN')} (${new Date().toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' })})` 
      : `Estimate - ${new Date().toLocaleDateString()} (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;
    const trimmedName = estimateName.trim() || defaultName;

    const newSaved: SavedEstimate = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
      name: trimmedName,
      date: new Date().toISOString(),
      items: [...items]
    };

    const updated = [newSaved, ...savedEstimates];
    setSavedEstimates(updated);
    try {
      window.localStorage.setItem('carpentry_saved_estimates', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    setEstimateName('');
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Load calculation
  const handleLoadEstimate = (saved: SavedEstimate) => {
    setItems(saved.items);
    setActiveTab('calculator');
  };

  // Delete saved calculation
  const handleDeleteEstimate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedEstimates.filter(est => est.id !== id);
    setSavedEstimates(updated);
    try {
      window.localStorage.setItem('carpentry_saved_estimates', JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }
  };

  // Copy beautiful WhatsApp report to clipboard
  const handleCopyWhatsApp = () => {
    let text = "";
    if (isHindi) {
      text = `*📐 Sahira Interior - एस्टीमेट बिल 📐*\n\n`;
      text += `*दिनांक (Date):* ${new Date().toLocaleDateString()}\n`;
      text += `-------------------------------------------\n`;
      
      let count = 0;
      items.forEach((item) => {
        if (!item.name && !item.length && !item.width) return;
        count++;
        const calc = calculateItem(item);
        text += `*${count}. ${item.name || 'प्लाईवुड पार्ट'}*\n`;
        text += `   आकार: ${item.length} x ${item.width} cm | मात्रा: ${item.qty} नग\n`;
        text += `   क्षेत्रफल: ${calc.sqft.toFixed(2)} SqFt | रेट: ₹${item.rate}/SqFt\n`;
        text += `   *कीमत: ₹${calc.cost.toFixed(2)}*\n\n`;
      });

      if (count === 0) {
        alert('कृपया पहले कुछ डेटा दर्ज करें!');
        return;
      }

      text += `-------------------------------------------\n`;
      text += `*कुल क्षेत्रफल (Total Area):* ${totalSqft.toFixed(2)} Sq.Ft\n`;
      text += `*कुल फाइनल बिल (Total Bill):* *₹${totalCost.toFixed(2)}*\n\n`;
      text += `_साहिरा इंटीरियर - स्मार्ट बढ़ईगिरी ऑप्टिमाइज़र_`;
    } else {
      text = `*📐 Sahira Interior - Estimate Bill 📐*\n\n`;
      text += `*Date:* ${new Date().toLocaleDateString()}\n`;
      text += `-------------------------------------------\n`;
      
      let count = 0;
      items.forEach((item) => {
        if (!item.name && !item.length && !item.width) return;
        count++;
        const calc = calculateItem(item);
        text += `*${count}. ${item.name || 'Plywood Part'}*\n`;
        text += `   Size: ${item.length} x ${item.width} ${unit} | Qty: ${item.qty} pcs\n`;
        text += `   Area: ${calc.sqft.toFixed(2)} SqFt | Rate: ₹${item.rate}/SqFt\n`;
        text += `   *Price: ₹${calc.cost.toFixed(2)}*\n\n`;
      });

      if (count === 0) {
        alert('Please enter some data first!');
        return;
      }

      text += `-------------------------------------------\n`;
      text += `*Total Area:* ${totalSqft.toFixed(2)} Sq.Ft\n`;
      text += `*Grand Total:* *₹${totalCost.toFixed(2)}*\n\n`;
      text += `_Sahira Interior - Smart Carpentry Optimizer_`;
    }

    try {
      navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    } catch (err) {
      alert(isHindi ? 'कॉपी करने में विफल' : 'Failed to copy');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Calculator className="text-emerald-600" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                {isHindi ? 'एस्टीमेट कैलकुलेटर व रिकॉर्डर' : 'Estimate Calculator & Recorder'}
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                {isHindi 
                  ? `${unit} इनपुट देकर स्क्वायर फीट (Sq.Ft) बिल बनाएं और इसे सेव करें` 
                  : `Enter dimensions in ${unit} to calculate Sq.Ft billing and save estimates`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors cursor-pointer">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Tab Toggle Bar */}
        <div className="px-6 pt-3 border-b border-slate-100 bg-slate-50/30 flex gap-2">
          <button
            onClick={() => setActiveTab('calculator')}
            className={`pb-3 pt-2 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'calculator'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calculator size={16} />
            {isHindi ? 'कैलकुलेटर' : 'Calculator'}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 pt-2 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'history'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText size={16} />
            {isHindi ? 'कैलकुलेशन का इतिहास' : 'Calculation History'}
            <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full font-bold">
              {savedEstimates.length}
            </span>
          </button>
        </div>

        {/* Modal Body */}
        {activeTab === 'calculator' ? (
          <div className="p-6 overflow-y-auto flex-1 bg-white grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Calculation Sheet */}
            <div className="lg:col-span-8 flex flex-col gap-4">
              
              {/* Sizing/Inputs rows */}
              <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-1">
                {items.map((item, idx) => {
                  const calc = calculateItem(item);
                  return (
                    <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end bg-slate-50 p-3.5 rounded-xl border border-slate-200 transition-all hover:bg-slate-100/50">
                      <div className="md:col-span-4">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          {isHindi ? `आइटम #${idx+1} नाम` : `Item #${idx+1} Name`}
                        </label>
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleUpdate(item.id, 'name', e.target.value)}
                          className="w-full text-xs font-semibold border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                          placeholder={isHindi ? 'जैसे: वार्डरोब पल्ला' : 'e.g. Wardrobe Shutter'}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          {isHindi ? `लंबाई (${unit})` : `Length (${unit})`}
                        </label>
                        <input
                          type="number"
                          value={item.length || ''}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleUpdate(item.id, 'length', parseFloat(e.target.value) || 0)}
                          className="w-full text-xs font-mono border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          {isHindi ? `चौड़ाई (${unit})` : `Width (${unit})`}
                        </label>
                        <input
                          type="number"
                          value={item.width || ''}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleUpdate(item.id, 'width', parseFloat(e.target.value) || 0)}
                          className="w-full text-xs font-mono border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                      <div className="md:col-span-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          {isHindi ? 'मात्रा' : 'Qty'}
                        </label>
                        <input
                          type="number"
                          value={item.qty || ''}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleUpdate(item.id, 'qty', parseInt(e.target.value) || 1)}
                          className="w-full text-xs font-mono border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                      <div className="md:col-span-1.5 md:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          {isHindi ? 'रेट (₹/SqFt)' : 'Rate (₹/SqFt)'}
                        </label>
                        <input
                          type="number"
                          value={item.rate || ''}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleUpdate(item.id, 'rate', parseFloat(e.target.value) || 0)}
                          className="w-full text-xs font-mono border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                      <div className="md:col-span-1 flex flex-col justify-end text-right pb-1">
                        <span className="text-[10px] text-slate-400 font-bold font-mono">{calc.sqft.toFixed(1)} SqFt</span>
                        <span className="text-xs font-extrabold text-emerald-600">₹{calc.cost.toFixed(0)}</span>
                      </div>
                      <div className="md:col-span-1 flex justify-end">
                        <button
                          onClick={() => handleRemove(item.id)}
                          disabled={items.length <= 1}
                          className={`p-1.5 rounded-lg transition-colors ${
                            items.length <= 1 
                              ? 'text-slate-300 cursor-not-allowed' 
                              : 'text-rose-400 hover:bg-rose-100 hover:text-rose-600 cursor-pointer'
                          }`}
                          title="Remove row"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add row button */}
              <button
                onClick={handleAddItem}
                className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-emerald-200 text-emerald-600 rounded-xl hover:bg-emerald-50/50 hover:border-emerald-300 transition-colors font-bold text-xs cursor-pointer"
              >
                <Plus size={16} />
                {isHindi ? 'नया आइटम लाइन जोड़ें' : 'Add New Item Line'}
              </button>

              {/* Save current calculation controls */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-2 space-y-3">
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                  {isHindi ? 'वर्तमान कैलकुलेशन को सेव करें:' : 'Save Current Calculation:'}
                </label>
                <div className="flex gap-2.5">
                  <input
                    type="text"
                    value={estimateName}
                    onChange={(e) => setEstimateName(e.target.value)}
                    placeholder={isHindi ? 'कैलकुलेशन का नाम दर्ज करें (जैसे: वार्डरोब फ्रंट)' : 'Enter name for calculation (e.g. Wardrobe Front)'}
                    className="flex-1 text-xs border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <button
                    onClick={handleSaveEstimate}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow active:scale-95 cursor-pointer"
                  >
                    <Save size={14} />
                    {isHindi ? 'सेव करें' : 'Save'}
                  </button>
                </div>

                {saveSuccess && (
                  <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold bg-emerald-50 border border-emerald-100 rounded-lg p-2 animate-in fade-in">
                    <Check size={14} />
                    <span>{isHindi ? 'कैलकुलेशन सुरक्षित कर ली गई है!' : 'Calculation successfully saved!'}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Saved Estimates & Actions */}
            <div className="lg:col-span-4 flex flex-col gap-4 border-t lg:border-t-0 lg:border-l border-slate-100 lg:pl-6 pt-4 lg:pt-0">
              
              {/* Quick Share action */}
              <div className="bg-emerald-600 rounded-xl p-3 text-white flex flex-col gap-1.5 shadow-sm">
                <div className="flex items-center gap-1.5">
                  <Share2 size={14} />
                  <h4 className="text-[10px] font-bold uppercase tracking-wider">
                    {isHindi ? 'क्विक बिल शेयर' : 'Quick WhatsApp Share'}
                  </h4>
                </div>
                <button
                  onClick={handleCopyWhatsApp}
                  className="mt-1 w-full py-1.5 bg-white text-emerald-700 hover:bg-emerald-50 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  {copySuccess ? (
                    <>
                      <Check size={12} className="text-emerald-600" />
                      <span>{isHindi ? 'कॉपी हो गया!' : 'Copied!'}</span>
                    </>
                  ) : (
                    <>
                      <Share2 size={12} />
                      <span>{isHindi ? 'व्हाट्सएप बिल कॉपी करें' : 'Copy WhatsApp Bill'}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Mini Saved list preview */}
              <div className="flex-1 flex flex-col min-h-[180px]">
                <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Calendar size={13} className="text-emerald-500" />
                  {isHindi ? 'हाल ही में सुरक्षित बिल' : 'Recent Saved Bills'}
                </h3>
                {savedEstimates.slice(0, 3).map((est) => {
                  const estCost = est.items.reduce((acc, it) => acc + (((it.length * it.width * it.qty) / 929.0304) * it.rate), 0);
                  return (
                    <div
                      key={est.id}
                      onClick={() => handleLoadEstimate(est)}
                      className="p-2.5 mb-1.5 bg-slate-50 border border-slate-150 rounded-xl hover:border-emerald-500 hover:bg-emerald-50/10 cursor-pointer transition-all flex items-center justify-between text-xs"
                    >
                      <div className="truncate pr-2">
                        <span className="font-bold text-slate-800 truncate block">{est.name}</span>
                        <span className="text-[9px] text-slate-400 font-bold">{new Date(est.date).toLocaleDateString()}</span>
                      </div>
                      <span className="font-extrabold text-slate-700 shrink-0">₹{estCost.toFixed(0)}</span>
                    </div>
                  );
                })}
                {savedEstimates.length > 3 && (
                  <button
                    onClick={() => setActiveTab('history')}
                    className="text-xs text-indigo-600 font-bold mt-1.5 hover:underline text-left cursor-pointer"
                  >
                    {isHindi ? `सभी ${savedEstimates.length} रिकॉर्ड देखें →` : `View all ${savedEstimates.length} history records →`}
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Dedicated History Tab with detail records */
          <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  {isHindi ? 'सुरक्षित बिल इतिहास' : 'Saved Calculation Records'}
                </h3>
                <p className="text-xs text-slate-500">
                  {isHindi 
                    ? 'अपने पहले के बनाए गए एस्टीमेट रिकॉर्ड देखें, लोड करें या हटाएं' 
                    : 'Manage, review, reload or delete your historical estimation documents'}
                </p>
              </div>
            </div>

            {savedEstimates.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-16 bg-white border border-dashed border-slate-200 rounded-2xl max-w-lg mx-auto">
                <AlertCircle size={40} className="text-slate-300 mb-3" />
                <h4 className="text-sm font-bold text-slate-700">
                  {isHindi ? 'कोई रिकॉर्ड मौजूद नहीं है' : 'No history records found'}
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  {isHindi 
                    ? 'कृपया नए एस्टीमेट तैयार करके बाईं तरफ "सेव करें" बटन दबाएं।' 
                    : 'Create some estimate entries on the calculator tab and save them for instant retrieval.'}
                </p>
                <button
                  onClick={() => setActiveTab('calculator')}
                  className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer hover:bg-emerald-700"
                >
                  {isHindi ? 'कैलकुलेटर पर जाएं' : 'Go to Calculator'}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {savedEstimates.map((est) => {
                  const estSqft = est.items.reduce((acc, it) => acc + ((it.length * it.width * it.qty) / 929.0304), 0);
                  const estCost = est.items.reduce((acc, it) => acc + (((it.length * it.width * it.qty) / 929.0304) * it.rate), 0);

                  return (
                    <div 
                      key={est.id} 
                      className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow transition-all hover:border-emerald-400 flex flex-col justify-between"
                    >
                      <div>
                        {/* Record Header */}
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="text-sm font-bold text-slate-800">{est.name}</h4>
                            <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1 mt-0.5">
                              <Calendar size={10} />
                              {new Date(est.date).toLocaleDateString()} {new Date(est.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-black text-emerald-600 block">₹{estCost.toFixed(1)}</span>
                            <span className="text-[9px] text-slate-400 font-bold block">{estSqft.toFixed(1)} SqFt</span>
                          </div>
                        </div>

                        {/* Items preview */}
                        <div className="border-t border-slate-100 pt-2 pb-3 mt-2.5">
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">
                            {isHindi ? 'आइटम लिस्ट' : 'Item Breakdown'}
                          </p>
                          <div className="space-y-1 max-h-[100px] overflow-y-auto">
                            {est.items.map((item, i) => (
                              <div key={item.id || i} className="flex justify-between text-xs text-slate-600 font-medium">
                                <span className="truncate max-w-[70%]">{item.name || (isHindi ? `आइटम #${i+1}` : `Item #${i+1}`)}</span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {item.length}x{item.width}cm ({item.qty}n)
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="flex gap-2 border-t border-slate-100 pt-3 mt-auto">
                        <button
                          onClick={() => handleLoadEstimate(est)}
                          className="flex-1 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <RefreshCw size={12} />
                          {isHindi ? 'लोड करें और बदलें' : 'Load & Edit'}
                        </button>
                        <button
                          onClick={(e) => handleDeleteEstimate(est.id, e)}
                          className="px-3 py-1.5 border border-rose-200 hover:bg-rose-50 text-rose-500 hover:text-rose-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                          title={isHindi ? 'डिलीट करें' : 'Delete'}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Modal Footer (Total details & close) */}
        <div className="p-5 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center bg-slate-900 rounded-b-2xl text-white gap-4">
          <div className="flex gap-8 items-center">
            {!showFinalTotal ? (
              <button
                onClick={() => setShowFinalTotal(true)}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-extrabold transition-colors cursor-pointer text-center shadow-lg"
              >
                {isHindi ? 'कुल बिल की गणना करें' : 'Calculate Final Total'}
              </button>
            ) : (
              <>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">
                    {isHindi ? 'कुल क्षेत्रफल' : 'Total Area'}
                  </p>
                  <p className="text-xl font-extrabold text-slate-100">{totalSqft.toFixed(2)} Sq.Ft</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">
                    {isHindi ? 'फाइनल एस्टीमेट बिल' : 'Final Estimate Bill'}
                  </p>
                  <p className="text-2xl font-black text-emerald-400 flex items-center gap-0.5">
                    <IndianRupee size={20} /> {totalCost.toFixed(1)}
                  </p>
                </div>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white rounded-xl text-sm font-extrabold transition-colors border border-slate-700 cursor-pointer text-center"
          >
            {isHindi ? 'बंद करें' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
