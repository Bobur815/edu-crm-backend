import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole } from '@prisma/client';

export class ListUsersDto {
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

  @ApiPropertyOptional({ example: 'admin' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  branchId?: number;

  @ApiPropertyOptional({ enum: UserRole, example: UserRole.ADMIN })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ example: '+998901234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'admin@example.com' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: 'name' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'name';

  @ApiPropertyOptional({ example: 'asc', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'asc';
}

export class UserResponseDto {
  @ApiPropertyOptional({ example: 1 })
  id: number;

  @ApiPropertyOptional({ example: 'Admin User' })
  name: string;

  @ApiPropertyOptional({ example: 'admin@example.com' })
  email: string;

  @ApiPropertyOptional({ example: '+998901234567' })
  phone?: string;

  @ApiPropertyOptional({ example: 'https://cdn.site/avatar.png' })
  photo?: string;

  @ApiPropertyOptional({ enum: UserRole, example: UserRole.ADMIN })
  role: UserRole;

  @ApiPropertyOptional({ example: 1 })
  branchId?: number;

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
}

export class ListUsersResponseDto {
  @ApiPropertyOptional({ type: [UserResponseDto] })
  data: UserResponseDto[];

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

export class UserStatsDto {
  @ApiPropertyOptional({ example: 50 })
  totalUsers: number;

  @ApiPropertyOptional({ example: 5 })
  adminUsers: number;

  @ApiPropertyOptional({ example: 10 })
  managerUsers: number;

  @ApiPropertyOptional({ example: 25 })
  teacherUsers: number;

  @ApiPropertyOptional({ example: 10 })
  studentUsers: number;

  @ApiPropertyOptional({ example: 30 })
  usersWithBranch: number;

  @ApiPropertyOptional({ example: 20 })
  usersWithoutBranch: number;

  @ApiPropertyOptional({
    example: [{
      branchId: 1,
      branchName: 'Main Branch',
      userCount: 15
    }]
  })
  usersByBranch: Array<{
    branchId: number;
    branchName: string;
    userCount: number;
  }>;

  @ApiPropertyOptional({
    example: [{
      role: 'ADMIN',
      count: 5
    }]
  })
  usersByRole: Array<{
    role: string;
    count: number;
  }>;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'currentPassword123' })
  @IsString()
  @MinLength(6)
  currentPassword: string;

  @ApiProperty({ example: 'newPassword123' })
  @IsString()
  @MinLength(6)
  newPassword: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'newPassword123' })
  @IsString()
  @MinLength(6)
  newPassword: string;
}