import { IsEnum, IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { CourseStatus } from '@prisma/client';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class ListCoursesDto extends PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  branchId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  categoryId?: number;

  @IsOptional()
  @IsEnum(CourseStatus)
  status?: CourseStatus;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  minDuration?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  maxDuration?: number;
}