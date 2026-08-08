import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateAssessmentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    type: [String],
    description: 'IDs de preguntas de la biblioteca, en el orden en que se presentarán',
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  questionIds: string[];
}
