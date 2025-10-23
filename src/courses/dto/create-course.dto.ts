import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { CourseStatus } from '@prisma/client';

export class CreateCourseDto {
  @IsInt() branchId: number;
  @IsInt() categoryId: number;
  @IsString() name: string;
  @IsEnum(CourseStatus) @IsOptional() status?: CourseStatus;
  @IsNumber() @Min(0) price: number;
  @IsInt() @Min(0) duration_hours: number;
  @IsInt() @Min(0) duration_months: number;
  @IsOptional() @IsString() description?: string;
}
