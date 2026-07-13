import fs from 'fs';
let code = fs.readFileSync('src/components/LayoutVisualizerPanel.tsx', 'utf8');

code = code.replace(
  /const T = settings\.trimMargin; \/\/ Trim in mm/,
  \`const T = settings.trimMargin; // Trim in mm
  const trimEdges = settings.trimEdges || { top: true, bottom: true, left: true, right: true };
  const padTop = trimEdges.top ? T : 0;
  const padBottom = trimEdges.bottom ? T : 0;
  const padLeft = trimEdges.left ? T : 0;
  const padRight = trimEdges.right ? T : 0;\`
);

code = code.replace(
  /\{\/\* 2\. Trim Boundary Line \(dashed\) \*\/\}\\s*\{T > 0 && \(\\s*<rect\\s*x=\{pad \+ T\}\\s*y=\{pad \+ T\}\\s*width=\{rawLMm - 2 \* T\}\\s*height=\{rawWMm - 2 \* T\}/s,
  \`{/* 2. Trim Boundary Line (dashed) */}
                    {T > 0 && (
                      <rect 
                        x={pad + padLeft} 
                        y={pad + padTop} 
                        width={rawLMm - padLeft - padRight} 
                        height={rawWMm - padTop - padBottom}\`
);

code = code.replace(
  /<text\\s*x=\{pad \+ T \+ 4\}\\s*y=\{pad \+ T - 4\}\\s*fill="#64748b"\\s*fontSize="24"\\s*fontWeight="semibold"\\s*>/s,
  \`<text 
                        x={pad + Math.max(padLeft, 4)} 
                        y={pad + Math.max(padTop - 4, 20)} 
                        fill="#64748b" 
                        fontSize="24" 
                        fontWeight="semibold"
                      >\`
);

code = code.replace(
  /const wasteX = pad \+ T \+ waste\.x;/g,
  \`const wasteX = pad + padLeft + waste.x;\`
);

code = code.replace(
  /const wasteY = pad \+ T \+ waste\.y;/g,
  \`const wasteY = pad + padTop + waste.y;\`
);

code = code.replace(
  /const partX = pad \+ T \+ part\.x;/g,
  \`const partX = pad + padLeft + part.x;\`
);

code = code.replace(
  /const partY = pad \+ T \+ part\.y;/g,
  \`const partY = pad + padTop + part.y;\`
);

fs.writeFileSync('src/components/LayoutVisualizerPanel.tsx', code);
