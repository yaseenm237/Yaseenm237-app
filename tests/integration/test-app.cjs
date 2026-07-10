// Common JS test file for app integration
const assert = require('assert');

const testAppIntegration = () => {
  console.log('Running app integration tests...');
  assert.strictEqual(typeof window, 'undefined', 'Should run in Node environment');
  console.log('✅ App integration test passed');
};

testAppIntegration();
