# Tests

This directory contains all test files for the project, organized by test type.

## Test Files

### Unit Tests
- `unit/test.js` - Basic JavaScript unit tests
- `unit/test.mjs` - ES module format unit tests

### Integration Tests
- `integration/test-app.cjs` - Application integration tests (CommonJS format)
- `integration/test_packing.js` - Packing engine integration tests

## Running Tests

From the project root directory:

```bash
# Run all tests
npm test

# Run specific unit test
node tests/unit/test.js

# Run specific ES module test
node tests/unit/test.mjs

# Run integration tests
node tests/integration/test-app.cjs
node tests/integration/test_packing.js
```

## Test Organization

- **Unit Tests**: Test individual functions and components in isolation
- **Integration Tests**: Test how different parts of the system work together

## Adding New Tests

1. Create test files in the appropriate subdirectory
2. Follow naming convention: `test_*.js` or `*.test.js`
3. Use standard Node.js testing patterns or a testing framework
4. Update this README with new test descriptions
