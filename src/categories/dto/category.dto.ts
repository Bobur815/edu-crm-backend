import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, MinLength } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Programming' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: 1, description: 'Branch ID this category belongs to' })
  @IsInt()
  branchId!: number;
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
