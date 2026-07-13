export const getContrastColor = (hex: string): string => {
  hex = hex.replace(/^#/, '');

  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }

  if (hex.length !== 6 && hex.length !== 8) {
    return '#000000'; 
  }

  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  
  if (isNaN(r) || isNaN(g) || isNaN(b)) {
     return '#000000'; 
  }

  const yiq = (r * 0.299 + g * 0.587 + b * 0.114);
  return yiq >= 128 ? '#000000' : '#FFFFFF';
};
