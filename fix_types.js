import fs from 'fs';
let code = fs.readFileSync('src/types.ts', 'utf8');

code = code.replace(
  /trimMargin: number; \/\/ Trim in mm/,
  \`trimMargin: number; // Trim in mm
  trimEdges?: { top: boolean; bottom: boolean; left: boolean; right: boolean }; // Which edges to trim\`
);

fs.writeFileSync('src/types.ts', code);
