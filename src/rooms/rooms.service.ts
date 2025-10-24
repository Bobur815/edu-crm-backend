// src/rooms/rooms.service.ts
import { 
  Injectable, 
  NotFoundException, 
  BadRequestException,
  ConflictException,
  Logger
} from '@nestjs/common';
import { Prisma, DayOfWeek } from '@prisma/client';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { ListRoomsDto } from './dto/list-rooms.dto';
import { 
  RoomResponseDto, 
  RoomsListResponseDto, 
  RoomDetailResponseDto,
  RoomStatisticsDto,
  RoomAvailabilityDto
} from './dto/room-response.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class RoomsService {
  private readonly logger = new Logger(RoomsService.name);

  constructor(private prisma: PrismaService) {}

  async create(data: CreateRoomDto): Promise<RoomResponseDto> {
    try {
      this.logger.log(`Creating room: ${data.name}`);
      
      // Validate that branch exists and is active
      await this.validateBranch(data.branchId);
      
      // Check for duplicate room name within the same branch
      const existingRoom = await this.prisma.room.findFirst({
        where: {
          branchId: data.branchId,
          name: data.name
        }
      });
      
      if (existingRoom) {
        throw new ConflictException(`Room with name '${data.name}' already exists in this branch`);
      }
      
      const room = await this.prisma.room.create({
        data,
        include: {
          branch: {
            select: { 
              id: true, 
              name: true 
            }
          },
          _count: {
            select: { groups: true }
          }
        }
      });

      this.logger.log(`Room created successfully with ID: ${room.id}`);
      return this.formatRoomResponse(room);
    } catch (error) {
      this.logger.error(`Failed to create room: ${error.message}`, error.stack);
      
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('A room with this name already exists in this branch');
        }
        if (error.code === 'P2003') {
          throw new BadRequestException('Invalid branch ID');
        }
      }
      
      throw error;
    }
  }

  async findAll(params: ListRoomsDto): Promise<RoomsListResponseDto> {
    try {
      const { 
        page = 1, 
        limit = 20, 
        branchId, 
        search,
        minCapacity,
        maxCapacity,
        available,
        sortBy = 'name',
        sortOrder = 'asc'
      } = params;
      
      // Build where clause for filtering
      const where: Prisma.RoomWhereInput = {
        ...(branchId && { branchId }),
        ...(search && {
          name: { contains: search, mode: 'insensitive' }
        }),
        ...(minCapacity !== undefined || maxCapacity !== undefined) && {
          capacity: {
            ...(minCapacity !== undefined && { gte: minCapacity }),
            ...(maxCapacity !== undefined && { lte: maxCapacity })
          }
        }
      };

      // Add availability filter if specified
      if (available !== undefined) {
        if (available) {
          // Only rooms with no active groups
          where.groups = {
            none: {
              status: {
                in: ['PLANNED', 'ONGOING']
              }
            }
          };
        } else {
          // Only rooms with active groups
          where.groups = {
            some: {
              status: {
                in: ['PLANNED', 'ONGOING']
              }
            }
          };
        }
      }

      // Build order by clause
      const orderBy: Prisma.RoomOrderByWithRelationInput = {};
      if (sortBy === 'name') {
        orderBy.name = sortOrder;
      } else if (sortBy === 'capacity') {
        orderBy.capacity = sortOrder;
      } else {
        orderBy.id = sortOrder;
      }

      const [rooms, total] = await Promise.all([
        this.prisma.room.findMany({
          where,
          include: {
            branch: {
              select: { 
                id: true, 
                name: true 
              }
            },
            _count: {
              select: { groups: true }
            }
          },
          orderBy,
          skip: (page - 1) * limit,
          take: limit
        }),
        this.prisma.room.count({ where })
      ]);

      const totalPages = Math.ceil(total / limit);

      // Calculate utilization for each room
      const roomsWithUtilization = await Promise.all(
        rooms.map(async (room) => {
          const utilization = await this.calculateRoomUtilization(room.id);
          return this.formatRoomResponse({
            ...room,
            isAvailable: room._count.groups === 0,
            currentGroups: room._count.groups,
            utilizationRate: utilization
          });
        })
      );

      this.logger.log(`Retrieved ${rooms.length} rooms (page ${page}/${totalPages})`);

      return {
        data: roomsWithUtilization,
        meta: {
          total,
          page,
          limit,
          totalPages
        }
      };
    } catch (error) {
      this.logger.error(`Failed to retrieve rooms: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findOne(id: number): Promise<RoomDetailResponseDto> {
    try {
      this.logger.log(`Retrieving room with ID: ${id}`);
      
      const room = await this.prisma.room.findUnique({
        where: { id },
        include: {
          branch: {
            select: { 
              id: true, 
              name: true,
              address: true 
            }
          },
          groups: {
            select: {
              id: true,
              name: true,
              status: true,
              days: true,
              start_time: true,
              start_date: true,
              end_date: true,
              _count: {
                select: { students: true }
              }
            },
            orderBy: { start_date: 'desc' }
          },
          _count: {
            select: { groups: true }
          }
        }
      });

      if (!room) {
        throw new NotFoundException(`Room with ID ${id} not found`);
      }

      // Calculate utilization metrics
      const utilizationMetrics = await this.calculateDetailedUtilization(id);

      this.logger.log(`Room retrieved successfully: ${room.name}`);
      return this.formatRoomDetailResponse(room, utilizationMetrics);
    } catch (error) {
      this.logger.error(`Failed to retrieve room ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async update(id: number, data: UpdateRoomDto): Promise<RoomResponseDto> {
    try {
      this.logger.log(`Updating room with ID: ${id}`);
      
      // Check if room exists
      await this.findOne(id);
      
      // Validate branch if it's being updated
      if (data.branchId) {
        await this.validateBranch(data.branchId);
      }
      
      // Check for duplicate name if name is being updated
      if (data.name) {
        const existingRoom = await this.prisma.room.findFirst({
          where: {
            branchId: data.branchId,
            name: data.name,
            id: { not: id }
          }
        });
        
        if (existingRoom) {
          throw new ConflictException(`Room with name '${data.name}' already exists in this branch`);
        }
      }
      
      const updatedRoom = await this.prisma.room.update({
        where: { id },
        data,
        include: {
          branch: {
            select: { 
              id: true, 
              name: true 
            }
          },
          _count: {
            select: { groups: true }
          }
        }
      });

      this.logger.log(`Room updated successfully: ${updatedRoom.name}`);
      return this.formatRoomResponse(updatedRoom);
    } catch (error) {
      this.logger.error(`Failed to update room ${id}: ${error.message}`, error.stack);
      
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('A room with this name already exists in this branch');
        }
        if (error.code === 'P2003') {
          throw new BadRequestException('Invalid branch ID');
        }
        if (error.code === 'P2025') {
          throw new NotFoundException(`Room with ID ${id} not found`);
        }
      }
      
      throw error;
    }
  }

  async remove(id: number): Promise<{ message: string }> {
    try {
      this.logger.log(`Deleting room with ID: ${id}`);
      
      // Check if room exists
      await this.findOne(id);
      
      // Check if room has active groups
      const activeGroups = await this.prisma.group.count({
        where: { 
          roomId: id,
          status: {
            in: ['PLANNED', 'ONGOING']
          }
        }
      });
      
      if (activeGroups > 0) {
        throw new ConflictException(`Cannot delete room: it has ${activeGroups} active groups`);
      }
      
      await this.prisma.room.delete({
        where: { id }
      });

      this.logger.log(`Room deleted successfully: ${id}`);
      return { message: 'Room deleted successfully' };
    } catch (error) {
      this.logger.error(`Failed to delete room ${id}: ${error.message}`, error.stack);
      
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Room with ID ${id} not found`);
        }
      }
      
      throw error;
    }
  }

  async getStatistics(branchId?: number): Promise<RoomStatisticsDto> {
    try {
      const where: Prisma.RoomWhereInput = branchId ? { branchId } : {};
      
      const [
        total,
        totalCapacityResult,
        utilizationData,
        capacityDistribution,
        availabilityData
      ] = await Promise.all([
        this.prisma.room.count({ where }),
        this.prisma.room.aggregate({
          where,
          _sum: { capacity: true },
          _avg: { capacity: true }
        }),
        this.calculateUtilizationStats(branchId),
        this.getCapacityDistribution(branchId),
        this.getAvailabilityStats(branchId)
      ]);

      return {
        total,
        totalCapacity: totalCapacityResult._sum.capacity || 0,
        averageCapacity: Math.round(totalCapacityResult._avg.capacity || 0),
        utilizationStats: utilizationData,
        capacityDistribution,
        availabilityStats: availabilityData
      };
    } catch (error) {
      this.logger.error(`Failed to get room statistics: ${error.message}`, error.stack);
      throw error;
    }
  }

  async checkAvailability(
    roomId: number, 
    days: DayOfWeek[], 
    startTime: string,
    excludeGroupId?: number
  ): Promise<RoomAvailabilityDto> {
    try {
      const room = await this.prisma.room.findUnique({
        where: { id: roomId },
        select: { id: true, name: true }
      });

      if (!room) {
        throw new NotFoundException(`Room with ID ${roomId} not found`);
      }

      const timeDate = new Date(`1970-01-01T${startTime}`);
      
      const conflictingGroups = await this.prisma.group.findMany({
        where: {
          roomId,
          days: { hasSome: days },
          start_time: timeDate,
          status: { in: ['PLANNED', 'ONGOING'] },
          ...(excludeGroupId && { id: { not: excludeGroupId } })
        },
        select: {
          id: true,
          name: true,
          days: true,
          start_time: true
        }
      });

      const isAvailable = conflictingGroups.length === 0;

      return {
        roomId: room.id,
        roomName: room.name,
        isAvailable,
        conflictingGroups: conflictingGroups.map(group => ({
          id: group.id,
          name: group.name,
          days: group.days,
          time: group.start_time ? this.formatTime(group.start_time) : 'Unknown'
        })),
        availableTimeSlots: isAvailable ? undefined : await this.getAvailableTimeSlots(roomId, days)
      };
    } catch (error) {
      this.logger.error(`Failed to check room availability: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async validateBranch(branchId: number): Promise<void> {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      select: { id: true, status: true }
    });

    if (!branch) {
      throw new BadRequestException(`Branch with ID ${branchId} not found`);
    }

    if (branch.status !== 'ACTIVE') {
      throw new BadRequestException(`Branch with ID ${branchId} is not active`);
    }
  }

  private async calculateRoomUtilization(roomId: number): Promise<number> {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      select: { capacity: true }
    });

    if (!room) return 0;

    const totalStudents = await this.prisma.studentGroup.count({
      where: {
        group: {
          roomId,
          status: { in: ['PLANNED', 'ONGOING'] }
        }
      }
    });

    return room.capacity > 0 ? Math.round((totalStudents / room.capacity) * 100) : 0;
  }

  private async calculateDetailedUtilization(roomId: number) {
    const [room, groupsData, daysUsage] = await Promise.all([
      this.prisma.room.findUnique({
        where: { id: roomId },
        select: { capacity: true }
      }),
      this.prisma.group.findMany({
        where: { roomId },
        include: {
          _count: { select: { students: true } }
        }
      }),
      this.getDaysUsageForRoom(roomId)
    ]);

    const totalGroups = groupsData.length;
    const activeGroups = groupsData.filter(g => ['PLANNED', 'ONGOING'].includes(g.status)).length;
    const totalStudents = groupsData.reduce((sum, group) => sum + group._count.students, 0);
    const averageGroupSize = totalGroups > 0 ? Math.round(totalStudents / totalGroups) : 0;
    const capacityUtilization = room?.capacity ? Math.round((totalStudents / room.capacity) * 100) : 0;

    return {
      totalGroups,
      activeGroups,
      totalStudents,
      averageGroupSize,
      capacityUtilization,
      peakDaysUsage: daysUsage
    };
  }

  private async calculateUtilizationStats(branchId?: number) {
    const where: Prisma.GroupWhereInput = {
      roomId: { not: null },
      ...(branchId && { branchId })
    };

    const [totalGroups, totalStudents, rooms] = await Promise.all([
      this.prisma.group.count({ where }),
      this.prisma.studentGroup.count({
        where: { group: where }
      }),
      this.prisma.room.findMany({
        where: branchId ? { branchId } : {},
        include: {
          groups: {
            where: { status: { in: ['PLANNED', 'ONGOING'] } },
            include: { _count: { select: { students: true } } }
          }
        }
      })
    ]);

    let underutilizedRooms = 0;
    let overutilizedRooms = 0;
    let totalUtilization = 0;

    for (const room of rooms) {
      const roomStudents = room.groups.reduce((sum, group) => sum + group._count.students, 0);
      const utilization = room.capacity > 0 ? (roomStudents / room.capacity) * 100 : 0;
      totalUtilization += utilization;

      if (utilization < 50) underutilizedRooms++;
      if (utilization > 90) overutilizedRooms++;
    }

    const averageUtilization = rooms.length > 0 ? Math.round(totalUtilization / rooms.length) : 0;

    return {
      totalGroups,
      totalStudents,
      averageUtilization,
      underutilizedRooms,
      overutilizedRooms
    };
  }

  private async getCapacityDistribution(branchId?: number) {
    const where: Prisma.RoomWhereInput = branchId ? { branchId } : {};
    
    const [small, medium, large] = await Promise.all([
      this.prisma.room.count({ where: { ...where, capacity: { lte: 20 } } }),
      this.prisma.room.count({ where: { ...where, capacity: { gte: 21, lte: 50 } } }),
      this.prisma.room.count({ where: { ...where, capacity: { gte: 51 } } })
    ]);

    return { small, medium, large };
  }

  private async getAvailabilityStats(branchId?: number) {
    const where: Prisma.RoomWhereInput = branchId ? { branchId } : {};
    
    const [available, fullyBooked, partiallyBookedCount] = await Promise.all([
      this.prisma.room.count({
        where: {
          ...where,
          groups: { none: { status: { in: ['PLANNED', 'ONGOING'] } } }
        }
      }),
      this.prisma.room.count({
        where: {
          ...where,
          groups: { every: { status: { in: ['PLANNED', 'ONGOING'] } } }
        }
      }),
      this.prisma.room.count({
        where: {
          ...where,
          groups: { some: { status: { in: ['PLANNED', 'ONGOING'] } } }
        }
      })
    ]);

    const fullyBookedCount = await this.prisma.room.count({
      where: {
        ...where,
        groups: { every: { status: { in: ['PLANNED', 'ONGOING'] } } }
      }
    });

    const partiallyBooked = partiallyBookedCount - fullyBookedCount;

    return { available, fullyBooked, partiallyBooked };
  }

  private async getDaysUsageForRoom(roomId: number): Promise<{ [day: string]: number }> {
    const groups = await this.prisma.group.findMany({
      where: { roomId, status: { in: ['PLANNED', 'ONGOING'] } },
      select: { days: true }
    });

    const daysCount: { [key: string]: number } = {
      MON: 0, TUE: 0, WED: 0, THU: 0, FRI: 0, SAT: 0, SUN: 0
    };

    groups.forEach(group => {
      group.days.forEach(day => {
        daysCount[day] = (daysCount[day] || 0) + 1;
      });
    });

    return daysCount;
  }

  private async getAvailableTimeSlots(roomId: number, days: DayOfWeek[]): Promise<{ day: string; slots: string[] }[]> {
    // This is a simplified implementation
    // In a real-world scenario, you'd want to define business hours and check against them
    const timeSlots = [
      '08:00:00', '09:00:00', '10:00:00', '11:00:00', '12:00:00',
      '13:00:00', '14:00:00', '15:00:00', '16:00:00', '17:00:00', '18:00:00'
    ];

    const availableSlots: { day: string; slots: string[] }[] = [];
    for (const day of days) {
      const daySlots: string[] = [];
      for (const slot of timeSlots) {
        const conflicts = await this.prisma.group.count({
          where: {
            roomId,
            days: { has: day },
            start_time: new Date(`1970-01-01T${slot}`),
            status: { in: ['PLANNED', 'ONGOING'] }
          }
        });
        if (conflicts === 0) {
          daySlots.push(slot);
        }
      }
      availableSlots.push({ day: day.toString(), slots: daySlots });
    }

    return availableSlots;
  }

  private formatRoomResponse(room: any): RoomResponseDto {
    return {
      id: room.id,
      branchId: room.branchId,
      name: room.name,
      capacity: room.capacity,
      description: room.description || null,
      branch: room.branch,
      _count: room._count,
      isAvailable: room.isAvailable,
      currentGroups: room.currentGroups,
      utilizationRate: room.utilizationRate
    };
  }

  private formatRoomDetailResponse(room: any, utilizationMetrics: any): RoomDetailResponseDto {
    return {
      id: room.id,
      branchId: room.branchId,
      name: room.name,
      capacity: room.capacity,
      description: room.description,
      branch: room.branch,
      groups: room.groups.map((group: any) => ({
        ...group,
        start_time: group.start_time ? this.formatTime(group.start_time) : null,
        start_date: group.start_date ? this.formatDate(group.start_date) : null,
        end_date: group.end_date ? this.formatDate(group.end_date) : null
      })),
      _count: room._count,
      utilizationMetrics
    };
  }

  private formatTime(time: Date): string {
    return time.toTimeString().slice(0, 8); // "HH:mm:ss"
  }

  private formatDate(date: Date): string {
    return date.toISOString().slice(0, 10); // "YYYY-MM-DD"
  }
}
