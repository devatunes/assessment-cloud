import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { QuestionDifficulty, QuestionType } from '../entities/question.entity';

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

  @ApiProperty({ example: 'javascript' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ enum: QuestionDifficulty })
  @IsEnum(QuestionDifficulty)
  difficulty: QuestionDifficulty;

  @ApiProperty({ enum: QuestionType })
  @IsEnum(QuestionType)
  type: QuestionType;

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
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionTestCaseDto)
  testCases?: CreateQuestionTestCaseDto[];
}
