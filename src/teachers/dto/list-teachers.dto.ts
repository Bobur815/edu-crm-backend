import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { Gender, TeacherStatus } from '@prisma/client';

export class ListTeachersDto {
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({ example: 'John' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  branchId?: number;

  @ApiPropertyOptional({ enum: TeacherStatus, example: TeacherStatus.ACTIVE })
  @IsOptional()
  @IsEnum(TeacherStatus)
  status?: TeacherStatus;

  @ApiPropertyOptional({ enum: Gender, example: Gender.MALE })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({ example: '+998901234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'email@example.com' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: 'fullname' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'fullname';

  @ApiPropertyOptional({ example: 'asc', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'asc';
}

export class TeacherResponseDto {
  @ApiPropertyOptional({ example: 1 })
  id: number;

  @ApiPropertyOptional({ example: '+998901234567' })
  phone: string;

  @ApiPropertyOptional({ example: 'teacher@example.com' })
  email?: string;

  @ApiPropertyOptional({ example: 'John Smith' })
  fullname: string;

  @ApiPropertyOptional({ enum: Gender, example: Gender.MALE })
  gender: Gender;

  @ApiPropertyOptional({ example: 'https://cdn.site/photo.jpg' })
  photo?: string;

  @ApiPropertyOptional({ example: '1990-05-10T00:00:00.000Z' })
  birthday?: Date;

  @ApiPropertyOptional({ example: 1 })
  branchId: number;

  @ApiPropertyOptional({ enum: TeacherStatus, example: TeacherStatus.ACTIVE })
  status: TeacherStatus;

  @ApiPropertyOptional({ example: 'IELTS instructor' })
  description?: string;

  @ApiPropertyOptional({ 
    example: {
      id: 1,
      name: 'Main Branch',
      region: 'Tashkent',
      district: 'Mirzo-Ulugbek',
      address: '123 Main St',
      phone: '+998712345678',
      status: 'ACTIVE'
    }
  })
  branch?: {
    id: number;
    name: string;
    region?: string;
    district?: string;
    address?: string;
    phone?: string;
    status: string;
  };

  @ApiPropertyOptional({
    example: [{
      id: 1,
      name: 'IELTS Group A',
      status: 'ONGOING',
      course: {
        id: 1,
        name: 'IELTS Preparation'
      }
    }]
  })
  groups?: Array<{
    id: number;
    name: string;
    status: string;
    course: {
      id: number;
      name: string;
    };
  }>;
}

export class ListTeachersResponseDto {
  @ApiPropertyOptional({ type: [TeacherResponseDto] })
  data: TeacherResponseDto[];

  @ApiPropertyOptional({ 
    example: {
      total: 100,
      page: 1,
      limit: 10,
      totalPages: 10
    }
  })
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class TeacherStatsDto {
  @ApiPropertyOptional({ example: 50 })
  totalTeachers: number;

  @ApiPropertyOptional({ example: 45 })
  activeTeachers: number;

  @ApiPropertyOptional({ example: 5 })
  inactiveTeachers: number;

  @ApiPropertyOptional({ example: 30 })
  maleTeachers: number;

  @ApiPropertyOptional({ example: 20 })
  femaleTeachers: number;

  @ApiPropertyOptional({ example: 25 })
  teachersWithGroups: number;

  @ApiPropertyOptional({ example: 120 })
  totalGroups: number;

  @ApiPropertyOptional({
    example: [{
      branchId: 1,
      branchName: 'Main Branch',
      teacherCount: 15
    }]
  })
  teachersByBranch: Array<{
    branchId: number;
    branchName: string;
    teacherCount: number;
  }>;
}