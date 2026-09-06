import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ContentVisibility } from '../entities/question-bank.entity';

export class CreateQuestionBankDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    enum: ContentVisibility,
    description: 'PRIVATE (default): solo tu organización. PUBLIC: visible para todas, de solo lectura.',
  })
  @IsOptional()
  @IsEnum(ContentVisibility)
  visibility?: ContentVisibility;
}
