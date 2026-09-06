'use strict';

// Handler de la Lambda "assessment-executor".
// Recibe { code, testCases: [{ input, expectedOutput }], timeoutMs? }
// y devuelve { results: [...], allPassed } (ver runner.js).
// La función corre fuera de VPC, con rol IAM sin permisos y
// reserved_concurrent_executions bajo: sandbox barato y contenido.

const { runTestCases } = require('./runner');

exports.handler = async (event) => {
  return runTestCases(event);
};
