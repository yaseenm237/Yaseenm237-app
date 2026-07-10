import * as Comlink from 'comlink';
import { runPacking } from './utils/packer';
import { KDTree } from './utils/KdTree';

const engine = {
  async runPackingJS(parts: any, settings: any) {
    try {
      console.log("[Worker] Running JS optimizer...");
      
      // Phase 1: Macro Nesting (MaxRects & Guillotine handled via runPacking)
      const res = runPacking(parts, settings);
      
      // Note: KDTree & Micro-Nesting integration will be implemented in future phases
      // using the exported KDTree to process remaining parts.
      
      return { status: 'success', result: res };
    } catch (error) {
      console.error("[Worker] Error in runPackingJS:", error);
      return {
        status: 'error',
        error: String(error),
      };
    }
  }
};

Comlink.expose(engine);
