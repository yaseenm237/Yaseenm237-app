import React, { createContext, useContext } from 'react';
import { useCarpentryEngine } from '../hooks/useCarpentryEngine';

type CarpentryContextType = ReturnType<typeof useCarpentryEngine>;

const CarpentryContext = createContext<CarpentryContextType | null>(null);

export const CarpentryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const engine = useCarpentryEngine();
  return (
    <CarpentryContext.Provider value={engine}>
      {children}
    </CarpentryContext.Provider>
  );
};

export const useCarpentry = () => {
  const context = useContext(CarpentryContext);
  if (!context) {
    throw new Error('useCarpentry must be used within a CarpentryProvider');
  }
  return context;
};
