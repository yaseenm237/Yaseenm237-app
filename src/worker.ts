import * as Comlink from 'comlink';
import { runPacking } from './utils/packer';

const engine = {
  async runPackingJS(parts: any, settings: any) {
    try {
      console.log("[Worker] Running JS optimizer...");
      const res = runPacking(parts, settings);
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
