const fs = require('fs');
const wasm = require('./packing_engine/pkg/packing_engine.js');

const input = {
  stock: { length: 2440, width: 1220 },
  parts: [{ id: "1", name: "door", length: 800, width: 390, quantity: 18 }],
  settings: { kerf: 0 }
};

const result = wasm.run_optimizer(input);
console.log(JSON.stringify(result, null, 2));
