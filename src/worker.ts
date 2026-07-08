import * as Comlink from 'comlink';
import init, { run_optimizer } from '../packing_engine/pkg/packing_engine';
// @ts-expect-error - Vite asset url resolution suffix
import wasmUrl from '../packing_engine/pkg/packing_engine_bg.wasm?url';

const engine = {
  async runPacking(data: any) {
    console.log("[Worker] runPacking called with data:", JSON.stringify(data, null, 2));
    console.log("[Worker] Using WASM URL:", wasmUrl);
    try {
      console.log("[Worker] Initializing WASM...");
            const response = await fetch(wasmUrl);
      const buffer = await response.arrayBuffer();
      const initResult = await init(buffer);
      console.log("[Worker] WASM Initialized successfully:", initResult);
      
      console.log("[Worker] Running optimizer...");
      const res = run_optimizer(data);
      console.log("[Worker] Optimizer returned raw result:", JSON.stringify(res, null, 2));
      return res;
    } catch (error) {
      console.error("[Worker] Error in runPacking:", error);
      return {
        status: 'error',
        layouts: [],
        waste_percentage: 0,
        error: String(error),
      };
    }
  }
};

Comlink.expose(engine);
