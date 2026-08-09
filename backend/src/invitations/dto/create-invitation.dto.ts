import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateInvitationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  candidateName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  candidateEmail?: string;

  @ApiPropertyOptional({ description: 'Días hasta que el link expire. Sin valor = nunca expira.' })
  @IsOptional()
  @IsInt()
  @Min(1)
  expiresInDays?: number;
}
