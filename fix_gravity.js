import fs from 'fs';
let code = fs.readFileSync('src/utils/packer.ts', 'utf8');

const regex = /\s*\/\/ Consolidation: Push towards Top-Left \(Gravity\).*?layout\.usedArea = layout\.parts\.reduce\(\(sum, p\) => sum \+ \(p\.w \* p\.h\), 0\);\s*\}/s;
code = code.replace(regex, `
  // Re-evaluate waste rectangles based on consolidated boundaries
  for (const layout of layouts) {
    layout.usedArea = layout.parts.reduce((sum, p) => sum + (p.w * p.h), 0);
  }`);

fs.writeFileSync('src/utils/packer.ts', code);
