import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { InvitationTrack } from '../entities/invitation.entity';

export class CreateInvitationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  candidateName?: string;

  // Obligatorio: sin correo, la invitación nunca aparece en el historial de
  // candidatos de la organización (se agrupa por email).
  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  candidateEmail!: string;

  @ApiPropertyOptional({ description: 'Días hasta que el link expire. Sin valor = nunca expira.' })
  @IsOptional()
  @IsInt()
  @Min(1)
  expiresInDays?: number;

  @ApiPropertyOptional({ enum: InvitationTrack })
  @IsOptional()
  @IsEnum(InvitationTrack)
  track?: InvitationTrack;

  @ApiPropertyOptional({ description: 'Especialidad libre dentro del track, ej: "Backend", "Automation"' })
  @IsOptional()
  @IsString()
  specialty?: string;
}
