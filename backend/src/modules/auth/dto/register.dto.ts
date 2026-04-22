import { IsEmail, IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../../common/enums/role.enum';

export class RegisterDto {
  @ApiProperty({ example: 'Koffi Amevor' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'koffi@lycee-demo.tg' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'StrongPass@123', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ enum: Role, example: Role.TEACHER })
  @IsEnum(Role)
  role: Role;

  @ApiProperty({ example: 'uuid-of-institution' })
  @IsString()
  @IsNotEmpty()
  institutionId: string;
}
