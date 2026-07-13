import React from 'react';
import { getContrastColor } from '../utils/colors';

export const SmartBadge = ({ bgColor, text, className = '' }: { bgColor: string, text: string | number, className?: string }) => {
  const textColor = getContrastColor(bgColor);

  return (
    <div
      style={{
        backgroundColor: bgColor,
        color: textColor,
        width: 'fit-content',
        minWidth: '50px',
        padding: '4px 12px',
        borderRadius: '6px',
        fontWeight: 'bold',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        whiteSpace: 'nowrap',
      }}
      className={`text-xs ${className}`}
      title={String(text)}
    >
      {text}
    </div>
  );
};
