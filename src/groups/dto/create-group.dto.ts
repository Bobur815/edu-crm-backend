import { 
  IsArray, 
  IsDateString, 
  IsEnum, 
  IsInt, 
  IsOptional, 
  IsString, 
  Matches, 
  ArrayNotEmpty,
  ValidateIf 
} from 'class-validator';
import { Transform } from 'class-transformer';
import { DayOfWeek, GroupStatus } from '@prisma/client';

export class CreateGroupDto {
  @IsString()
  @Transform(({ value }) => value?.trim())
  name: string;

  @IsInt()
  courseId: number;

  @IsOptional()
  @IsInt()
  roomId?: number;

  @IsOptional()
  @IsInt()
  teacherId?: number;

  @IsEnum(GroupStatus)
  @IsOptional()
  status?: GroupStatus = GroupStatus.PLANNED;

  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(DayOfWeek, { each: true })
  days: DayOfWeek[];

  @IsOptional()
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/, {
    message: 'start_time must be in format HH:mm:ss (e.g., 09:00:00)'
  })
  start_time?: string;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  @ValidateIf((o) => o.start_date) // Only validate if start_date is provided
  end_date?: string;

  @IsInt()
  branchId: number;
}