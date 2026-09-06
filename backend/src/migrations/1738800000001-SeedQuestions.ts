import { MigrationInterface, QueryRunner } from 'typeorm';

// Datos de ejemplo: 5 preguntas de selección múltiple + 3 de código
// (con test cases visibles y ocultos) + 1 assessment que las agrupa.
// Corre automáticamente junto al esquema (DB_MIGRATIONS_RUN=true).
export class SeedQuestions1738800000001 implements MigrationInterface {
  name = 'SeedQuestions1738800000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const mcQuestions = [
      {
        title: '¿Qué método convierte un string JSON en un objeto JavaScript?',
        statement:
          'Selecciona el método correcto para parsear un string con formato JSON.',
        category: 'javascript',
        difficulty: 'EASY',
        options: [
          ['JSON.parse(str)', true],
          ['JSON.stringify(str)', false],
          ['JSON.decode(str)', false],
          ['Object.fromJSON(str)', false],
        ],
      },
      {
        title: '¿Cuál es el resultado de `typeof null` en JavaScript?',
        statement: 'Selecciona el valor que retorna typeof null.',
        category: 'javascript',
        difficulty: 'MEDIUM',
        options: [
          ['"object"', true],
          ['"null"', false],
          ['"undefined"', false],
          ['"number"', false],
        ],
      },
      {
        title: '¿Qué cláusula SQL filtra filas ANTES de agruparlas?',
        statement: 'Selecciona la cláusula que se aplica antes de GROUP BY.',
        category: 'sql',
        difficulty: 'EASY',
        options: [
          ['WHERE', true],
          ['HAVING', false],
          ['ORDER BY', false],
          ['GROUP BY', false],
        ],
      },
      {
        title: '¿Cuál es la complejidad temporal de una búsqueda binaria?',
        statement:
          'Selecciona la complejidad correcta para búsqueda binaria en un arreglo ordenado.',
        category: 'algorithms',
        difficulty: 'MEDIUM',
        options: [
          ['O(log n)', true],
          ['O(n)', false],
          ['O(n log n)', false],
          ['O(1)', false],
        ],
      },
      {
        title: '¿Qué servicio de AWS ejecuta código sin administrar servidores?',
        statement: 'Selecciona el servicio serverless de cómputo de AWS.',
        category: 'cloud',
        difficulty: 'EASY',
        options: [
          ['AWS Lambda', true],
          ['Amazon EC2', false],
          ['Amazon RDS', false],
          ['Amazon S3', false],
        ],
      },
    ];

    for (const q of mcQuestions) {
      const [{ id: questionId }] = await queryRunner.query(
        `INSERT INTO "question" (title, statement, category, difficulty, type)
         VALUES ($1, $2, $3, $4::question_difficulty_enum, 'MULTIPLE_CHOICE')
         RETURNING id`,
        [q.title, q.statement, q.category, q.difficulty],
      );

      let position = 0;
      for (const [text, isCorrect] of q.options) {
        await queryRunner.query(
          `INSERT INTO "question_option" (question_id, text, is_correct, position)
           VALUES ($1, $2, $3, $4)`,
          [questionId, text, isCorrect, position],
        );
        position += 1;
      }
    }

    const codeQuestions = [
      {
        title: 'Suma de un arreglo de números',
        statement:
          'Escribe la función `solution(nums)` que reciba un arreglo de números y retorne la suma de todos sus elementos.',
        category: 'javascript',
        difficulty: 'EASY',
        codeTemplate: 'function solution(nums) {\n  // tu código aquí\n}\n',
        testCases: [
          { input: [1, 2, 3], expectedOutput: '6', hidden: false },
          { input: [10, -4], expectedOutput: '6', hidden: false },
          { input: [], expectedOutput: '0', hidden: true },
        ],
      },
      {
        title: 'Invertir un string',
        statement:
          'Escribe la función `solution(str)` que reciba un string y retorne el string invertido.',
        category: 'javascript',
        difficulty: 'EASY',
        codeTemplate: 'function solution(str) {\n  // tu código aquí\n}\n',
        testCases: [
          { input: 'hola', expectedOutput: 'aloh', hidden: false },
          { input: 'abc', expectedOutput: 'cba', hidden: false },
          { input: '', expectedOutput: '', hidden: true },
        ],
      },
      {
        title: 'FizzBuzz',
        statement:
          'Escribe la función `solution(n)` que retorne un arreglo de strings del 1 al n, donde los múltiplos de 3 se reemplazan por "Fizz", los de 5 por "Buzz" y los de 15 por "FizzBuzz".',
        category: 'algorithms',
        difficulty: 'MEDIUM',
        codeTemplate: 'function solution(n) {\n  // tu código aquí\n}\n',
        testCases: [
          {
            input: 5,
            expectedOutput: '["1","2","Fizz","4","Buzz"]',
            hidden: false,
          },
          {
            input: 3,
            expectedOutput: '["1","2","Fizz"]',
            hidden: false,
          },
          {
            input: 15,
            expectedOutput:
              '["1","2","Fizz","4","Buzz","Fizz","7","8","Fizz","Buzz","11","Fizz","13","14","FizzBuzz"]',
            hidden: true,
          },
        ],
      },
    ];

    for (const q of codeQuestions) {
      await queryRunner.query(
        `INSERT INTO "question"
           (title, statement, category, difficulty, type, code_template, test_cases)
         VALUES ($1, $2, $3, $4::question_difficulty_enum, 'CODE', $5, $6::jsonb)`,
        [
          q.title,
          q.statement,
          q.category,
          q.difficulty,
          q.codeTemplate,
          JSON.stringify(q.testCases),
        ],
      );
    }

    // Assessment de ejemplo: las 5 preguntas de opción múltiple + las 3 de código
    const [{ id: assessmentId }] = await queryRunner.query(
      `INSERT INTO "assessment" (name, description)
       VALUES ($1, $2)
       RETURNING id`,
      [
        'Assessment de ejemplo — Fundamentos',
        'Evaluación de ejemplo generada por el seed inicial: fundamentos de JavaScript, SQL, algoritmos y cloud.',
      ],
    );

    const allQuestions = await queryRunner.query(
      `SELECT id FROM "question" ORDER BY created_at ASC`,
    );

    let position = 0;
    for (const row of allQuestions) {
      await queryRunner.query(
        `INSERT INTO "assessment_question" (assessment_id, question_id, position)
         VALUES ($1, $2, $3)`,
        [assessmentId, row.id, position],
      );
      position += 1;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "assessment_question"`);
    await queryRunner.query(`DELETE FROM "assessment"`);
    await queryRunner.query(`DELETE FROM "question_option"`);
    await queryRunner.query(`DELETE FROM "question"`);
  }
}
