'use strict';

// Motor de ejecución de código JavaScript del candidato.
// Cada test case corre en un proceso Node aislado (spawnSync) con:
//  - timeout duro (default 5s) para cortar loops infinitos
//  - maxBuffer 1MB para cortar salidas gigantes
//  - env vacío: el código del candidato no ve variables de entorno
//    (en Lambda, además, el rol de la función no tiene ningún permiso AWS)
// El código del candidato debe definir una función `solution(input)`;
// el wrapper la invoca con el input del test case e imprime el resultado.

const { spawnSync } = require('child_process');

const DEFAULT_TIMEOUT_MS = 5000;
const MAX_TIMEOUT_MS = 10000;
const MAX_BUFFER_BYTES = 1024 * 1024;

function buildWrappedProgram(code, input) {
  return [
    code,
    ';(function () {',
    `  var __input = ${JSON.stringify(input === undefined ? null : input)};`,
    "  if (typeof solution !== 'function') {",
    "    console.error('El código debe definir una función solution(input)');",
    '    process.exit(1);',
    '  }',
    '  var __result = solution(__input);',
    "  if (__result !== null && typeof __result === 'object') {",
    '    console.log(JSON.stringify(__result));',
    '  } else {',
    '    console.log(String(__result));',
    '  }',
    '})();',
  ].join('\n');
}

function runSingleTestCase(code, testCase, timeoutMs) {
  const wrapped = buildWrappedProgram(code, testCase.input);

  const child = spawnSync(process.execPath, ['-e', wrapped], {
    timeout: timeoutMs,
    maxBuffer: MAX_BUFFER_BYTES,
    env: {},
    encoding: 'utf8',
  });

  const timedOut = Boolean(child.error && child.error.code === 'ETIMEDOUT');
  const actual = (child.stdout || '').trim();
  const expected = String(testCase.expectedOutput).trim();
  const stderr = (child.stderr || '').trim();
  const passed = !timedOut && child.status === 0 && actual === expected;

  return {
    input: testCase.input,
    expected,
    actual: timedOut ? '' : actual,
    stderr: timedOut ? `Tiempo de ejecución excedido (${timeoutMs} ms)` : stderr,
    timedOut,
    passed,
  };
}

function runTestCases(payload) {
  const code = payload && payload.code;
  const testCases = (payload && payload.testCases) || [];
  const timeoutMs = Math.min(
    payload && payload.timeoutMs ? Number(payload.timeoutMs) : DEFAULT_TIMEOUT_MS,
    MAX_TIMEOUT_MS,
  );

  if (typeof code !== 'string' || code.trim().length === 0) {
    return { results: [], allPassed: false, error: 'code es requerido' };
  }

  const results = testCases.map((testCase) =>
    runSingleTestCase(code, testCase, timeoutMs),
  );

  return {
    results,
    allPassed: results.length > 0 && results.every((r) => r.passed),
  };
}

module.exports = { runTestCases };
