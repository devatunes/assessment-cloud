import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { AssessmentVisibility } from '../entities/assessment.entity';

export class LevelThresholdsDto {
  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @Min(0)
  @Max(100)
  junior?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @Min(0)
  @Max(100)
  semisenior?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @Min(0)
  @Max(100)
  senior?: number;
}

export class CreateAssessmentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    enum: AssessmentVisibility,
    description:
      'OFFICIAL (default): requiere invitación. PRACTICE: simulacro público en el catálogo de candidatos.',
  })
  @IsOptional()
  @IsEnum(AssessmentVisibility)
  visibility?: AssessmentVisibility;

  @ApiPropertyOptional({
    type: LevelThresholdsDto,
    description:
      'Score % mínimo para cada nivel (junior/semisenior/senior). Sin configurar = sin nivel calculado.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LevelThresholdsDto)
  levelThresholds?: LevelThresholdsDto;

  @ApiPropertyOptional({
    description: 'Duración total del examen en minutos desde que el candidato inicia. Sin límite si se omite.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  timeLimitMinutes?: number;

  @ApiProperty({
    type: [String],
    description: 'IDs de preguntas de la biblioteca, en el orden en que se presentarán',
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  questionIds: string[];
}
