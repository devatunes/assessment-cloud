import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class StartInvitationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  candidateName: string;
}
