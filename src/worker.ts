import * as Comlink from 'comlink';
import init, { run_optimizer } from '../packing_engine/pkg/packing_engine';

const engine = {
  async runPacking(data: any) {
    try {
      await init();
      return run_optimizer(data);
    } catch (error) {
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
