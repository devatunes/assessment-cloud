import { DataSource, DataSourceOptions } from 'typeorm';
import { Question } from '../questions/entities/question.entity';
import { QuestionOption } from '../questions/entities/question-option.entity';
import { Assessment } from '../assessments/entities/assessment.entity';
import { AssessmentQuestion } from '../assessments/entities/assessment-question.entity';
import { Attempt } from '../attempts/entities/attempt.entity';
import { AttemptAnswer } from '../attempts/entities/attempt-answer.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { User } from '../users/entities/user.entity';
import { Invitation } from '../invitations/entities/invitation.entity';
import { QuestionBank } from '../question-banks/entities/question-bank.entity';
import { QuestionBankItem } from '../question-banks/entities/question-bank-item.entity';

// Fuente de datos única, usada tanto por NestJS (app.module.ts) como por
// la CLI de TypeORM (migration:run/show) y por el arranque de la Lambda
// (DB_MIGRATIONS_RUN=true, ver bootstrap.ts).
export const typeOrmEntities = [
  Question,
  QuestionOption,
  Assessment,
  AssessmentQuestion,
  Attempt,
  AttemptAnswer,
  Organization,
  User,
  Invitation,
  QuestionBank,
  QuestionBankItem,
];

export function buildDataSourceOptions(): DataSourceOptions {
  const sslEnabled = (process.env.DB_SSL || 'false').toLowerCase() === 'true';

  return {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'assessment',
    password: process.env.DB_PASSWORD || 'assessment_local_dev',
    database: process.env.DB_NAME || 'assessment',
    entities: typeOrmEntities,
    migrations: [__dirname + '/../migrations/*{.ts,.js}'],
    migrationsRun: false,
    synchronize: false,
    logging: (process.env.DB_LOGGING || 'false').toLowerCase() === 'true',
    ssl: sslEnabled ? { rejectUnauthorized: false } : false,
  };
}

// Usado por la CLI de TypeORM (npm run typeorm / migration:*)
export default new DataSource(buildDataSourceOptions());
