import { PartialType } from "@nestjs/mapped-types";
import { IsNumber, IsString } from "class-validator";
import { ApiProperty } from '@nestjs/swagger';

export class StudentGroupDto {
    @ApiProperty({ example: 1, description: 'Unique identifier for the student-group relation' })
    @IsNumber()
    id: number;

    @ApiProperty({ example: 1, description: 'Unique identifier for the group' })
    @IsNumber()
    groupId: number;

    @ApiProperty({ example: 'student123', description: 'Unique identifier for the student' })
    @IsString()
    studentId: string;

    @ApiProperty({ example: 1, description: 'Unique identifier for the branch' })
    @IsNumber()
    branchId: number;
}

export class UpdateStudentGroupDto extends PartialType(StudentGroupDto) {}