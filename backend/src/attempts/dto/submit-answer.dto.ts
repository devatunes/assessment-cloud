import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class SubmitAnswerDto {
  @ApiPropertyOptional({ description: 'Selección múltiple: opción elegida' })
  @IsOptional()
  @IsUUID('4')
  selectedOptionId?: string;

  @ApiPropertyOptional({ description: 'Código: última versión escrita por el candidato' })
  @IsOptional()
  @IsString()
  code?: string;
}
