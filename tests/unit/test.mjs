// ES Module test file
import assert from 'assert';

// Test examples
const testParts = () => {
  const parts = Array(18).fill({ length: 800, width: 390, quantity: 1, name: "door", id: "P" });
  assert.strictEqual(parts.length, 18);
  console.log('✅ Parts test passed');
};

testParts();
