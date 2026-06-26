import React, { useState } from 'react';
import { Language } from '../types';
import { X, Calculator, Plus, Trash2, IndianRupee } from 'lucide-react';

interface EstimateItem {
  id: string;
  name: string;
  length: number;
  width: number;
  qty: number;
  rate: number;
}

interface EstimateCalculatorModalProps {
  onClose: () => void;
  language: Language;
}

export default function EstimateCalculatorModal({ onClose, language }: EstimateCalculatorModalProps) {
  const isHindi = language === 'Hindi';
  const [items, setItems] = useState<EstimateItem[]>([
    { id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2), name: '', length: 0, width: 0, qty: 1, rate: 0 }
  ]);

  const handleAddItem = () => {
    setItems([
      ...items,
      { id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2), name: '', length: 0, width: 0, qty: 1, rate: 0 }
    ]);
  };

  const handleUpdate = (id: string, field: keyof EstimateItem, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleRemove = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const calculateItem = (item: EstimateItem) => {
    const sqft = (item.length * item.width * item.qty) / 929.0304;
    return {
      sqft: sqft,
      cost: sqft * item.rate
    };
  };

  const totalCost = items.reduce((acc, item) => acc + calculateItem(item).cost, 0);
  const totalSqft = items.reduce((acc, item) => acc + calculateItem(item).sqft, 0);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Calculator className="text-emerald-600" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                {isHindi ? 'एस्टीमेट कैलकुलेटर' : 'Estimate Calculator'}
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                {isHindi ? 'सेंटीमीटर (cm) इनपुट देकर स्क्वायर फीट (Sq.Ft) में बिल बनाएं' : 'Enter dimensions in cm to calculate Sq.Ft billing'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 bg-white">
          <div className="space-y-3">
            {items.map((item, idx) => {
              const calc = calculateItem(item);
              return (
                <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="md:col-span-3">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {isHindi ? 'आइटम का नाम' : 'Item Name'}
                    </label>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => handleUpdate(item.id, 'name', e.target.value)}
                      className="w-full text-sm border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder={isHindi ? 'जैसे: वार्डरोब डोर' : 'e.g. Wardrobe Door'}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {isHindi ? 'लंबाई (cm)' : 'Length (cm)'}
                    </label>
                    <input
                      type="number"
                      value={item.length || ''}
                      onChange={(e) => handleUpdate(item.id, 'length', parseFloat(e.target.value) || 0)}
                      className="w-full text-sm border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {isHindi ? 'चौड़ाई (cm)' : 'Width (cm)'}
                    </label>
                    <input
                      type="number"
                      value={item.width || ''}
                      onChange={(e) => handleUpdate(item.id, 'width', parseFloat(e.target.value) || 0)}
                      className="w-full text-sm border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {isHindi ? 'मात्रा' : 'Qty'}
                    </label>
                    <input
                      type="number"
                      value={item.qty || ''}
                      onChange={(e) => handleUpdate(item.id, 'qty', parseInt(e.target.value) || 1)}
                      className="w-full text-sm border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {isHindi ? 'रेट (₹/SqFt)' : 'Rate (₹/SqFt)'}
                    </label>
                    <input
                      type="number"
                      value={item.rate || ''}
                      onChange={(e) => handleUpdate(item.id, 'rate', parseFloat(e.target.value) || 0)}
                      className="w-full text-sm border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                  <div className="md:col-span-1 flex flex-col justify-end text-right pb-2">
                    <span className="text-xs text-slate-500">{calc.sqft.toFixed(2)} SqFt</span>
                    <span className="text-sm font-bold text-slate-800">₹{calc.cost.toFixed(2)}</span>
                  </div>
                  <div className="md:col-span-1 flex justify-end pb-1">
                    <button
                      onClick={() => handleRemove(item.id)}
                      className="p-2 text-rose-400 hover:bg-rose-100 hover:text-rose-600 rounded-lg transition-colors"
                      title="Remove"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={handleAddItem}
            className="mt-4 flex items-center justify-center gap-2 w-full py-3.5 border-2 border-dashed border-emerald-200 text-emerald-600 rounded-xl hover:bg-emerald-50 hover:border-emerald-300 transition-colors font-medium text-sm"
          >
            <Plus size={18} />
            {isHindi ? 'नया आइटम जोड़ें' : 'Add New Item'}
          </button>
          
          <div className="mt-8 bg-slate-900 rounded-xl p-6 text-white flex justify-between items-center">
            <div>
              <p className="text-sm text-slate-400 font-medium mb-1">
                {isHindi ? 'कुल स्क्वायर फीट' : 'Total Square Feet'}
              </p>
              <p className="text-2xl font-bold">{totalSqft.toFixed(2)} Sq.Ft</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-400 font-medium mb-1">
                {isHindi ? 'फाइनल बिल' : 'Final Bill'}
              </p>
              <p className="text-3xl font-extrabold text-emerald-400 flex items-center justify-end gap-1">
                <IndianRupee size={24} /> {totalCost.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
