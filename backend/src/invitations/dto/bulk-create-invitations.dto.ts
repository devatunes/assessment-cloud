import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';
import { InvitationTrack } from '../entities/invitation.entity';

// Fila cruda de un CSV: deliberadamente MÁS laxa que CreateInvitationDto (que
// exige @IsEmail). Un CSV real trae filas mal formadas — se valida el email
// a mano por fila dentro de InvitationsService.createManyForAssessment, para
// poder reportar esa fila como fallo sin tumbar el resto del lote. Rechazar
// todo el body en el ValidationPipe por una fila (como haría @IsEmail acá)
// perdería justo el punto de la importación masiva.
export class BulkInvitationRowDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  candidateName?: string;

  @ApiPropertyOptional({ description: 'Se valida el formato en el servicio, no aquí (ver comentario arriba)' })
  @IsOptional()
  @IsString()
  candidateEmail?: string;

  @ApiPropertyOptional({ enum: InvitationTrack })
  @IsOptional()
  @IsEnum(InvitationTrack)
  track?: InvitationTrack;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  specialty?: string;
}

export class BulkCreateInvitationsDto {
  @ApiProperty({ type: [BulkInvitationRowDto], maxItems: 200 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => BulkInvitationRowDto)
  invitations: BulkInvitationRowDto[];
}
