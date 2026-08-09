import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDefined,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { QuestionCategory, QuestionDifficulty, QuestionType } from '../entities/question.entity';
import { ContentVisibility } from '../../question-banks/entities/question-bank.entity';

export class CreateQuestionOptionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiProperty()
  @IsBoolean()
  isCorrect: boolean;
}

export class CreateQuestionTestCaseDto {
  @ApiProperty({
    description: 'Input que recibe la función solution(input)',
  })
  // Sin @IsDefined() acá, el ValidationPipe global (whitelist: true) elimina
  // esta propiedad por no tener NINGÚN decorador de class-validator (un valor
  // "cualquier JSON" no tiene un decorador de tipo propio) — @IsDefined()
  // solo exige que venga presente, sin restringir su tipo.
  @IsDefined()
  input: unknown;

  @ApiProperty({ description: 'Output esperado, comparado como string' })
  @IsString()
  expectedOutput: string;

  @ApiProperty({
    description: 'Si es true, el caso no se muestra al candidato (solo se usa al finalizar)',
  })
  @IsBoolean()
  hidden: boolean;
}

export class CreateQuestionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  statement: string;

  @ApiProperty({ enum: QuestionCategory })
  @IsEnum(QuestionCategory)
  category: QuestionCategory;

  @ApiProperty({ enum: QuestionDifficulty })
  @IsEnum(QuestionDifficulty)
  difficulty: QuestionDifficulty;

  @ApiProperty({ enum: QuestionType })
  @IsEnum(QuestionType)
  type: QuestionType;

  @ApiPropertyOptional({
    description: 'Por qué la respuesta correcta es correcta (y las demás no). Se muestra al candidato al finalizar.',
  })
  @IsOptional()
  @IsString()
  explanation?: string;

  @ApiPropertyOptional({
    enum: ContentVisibility,
    description: 'PRIVATE (default): solo tu organización. PUBLIC: visible para todas, de solo lectura.',
  })
  @IsOptional()
  @IsEnum(ContentVisibility)
  visibility?: ContentVisibility;

  @ApiPropertyOptional({ type: [CreateQuestionOptionDto] })
  @ValidateIf((dto: CreateQuestionDto) => dto.type === QuestionType.MULTIPLE_CHOICE)
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionOptionDto)
  options?: CreateQuestionOptionDto[];

  @ApiPropertyOptional()
  @ValidateIf((dto: CreateQuestionDto) => dto.type === QuestionType.CODE)
  @IsString()
  @IsNotEmpty()
  codeTemplate?: string;

  @ApiPropertyOptional({ type: [CreateQuestionTestCaseDto] })
  @ValidateIf((dto: CreateQuestionDto) => dto.type === QuestionType.CODE)
  @IsArray()
  @ArrayMinSize(1)
  // Tope duro: cada test case corre secuencialmente (hasta unos segundos c/u,
  // ver executor/runner.js) durante el scoring de CADA intento finalizado.
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionTestCaseDto)
  testCases?: CreateQuestionTestCaseDto[];
}
