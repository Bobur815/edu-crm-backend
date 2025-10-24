import { IsOptional, IsString, IsNumber, IsBoolean, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class ListRoomsDto extends PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  branchId?: number;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  minCapacity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(1000)
  maxCapacity?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  available?: boolean; // Filter by availability (no active groups)

  @IsOptional()
  @IsString()
  sortBy?: 'name' | 'capacity' | 'id' = 'name';

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'asc';
}