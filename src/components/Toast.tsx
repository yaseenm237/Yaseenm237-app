/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, Save, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'info';
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

export default function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div id="toast-root" className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            id={`toast-item-${toast.id}`}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95, transition: { duration: 0.2 } }}
            className="pointer-events-auto bg-slate-900/95 backdrop-blur-md text-white px-4 py-3.5 rounded-2xl shadow-xl border border-indigo-500/20 flex items-center justify-between gap-3 overflow-hidden group relative"
          >
            {/* Ambient subtle glow inside the Toast card */}
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-emerald-500/10 opacity-60 pointer-events-none" />
            
            <div className="flex items-center gap-3 relative z-10">
              <div className="p-1.5 bg-indigo-500/15 border border-indigo-500/20 rounded-xl text-indigo-400">
                {toast.type === 'success' ? (
                  <CheckCircle size={15} className="text-emerald-400" />
                ) : (
                  <Save size={15} className="text-indigo-400" />
                )}
              </div>
              <p className="text-xs font-semibold tracking-wide text-slate-200">
                {toast.message}
              </p>
            </div>

            <button
              onClick={() => onRemove(toast.id)}
              className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer relative z-10 p-0.5 rounded-md hover:bg-white/5"
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
