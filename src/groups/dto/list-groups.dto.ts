import { IsEnum, IsOptional, IsString, IsNumber, IsDateString, IsArray } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { GroupStatus, DayOfWeek } from '@prisma/client';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class ListGroupsDto extends PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  branchId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  courseId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  teacherId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  roomId?: number;

  @IsOptional()
  @IsEnum(GroupStatus)
  status?: GroupStatus;

  @IsOptional()
  @IsArray()
  @IsEnum(DayOfWeek, { each: true })
  @Transform(({ value }) => Array.isArray(value) ? value : [value])
  days?: DayOfWeek[];

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  search?: string;

  @IsOptional()
  @IsDateString()
  startDateFrom?: string;

  @IsOptional()
  @IsDateString()
  startDateTo?: string;

  @IsOptional()
  @IsDateString()
  endDateFrom?: string;

  @IsOptional()
  @IsDateString()
  endDateTo?: string;

  @IsOptional()
  @IsString()
  timeFrom?: string; // "09:00"

  @IsOptional()
  @IsString()
  timeTo?: string; // "18:00"
}