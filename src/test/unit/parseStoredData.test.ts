import * as assert from 'assert';
import { afterEach, describe, it } from 'mocha';
import sinon from 'sinon';
import { parseStoredData } from '../../extension';

describe('parseStoredData', () => {
  // Ensure all sinon stubs/spies are restored after each test
  afterEach(() => {
    sinon.restore();
  });

  describe('valid JSON with correct format', () => {
    it('should parse valid stored data', () => {
      const storedJson = JSON.stringify({
        originalColors: {
          'editorError.background': '#ff0000',
          'editorWarning.border': '#ffaa00',
        },
        transparentKeys: [
          'editorError.background',
          'editorWarning.border',
          'editorInfo.foreground',
        ],
      });

      const result = parseStoredData(storedJson);

      assert.deepStrictEqual(result.originalColors, {
        'editorError.background': '#ff0000',
        'editorWarning.border': '#ffaa00',
      });
      assert.deepStrictEqual(result.transparentKeys, [
        'editorError.background',
        'editorWarning.border',
        'editorInfo.foreground',
      ]);
    });

    it('should handle empty originalColors and transparentKeys', () => {
      const storedJson = JSON.stringify({
        originalColors: {},
        transparentKeys: [],
      });

      const result = parseStoredData(storedJson);

      assert.deepStrictEqual(result.originalColors, {});
      assert.deepStrictEqual(result.transparentKeys, []);
    });
  });

  describe('null/undefined input', () => {
    it('should return empty data for null', () => {
      const result = parseStoredData(null);

      assert.deepStrictEqual(result.originalColors, {});
      assert.deepStrictEqual(result.transparentKeys, []);
    });

    it('should return empty data for undefined', () => {
      const result = parseStoredData(undefined);

      assert.deepStrictEqual(result.originalColors, {});
      assert.deepStrictEqual(result.transparentKeys, []);
    });

    it('should return empty data for empty string', () => {
      const result = parseStoredData('');

      assert.deepStrictEqual(result.originalColors, {});
      assert.deepStrictEqual(result.transparentKeys, []);
    });
  });

  describe('invalid JSON', () => {
    it('should handle malformed JSON and log error', () => {
      const consoleErrorStub = sinon.stub(console, 'error');

      const result = parseStoredData('invalid json{');

      assert.deepStrictEqual(result.originalColors, {});
      assert.deepStrictEqual(result.transparentKeys, []);
      assert.ok(consoleErrorStub.called);
      assert.strictEqual(
        consoleErrorStub.firstCall.args[0],
        'Error parsing saved colors JSON:'
      );
    });

    it('should include context in error message when provided', () => {
      const consoleErrorStub = sinon.stub(console, 'error');

      parseStoredData('invalid json{', 'during cleanup');

      assert.ok(consoleErrorStub.called);
      assert.strictEqual(
        consoleErrorStub.firstCall.args[0],
        'Error parsing saved colors JSON during cleanup:'
      );
    });
  });

  describe('JSON primitives (manual edit edge cases)', () => {
    const testCases = [
      { value: '"hello"', description: 'string' },
      { value: '123', description: 'number' },
      { value: 'true', description: 'boolean' },
      { value: 'null', description: 'null' },
      { value: '[1, 2, 3]', description: 'array' },
    ];

    testCases.forEach(({ value, description }) => {
      it(`should handle JSON ${description} primitive`, () => {
        const result = parseStoredData(value);

        assert.deepStrictEqual(result.originalColors, {});
        assert.deepStrictEqual(result.transparentKeys, []);
      });
    });
  });

  describe('objects without required properties', () => {
    it('should return empty data for empty object', () => {
      const storedJson = JSON.stringify({});

      const result = parseStoredData(storedJson);

      assert.deepStrictEqual(result.originalColors, {});
      assert.deepStrictEqual(result.transparentKeys, []);
    });

    it('should return empty data for object with only originalColors', () => {
      const storedJson = JSON.stringify({
        originalColors: { 'editorError.background': '#ff0000' },
      });

      const result = parseStoredData(storedJson);

      assert.deepStrictEqual(result.originalColors, {});
      assert.deepStrictEqual(result.transparentKeys, []);
    });

    it('should return empty data for object with only transparentKeys', () => {
      const storedJson = JSON.stringify({
        transparentKeys: ['editorError.background'],
      });

      const result = parseStoredData(storedJson);

      assert.deepStrictEqual(result.originalColors, {});
      assert.deepStrictEqual(result.transparentKeys, []);
    });

    it('should return empty data for object with wrong property names', () => {
      const storedJson = JSON.stringify({
        colors: { 'editorError.background': '#ff0000' },
        keys: ['editorError.background'],
      });

      const result = parseStoredData(storedJson);

      assert.deepStrictEqual(result.originalColors, {});
      assert.deepStrictEqual(result.transparentKeys, []);
    });
  });

  describe('objects with wrong types', () => {
    it('should handle null originalColors', () => {
      const storedJson = JSON.stringify({
        originalColors: null,
        transparentKeys: ['editorError.background'],
      });

      const result = parseStoredData(storedJson);

      assert.deepStrictEqual(result.originalColors, {});
      assert.deepStrictEqual(result.transparentKeys, []);
    });

    it('should handle null transparentKeys', () => {
      const storedJson = JSON.stringify({
        originalColors: { 'editorError.background': '#ff0000' },
        transparentKeys: null,
      });

      const result = parseStoredData(storedJson);

      assert.deepStrictEqual(result.originalColors, {});
      assert.deepStrictEqual(result.transparentKeys, []);
    });

    it('should handle string originalColors', () => {
      const storedJson = JSON.stringify({
        originalColors: 'not an object',
        transparentKeys: [],
      });

      const result = parseStoredData(storedJson);

      assert.deepStrictEqual(result.originalColors, {});
      assert.deepStrictEqual(result.transparentKeys, []);
    });

    it('should handle number transparentKeys', () => {
      const storedJson = JSON.stringify({
        originalColors: {},
        transparentKeys: 123,
      });

      const result = parseStoredData(storedJson);

      assert.deepStrictEqual(result.originalColors, {});
      assert.deepStrictEqual(result.transparentKeys, []);
    });

    it('should handle array originalColors', () => {
      const storedJson = JSON.stringify({
        originalColors: ['not', 'an', 'object'],
        transparentKeys: [],
      });

      const result = parseStoredData(storedJson);

      assert.deepStrictEqual(result.originalColors, {});
      assert.deepStrictEqual(result.transparentKeys, []);
    });
  });

  describe('context parameter', () => {
    it('should include context in error messages', () => {
      const consoleErrorStub = sinon.stub(console, 'error');

      parseStoredData('invalid json{', 'during cleanup');

      assert.ok(consoleErrorStub.called);
      assert.strictEqual(
        consoleErrorStub.firstCall.args[0],
        'Error parsing saved colors JSON during cleanup:'
      );
    });

    it('should not include context prefix when context is not provided', () => {
      const consoleErrorStub = sinon.stub(console, 'error');

      parseStoredData('invalid json{');

      assert.ok(consoleErrorStub.called);
      assert.strictEqual(
        consoleErrorStub.firstCall.args[0],
        'Error parsing saved colors JSON:'
      );
    });

    it('should work correctly with context even for valid JSON', () => {
      const storedJson = JSON.stringify({
        originalColors: { 'editorError.background': '#ff0000' },
        transparentKeys: ['editorError.background'],
      });

      const result = parseStoredData(storedJson, 'during cleanup');

      assert.deepStrictEqual(result.originalColors, {
        'editorError.background': '#ff0000',
      });
      assert.deepStrictEqual(result.transparentKeys, ['editorError.background']);
    });
  });
});
