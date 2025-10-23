import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEmail, IsEnum, IsInt, IsObject, IsOptional, IsString, MinLength } from 'class-validator';
import { Gender, StudentStatus } from '@prisma/client';

export class CreateStudentDto {
  @ApiProperty({ example: 'Laylo Abdullayeva' })
  @IsString()
  fullname!: string;

  @ApiPropertyOptional({ example: 'student@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'secret123', minLength: 6 })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiPropertyOptional({ example: '+998931112233' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ enum: Gender, example: Gender.FEMALE })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({ example: 'https://cdn.site/photo.png' })
  @IsOptional()
  @IsString()
  photo?: string;

  @ApiPropertyOptional({ example: '2006-09-01', description: 'Stored as DATE' })
  @IsOptional()
  @IsDateString()
  birthday?: string;

  @ApiPropertyOptional({ enum: StudentStatus, example: StudentStatus.ACTIVE })
  @IsOptional()
  @IsEnum(StudentStatus)
  status?: StudentStatus;

  @ApiPropertyOptional({
    example: { parentName: 'Karimov Akmal', notes: 'Allergic to penicillin' },
    description: 'Arbitrary JSON data'
  })
  @IsOptional()
  @IsObject()
  other_details?: Record<string, any>;

  @ApiProperty({ example: 1 })
  @IsInt()
  branchId!: number;
}
