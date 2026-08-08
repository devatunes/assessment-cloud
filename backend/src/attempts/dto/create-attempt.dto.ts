import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateAttemptDto {
  @ApiProperty()
  @IsUUID('4')
  assessmentId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  candidateName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  candidateEmail?: string;
}
