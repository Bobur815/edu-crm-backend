import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEmail, IsEnum, IsInt, IsOptional, IsString, MinLength } from 'class-validator';
import { Gender, TeacherStatus } from '@prisma/client';

export class CreateTeacherDto {
  @ApiProperty({ example: '+998901234567' })
  @IsString()
  phone!: string;

  @ApiPropertyOptional({ example: 'teacher@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: 'John Smith' })
  @IsString()
  fullname!: string;

  @ApiProperty({ enum: Gender, example: Gender.MALE })
  @IsEnum(Gender)
  gender!: Gender;

  @ApiPropertyOptional({ example: 'https://cdn.site/photo.jpg' })
  @IsOptional()
  @IsString()
  photo?: string;

  @ApiPropertyOptional({ example: '1990-05-10T00:00:00.000Z', description: 'Stored as timestamp' })
  @IsOptional()
  @IsDateString()
  birthday?: string;

  @ApiPropertyOptional({ example: 'secret123', minLength: 6 })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  branchId!: number;

  @ApiPropertyOptional({ enum: TeacherStatus, example: TeacherStatus.ACTIVE })
  @IsOptional()
  @IsEnum(TeacherStatus)
  status?: TeacherStatus;

  @ApiPropertyOptional({ example: 'IELTS instructor', description: 'Text field' })
  @IsOptional()
  @IsString()
  description?: string;
}
