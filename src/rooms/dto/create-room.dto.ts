import { IsInt, IsString, IsOptional, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRoomDto {
  @ApiProperty({ example: 'Conference Room A' })
  @IsString()
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiProperty({ example: 50, description: 'Capacity of the room' })
  @IsInt()
  @Min(1, { message: 'Capacity must be at least 1' })
  @Max(1000, { message: 'Capacity cannot exceed 1000' })
  capacity: number;

  @ApiProperty({ example: 1, description: 'ID of the branch where the room is located' })
  @IsInt()
  branchId: number;

  @ApiProperty({ example: 'A spacious room suitable for meetings and conferences.', required: false })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  description?: string;
}