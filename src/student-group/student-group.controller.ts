// src/student-group/student-group.controller.ts
import { Controller, Delete, Put } from '@nestjs/common';
import { UseGuards, Get, Post, Body, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Student, UserRole } from '@prisma/client';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { StudentGroupService } from './student-group.service';
import { StudentGroupDto, UpdateStudentGroupDto } from './dto/student-group.dto';


@Controller('student-group')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
export class StudentGroupController { 
    constructor(private readonly studentGroupService: StudentGroupService) {}

    @Get()
    @ApiOperation({ summary: 'List student groups' })
    @ApiResponse({ status: 200, description: 'List returned' })
    async findAll() {
        return this.studentGroupService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a student group by id' })
    @ApiResponse({ status: 200, description: 'Student group returned' })
    async findOne(@Param('id') id: number) {
        return this.studentGroupService.findOne(id);
    }

    @Post()
    @ApiOperation({ summary: 'Create a new student group' })
    @ApiResponse({ status: 201, description: 'Student group created' })
    async create(@Body() dto: StudentGroupDto) {
        return this.studentGroupService.create(dto);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update a student group' })
    @ApiResponse({ status: 200, description: 'Student group updated' })
    async update(@Param('id') id: number, @Body() dto: UpdateStudentGroupDto) {
        return this.studentGroupService.update(id, dto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a student group' })
    @ApiResponse({ status: 200, description: 'Student group deleted' })
    async remove(@Param('id') id: number) {
        return this.studentGroupService.remove(id);
    }
}