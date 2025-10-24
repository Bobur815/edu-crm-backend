import { IsOptional, IsString, IsNumber, IsEnum, IsDateString, IsBoolean } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { Gender, StudentStatus } from '@prisma/client';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class ListStudentsDto extends PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  branchId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  groupId?: number;

  @IsOptional()
  @IsEnum(StudentStatus)
  status?: StudentStatus;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  search?: string;

  @IsOptional()
  @IsDateString()
  birthdayFrom?: string;

  @IsOptional()
  @IsDateString()
  birthdayTo?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  hasEmail?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  hasPhone?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  enrolled?: boolean; // Has active group enrollments

  @IsOptional()
  @IsString()
  sortBy?: 'fullname' | 'birthday' | 'status' | 'id' = 'fullname';

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'asc';
}