'use strict';

// Prueba rápida local del runner: `node test-local.js`

const assert = require('assert');
const { runTestCases } = require('./runner');

// Caso 1: solución correcta
const ok = runTestCases({
  code: 'function solution(nums) { return nums.reduce((a, b) => a + b, 0); }',
  testCases: [
    { input: [1, 2, 3], expectedOutput: '6' },
    { input: [10, -4], expectedOutput: '6' },
  ],
});
assert.strictEqual(ok.allPassed, true, 'la suma debería pasar');

// Caso 2: solución incorrecta
const fail = runTestCases({
  code: 'function solution(nums) { return 0; }',
  testCases: [{ input: [1, 2, 3], expectedOutput: '6' }],
});
assert.strictEqual(fail.allPassed, false, 'la solución mala debería fallar');
assert.strictEqual(fail.results[0].actual, '0');

// Caso 3: loop infinito → timeout controlado
const loop = runTestCases({
  code: 'function solution() { while (true) {} }',
  testCases: [{ input: null, expectedOutput: 'x' }],
  timeoutMs: 1500,
});
assert.strictEqual(loop.results[0].timedOut, true, 'debería reportar timeout');

// Caso 4: error de sintaxis / sin función solution
const bad = runTestCases({
  code: 'const x = 1;',
  testCases: [{ input: null, expectedOutput: '1' }],
});
assert.strictEqual(bad.results[0].passed, false);
assert.ok(bad.results[0].stderr.includes('solution'), 'debería explicar el error');

console.log('runner.js: 4/4 casos OK');
