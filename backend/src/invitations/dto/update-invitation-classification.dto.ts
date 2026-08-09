import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { InvitationTrack } from '../entities/invitation.entity';

export class UpdateInvitationClassificationDto {
  @ApiPropertyOptional({ enum: InvitationTrack })
  @IsOptional()
  @IsEnum(InvitationTrack)
  track?: InvitationTrack;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  specialty?: string;
}
