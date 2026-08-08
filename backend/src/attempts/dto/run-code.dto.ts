import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RunCodeDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  code: string;
}
