import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'koffi@lycee-demo.tg' })
  @IsEmail()
  email: string;
}
