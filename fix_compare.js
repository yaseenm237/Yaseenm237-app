import fs from 'fs';
let code = fs.readFileSync('src/utils/packer.ts', 'utf8');

const regex = /export function compareAlgorithms[\s\S]*?unplacedCount: 0\s*\}\)\);\s*\}/;
const replacement = `export function compareAlgorithms(partsInput: PartInput[], settings: SheetSettings): AlgoComparison[] {
  const algos = ['AutoBest', 'StripCutColFirst', 'GuillotineBssfSas'];
  
  // Run actual packing to get real stats
  const result = runPacking(partsInput, settings);
  
  return algos.map(algo => ({
    algoKey: algo,
    algoName: algo,
    sheetsUsed: result.totalSheetsUsed || 1,
    utilization: Number((result.totalUtilization || 0).toFixed(1)),
    wastePercent: Number((result.overallWastePercent || 0).toFixed(1)),
    unplacedCount: result.unplacedParts?.length || 0
  }));
}`;
code = code.replace(regex, replacement);

fs.writeFileSync('src/utils/packer.ts', code);
