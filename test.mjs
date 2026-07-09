import fs from 'fs';
import init, { run_optimizer } from './packing_engine/pkg/packing_engine.js';

const wasmBuffer = fs.readFileSync('./packing_engine/pkg/packing_engine_bg.wasm');

async function main() {
  await init(wasmBuffer);
  const input = {
    stock: { length: 2440, width: 1220 },
    parts: [{ id: "1", name: "door", length: 800, width: 390, quantity: 18 }],
    settings: { kerf: 0, algo: "MaxRects", respectGrain: false }
  };
  const result = run_optimizer(input);
  console.log(`Used ${result.layouts.length} sheets`);
  for (const sheet of result.layouts) {
    console.log(`Sheet ${sheet.sheet_index}: ${sheet.parts.length} parts. Waste: ${sheet.waste_percent.toFixed(2)}%`);
  }
}
main();
