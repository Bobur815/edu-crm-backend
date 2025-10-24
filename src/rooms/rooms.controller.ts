// src/rooms/rooms.controller.ts
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
  ValidationPipe,
  ParseArrayPipe
} from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { ListRoomsDto } from './dto/list-rooms.dto';

import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiBadRequestResponse,
  ApiQuery,
  ApiParam,
  ApiBody
} from '@nestjs/swagger';

import { UserRole, DayOfWeek } from '@prisma/client';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';

@ApiTags('Rooms')
@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  /** -------------------- CREATE (ADMIN/MANAGER) -------------------- */
  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Create a new room',
    description: 'Creates a new room in the specified branch. Validates branch existence and checks for duplicate room names within the branch.'
  })
  @ApiCreatedResponse({ 
    description: 'Room created successfully',
    schema: {
      example: {
        id: 1,
        branchId: 1,
        name: "Conference Room A",
        capacity: 25,
        description: "Main conference room with projector",
        branch: {
          id: 1,
          name: "Main Branch"
        },
        _count: {
          groups: 0
        },
        isAvailable: true,
        currentGroups: 0,
        utilizationRate: 0
      }
    }
  })
  @ApiConflictResponse({ description: 'Room name already exists in this branch' })
  @ApiBadRequestResponse({ description: 'Invalid input data or branch not found' })
  create(@Body() createRoomDto: CreateRoomDto) {
    return this.roomsService.create(createRoomDto);
  }

  /** -------------------- READ (Public) -------------------- */
  @Get()
  @ApiOperation({ 
    summary: 'List rooms with filtering and pagination',
    description: 'Retrieves a paginated list of rooms with optional filtering by branch, capacity, availability, and search terms.'
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' })
  @ApiQuery({ name: 'branchId', required: false, type: Number, description: 'Filter by branch ID' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search in room names' })
  @ApiQuery({ name: 'minCapacity', required: false, type: Number, description: 'Minimum room capacity' })
  @ApiQuery({ name: 'maxCapacity', required: false, type: Number, description: 'Maximum room capacity' })
  @ApiQuery({ name: 'available', required: false, type: Boolean, description: 'Filter by availability (no active groups)' })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['name', 'capacity', 'id'], description: 'Sort field' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], description: 'Sort order' })
  @ApiOkResponse({ 
    description: 'Rooms retrieved successfully',
    schema: {
      example: {
        data: [
          {
            id: 1,
            branchId: 1,
            name: "Conference Room A",
            capacity: 25,
            description: null,
            branch: { id: 1, name: "Main Branch" },
            _count: { groups: 2 },
            isAvailable: false,
            currentGroups: 2,
            utilizationRate: 80
          }
        ],
        meta: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1
        }
      }
    }
  })
  findAll(@Query(new ValidationPipe({ transform: true })) params: ListRoomsDto) {
    return this.roomsService.findAll(params);
  }

  @Get('statistics')
  @ApiOperation({ 
    summary: 'Get room statistics',
    description: 'Retrieves comprehensive statistics about rooms including capacity distribution, utilization metrics, and availability stats.'
  })
  @ApiQuery({ name: 'branchId', required: false, type: Number, description: 'Filter statistics by branch ID' })
  @ApiOkResponse({ 
    description: 'Room statistics retrieved successfully',
    schema: {
      example: {
        total: 15,
        totalCapacity: 450,
        averageCapacity: 30,
        utilizationStats: {
          totalGroups: 25,
          totalStudents: 340,
          averageUtilization: 76,
          underutilizedRooms: 3,
          overutilizedRooms: 2
        },
        capacityDistribution: {
          small: 5,
          medium: 8,
          large: 2
        },
        availabilityStats: {
          available: 5,
          fullyBooked: 3,
          partiallyBooked: 7
        }
      }
    }
  })
  getStatistics(@Query('branchId', new ParseIntPipe({ optional: true })) branchId?: number) {
    return this.roomsService.getStatistics(branchId);
  }

  @Post('check-availability')
  @ApiOperation({ 
    summary: 'Check room availability for specific days and time',
    description: 'Checks if a room is available for the specified days and time, returns conflicts if any.'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        roomId: { type: 'number', example: 1 },
        days: { type: 'array', items: { type: 'string', enum: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] }, example: ['MON', 'WED'] },
        startTime: { type: 'string', pattern: '^([0-1][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$', example: '09:00:00' },
        excludeGroupId: { type: 'number', description: 'Group ID to exclude from conflict check', example: 5 }
      },
      required: ['roomId', 'days', 'startTime']
    }
  })
  @ApiOkResponse({ 
    description: 'Availability check completed',
    schema: {
      example: {
        roomId: 1,
        roomName: "Conference Room A",
        isAvailable: false,
        conflictingGroups: [
          {
            id: 3,
            name: "Math Group A",
            days: ["MON", "WED"],
            time: "09:00:00"
          }
        ],
        availableTimeSlots: [
          {
            day: "MON",
            slots: ["10:00:00", "11:00:00", "14:00:00"]
          }
        ]
      }
    }
  })
  @ApiNotFoundResponse({ description: 'Room not found' })
  checkAvailability(@Body() body: {
    roomId: number;
    days: DayOfWeek[];
    startTime: string;
    excludeGroupId?: number;
  }) {
    return this.roomsService.checkAvailability(
      body.roomId,
      body.days,
      body.startTime,
      body.excludeGroupId
    );
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Get room details by ID',
    description: 'Retrieves detailed information about a specific room including groups, utilization metrics, and branch details.'
  })
  @ApiParam({ name: 'id', type: Number, description: 'Room ID' })
  @ApiOkResponse({ 
    description: 'Room details retrieved successfully',
    schema: {
      example: {
        id: 1,
        branchId: 1,
        name: "Conference Room A",
        capacity: 25,
        description: "Main conference room with projector",
        branch: {
          id: 1,
          name: "Main Branch",
          address: "123 Education St"
        },
        groups: [
          {
            id: 3,
            name: "Math Group A",
            status: "ONGOING",
            days: ["MON", "WED"],
            start_time: "09:00:00",
            start_date: "2025-01-15",
            end_date: "2025-06-15",
            _count: { students: 20 }
          }
        ],
        _count: { groups: 2 },
        utilizationMetrics: {
          totalGroups: 2,
          activeGroups: 2,
          totalStudents: 38,
          averageGroupSize: 19,
          capacityUtilization: 152,
          peakDaysUsage: {
            MON: 2, TUE: 0, WED: 2, THU: 1, FRI: 1, SAT: 0, SUN: 0
          }
        }
      }
    }
  })
  @ApiNotFoundResponse({ description: 'Room not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.roomsService.findOne(id);
  }

  /** -------------------- UPDATE (ADMIN/MANAGER) -------------------- */
  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ 
    summary: 'Update room information',
    description: 'Updates room details. Validates branch existence and checks for duplicate names if name is being changed.'
  })
  @ApiParam({ name: 'id', type: Number, description: 'Room ID to update' })
  @ApiOkResponse({ 
    description: 'Room updated successfully',
    schema: {
      example: {
        id: 1,
        branchId: 1,
        name: "Updated Conference Room A",
        capacity: 30,
        description: "Updated main conference room with new equipment",
        branch: { id: 1, name: "Main Branch" },
        _count: { groups: 2 }
      }
    }
  })
  @ApiNotFoundResponse({ description: 'Room not found' })
  @ApiConflictResponse({ description: 'Room name already exists in this branch' })
  @ApiBadRequestResponse({ description: 'Invalid input data or branch not found' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateRoomDto: UpdateRoomDto) {
    return this.roomsService.update(id, updateRoomDto);
  }

  /** -------------------- DELETE (ADMIN/MANAGER) -------------------- */
  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Delete a room',
    description: 'Deletes a room. Prevents deletion if room has active groups assigned to it.'
  })
  @ApiParam({ name: 'id', type: Number, description: 'Room ID to delete' })
  @ApiOkResponse({ 
    description: 'Room deleted successfully',
    schema: {
      example: {
        message: "Room deleted successfully"
      }
    }
  })
  @ApiNotFoundResponse({ description: 'Room not found' })
  @ApiConflictResponse({ description: 'Cannot delete room: it has active groups' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.roomsService.remove(id);
  }
}
