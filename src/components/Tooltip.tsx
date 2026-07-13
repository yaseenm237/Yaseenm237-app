import React, { useState } from 'react';

export const Tooltip = ({ children, content, className = '' }: { children: React.ReactNode, content: string | React.ReactNode, className?: string }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div 
      className={`relative inline-flex items-center max-w-full ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-slate-800 text-white text-xs rounded shadow-lg whitespace-nowrap z-[100] pointer-events-none">
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-slate-800" />
        </div>
      )}
    </div>
  );
};
