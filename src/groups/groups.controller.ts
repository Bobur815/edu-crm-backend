// src/groups/groups.controller.ts
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
  HttpStatus,
  HttpCode,
  ConflictException
} from '@nestjs/common';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { ListGroupsDto } from './dto/list-groups.dto';

import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiBadRequestResponse,
  ApiQuery
} from '@nestjs/swagger';

import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';

@ApiTags('Groups')
@Controller('groups')
export class GroupsController {
  constructor(private readonly service: GroupsService) {}

  /** -------------------- CREATE (ADMIN/MANAGER) -------------------- */
  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ 
    summary: 'Create a new group',
    description: 'Creates a new study group with course, teacher, room assignments and schedule'
  })
  @ApiCreatedResponse({ 
    description: 'Group created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        name: { type: 'string' },
        courseId: { type: 'number' },
        status: { type: 'string', enum: ['PLANNED', 'ONGOING', 'COMPLETED'] },
        days: { type: 'array', items: { type: 'string' } },
        start_time: { type: 'string', format: 'time' },
        start_date: { type: 'string', format: 'date' },
        end_date: { type: 'string', format: 'date' }
      }
    }
  })
  @ApiBadRequestResponse({ description: 'Invalid input data or business rule violation' })
  @ApiConflictResponse({ description: 'Schedule conflict or duplicate group name' })
  create(@Body() dto: CreateGroupDto) {
    return this.service.create(dto);
  }

  /** -------------------- READ -------------------- */
  @Get()
  @ApiOperation({ 
    summary: 'List groups with advanced filtering and pagination',
    description: 'Retrieve groups with filtering by branch, course, teacher, room, status, schedule, and search'
  })
  @ApiOkResponse({ 
    description: 'Paginated list of groups',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/GroupResponseDto' }
        },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            page: { type: 'number' },
            limit: { type: 'number' },
            totalPages: { type: 'number' }
          }
        }
      }
    }
  })
  findAll(@Query() params: ListGroupsDto) {
    return this.service.findAll(params);
  }

  @Get('statistics')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ 
    summary: 'Get group statistics',
    description: 'Retrieve comprehensive statistics about groups including status distribution, schedule patterns, and student counts'
  })
  @ApiQuery({ name: 'branchId', required: false, type: Number, description: 'Filter statistics by branch' })
  @ApiOkResponse({ 
    description: 'Group statistics',
    schema: {
      type: 'object',
      properties: {
        total: { type: 'number' },
        byStatus: {
          type: 'object',
          properties: {
            planned: { type: 'number' },
            ongoing: { type: 'number' },
            completed: { type: 'number' }
          }
        },
        byDays: {
          type: 'object',
          additionalProperties: { type: 'number' }
        },
        averageStudentsPerGroup: { type: 'number' },
        totalStudents: { type: 'number' }
      }
    }
  })
  getStatistics(@Query('branchId') branchId?: string) {
    return this.service.getStatistics(branchId ? Number(branchId) : undefined);
  }

  @Post('check-conflicts')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Check for schedule conflicts',
    description: 'Validate if a group schedule would conflict with existing teacher or room assignments'
  })
  @ApiOkResponse({ 
    description: 'Conflict check result',
    schema: {
      type: 'object',
      properties: {
        hasConflicts: { type: 'boolean' },
        conflicts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              conflictType: { type: 'string', enum: ['TEACHER_CONFLICT', 'ROOM_CONFLICT'] },
              conflictingGroupId: { type: 'number' },
              conflictingGroupName: { type: 'string' },
              conflictDays: { type: 'array', items: { type: 'string' } },
              conflictTime: { type: 'string' }
            }
          }
        }
      }
    }
  })
  @ApiConflictResponse({ description: 'Schedule conflicts detected' })
  async checkConflicts(@Body() dto: CreateGroupDto) {
    try {
      const conflicts = await this.service.checkScheduleConflicts(dto);
      return {
        hasConflicts: false,
        conflicts: []
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        return {
          hasConflicts: true,
          conflicts: error.getResponse()['conflicts'] || []
        };
      }
      throw error;
    }
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Get detailed group information',
    description: 'Retrieve comprehensive details about a specific group including students, course, teacher, and room information'
  })
  @ApiOkResponse({ 
    description: 'Detailed group information',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        name: { type: 'string' },
        status: { type: 'string' },
        course: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            name: { type: 'string' },
            price: { type: 'number' },
            duration_months: { type: 'number' }
          }
        },
        teacher: {
          type: 'object',
          nullable: true,
          properties: {
            id: { type: 'number' },
            fullname: { type: 'string' },
            phone: { type: 'string' }
          }
        },
        room: {
          type: 'object',
          nullable: true,
          properties: {
            id: { type: 'number' },
            name: { type: 'string' },
            capacity: { type: 'number' }
          }
        },
        students: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              fullname: { type: 'string' },
              phone: { type: 'string' }
            }
          }
        }
      }
    }
  })
  @ApiNotFoundResponse({ description: 'Group not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  /** -------------------- UPDATE (ADMIN/MANAGER) -------------------- */
  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ 
    summary: 'Update group information',
    description: 'Update group details including schedule, assignments, and status. Validates conflicts and business rules.'
  })
  @ApiOkResponse({ 
    description: 'Group updated successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        name: { type: 'string' },
        status: { type: 'string' },
        days: { type: 'array', items: { type: 'string' } },
        start_time: { type: 'string' },
        start_date: { type: 'string' },
        end_date: { type: 'string' }
      }
    }
  })
  @ApiNotFoundResponse({ description: 'Group not found' })
  @ApiBadRequestResponse({ description: 'Invalid update data or business rule violation' })
  @ApiConflictResponse({ description: 'Update would cause schedule conflicts' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateGroupDto) {
    return this.service.update(id, dto);
  }

  /** -------------------- DELETE (ADMIN/MANAGER) -------------------- */
  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ 
    summary: 'Delete a group',
    description: 'Delete a group if it has no enrolled students. Groups with students cannot be deleted for data integrity.'
  })
  @ApiOkResponse({ 
    description: 'Group deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Group deleted successfully' }
      }
    }
  })
  @ApiNotFoundResponse({ description: 'Group not found' })
  @ApiConflictResponse({ description: 'Cannot delete group with enrolled students' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
