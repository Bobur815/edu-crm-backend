// src/courses/courses.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { ListCoursesDto } from './dto/list-courses.dto';

import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiNotFoundResponse,
  ApiQuery,
} from '@nestjs/swagger';

import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';

@ApiTags('Courses')
@Controller('courses')
export class CoursesController {
  constructor(private readonly service: CoursesService) {}

  /** -------------------- CREATE (ADMIN/MANAGER) -------------------- */
  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create a course' })
  @ApiCreatedResponse({ description: 'Course created' })
  create(@Body() dto: CreateCourseDto) {
    return this.service.create(dto);
  }

  /** -------------------- READ (Public) -------------------- */
  @Get()
  @ApiOperation({ summary: 'List courses with pagination and filters' })
  @ApiOkResponse({ description: 'Array of courses with pagination' })
  findAll(@Query() params: ListCoursesDto) {
    return this.service.findAll(params);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get courses statistics' })
  @ApiQuery({ name: 'branchId', required: false, type: Number })
  @ApiOkResponse({ description: 'Course statistics' })
  getStatistics(@Query('branchId') branchId?: string) {
    return this.service.getStatistics(branchId ? Number(branchId) : undefined);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a course by id' })
  @ApiOkResponse({ description: 'Course found' })
  @ApiNotFoundResponse({ description: 'Course not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  /** -------------------- UPDATE (ADMIN/MANAGER) -------------------- */
  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update a course' })
  @ApiOkResponse({ description: 'Course updated' })
  @ApiNotFoundResponse({ description: 'Course not found' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCourseDto) {
    return this.service.update(id, dto);
  }

  /** -------------------- DELETE (ADMIN/MANAGER) -------------------- */
  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Delete a course' })
  @ApiOkResponse({ description: 'Course deleted' })
  @ApiNotFoundResponse({ description: 'Course not found' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
