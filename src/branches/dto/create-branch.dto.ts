import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BranchStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateBranchDto {
  @ApiProperty({ example: 'Downtown Campus' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional({ example: 'Tashkent' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({ example: 'Yakkasaroy' })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional({ example: '12, Amir Temur Ave' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '+998 90 123 45 67' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ enum: BranchStatus, default: BranchStatus.ACTIVE })
  @IsOptional()
  @IsEnum(BranchStatus)
  status?: BranchStatus;
}
