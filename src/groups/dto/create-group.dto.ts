import { IsArray, IsDateString, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { DayOfWeek, GroupStatus } from '@prisma/client';

export class CreateGroupDto {
  @IsString() name: string;
  @IsInt() courseId: number;
  @IsOptional() @IsInt() roomId?: number;
  @IsOptional() @IsInt() teacherId?: number;
  @IsEnum(GroupStatus) @IsOptional() status?: GroupStatus;

  @IsArray()
  @IsEnum(DayOfWeek, { each: true })
  days: DayOfWeek[];

  @IsOptional() @IsString() start_time?: string; // "09:00:00" (we’ll parse server-side)
  @IsOptional() @IsDateString() start_date?: string; // "2025-10-22"
  @IsOptional() @IsDateString() end_date?: string;
  @IsInt() branchId: number;
}
    