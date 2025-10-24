// src/groups/groups.service.ts
import { 
  Injectable, 
  NotFoundException, 
  BadRequestException,
  ConflictException,
  Logger
} from '@nestjs/common';
import { Prisma, DayOfWeek } from '@prisma/client';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { ListGroupsDto } from './dto/list-groups.dto';
import { 
  GroupResponseDto, 
  GroupsListResponseDto, 
  GroupDetailResponseDto,
  GroupStatisticsDto,
  GroupScheduleConflictDto
} from './dto/group-response.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class GroupsService {
  private readonly logger = new Logger(GroupsService.name);

  constructor(private prisma: PrismaService) {}

  async create(data: CreateGroupDto): Promise<GroupResponseDto> {
    try {
      this.logger.log(`Creating group: ${data.name}`);
      
      // Validate dependencies
      await this.validateGroupDependencies(data);
      
      // Check for scheduling conflicts
      if (data.teacherId || data.roomId) {
        await this.checkScheduleConflicts(data);
      }
      
      // Convert time string to Time for Prisma
      const groupData = {
        ...data,
        start_time: data.start_time ? new Date(`1970-01-01T${data.start_time}`) : null,
        start_date: data.start_date ? new Date(data.start_date) : null,
        end_date: data.end_date ? new Date(data.end_date) : null,
      };
      
      const group = await this.prisma.group.create({
        data: groupData,
        include: {
          course: {
            select: { 
              id: true, 
              name: true, 
              price: true, 
              duration_months: true 
            }
          },
          room: {
            select: { 
              id: true, 
              name: true, 
              capacity: true 
            }
          },
          teacher: {
            select: { 
              id: true, 
              fullname: true, 
              phone: true 
            }
          },
          branch: {
            select: { 
              id: true, 
              name: true 
            }
          },
          _count: {
            select: { students: true }
          }
        }
      });

      this.logger.log(`Group created successfully with ID: ${group.id}`);
      return this.formatGroupResponse(group);
    } catch (error) {
      this.logger.error(`Failed to create group: ${error.message}`, error.stack);
      
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('A group with this name already exists in this branch');
        }
        if (error.code === 'P2003') {
          throw new BadRequestException('Invalid course, room, teacher, or branch ID');
        }
      }
      
      throw error;
    }
  }

  async findAll(params: ListGroupsDto): Promise<GroupsListResponseDto> {
    try {
      const { 
        page = 1, 
        limit = 20, 
        branchId, 
        courseId, 
        teacherId, 
        roomId, 
        status, 
        days, 
        search,
        startDateFrom,
        startDateTo,
        endDateFrom,
        endDateTo,
        timeFrom,
        timeTo
      } = params;
      
      // Build where clause for filtering
      const where: Prisma.GroupWhereInput = {
        ...(branchId && { branchId }),
        ...(courseId && { courseId }),
        ...(teacherId && { teacherId }),
        ...(roomId && { roomId }),
        ...(status && { status }),
        ...(days && days.length > 0 && { 
          days: { 
            hasSome: days 
          } 
        }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { course: { name: { contains: search, mode: 'insensitive' } } },
            { teacher: { fullname: { contains: search, mode: 'insensitive' } } }
          ]
        }),
        ...(startDateFrom && startDateTo && {
          start_date: {
            gte: new Date(startDateFrom),
            lte: new Date(startDateTo)
          }
        }),
        ...(endDateFrom && endDateTo && {
          end_date: {
            gte: new Date(endDateFrom),
            lte: new Date(endDateTo)
          }
        }),
        ...(timeFrom && timeTo && {
          start_time: {
            gte: new Date(`1970-01-01T${timeFrom}:00`),
            lte: new Date(`1970-01-01T${timeTo}:00`)
          }
        })
      };

      const [groups, total] = await Promise.all([
        this.prisma.group.findMany({
          where,
          include: {
            course: {
              select: { 
                id: true, 
                name: true, 
                price: true, 
                duration_months: true 
              }
            },
            room: {
              select: { 
                id: true, 
                name: true, 
                capacity: true 
              }
            },
            teacher: {
              select: { 
                id: true, 
                fullname: true, 
                phone: true 
              }
            },
            _count: {
              select: { students: true }
            }
          },
          orderBy: { id: 'desc' },
          skip: (page - 1) * limit,
          take: limit
        }),
        this.prisma.group.count({ where })
      ]);

      const totalPages = Math.ceil(total / limit);

      this.logger.log(`Retrieved ${groups.length} groups (page ${page}/${totalPages})`);

      return {
        data: groups.map(group => this.formatGroupResponse(group)),
        meta: {
          total,
          page,
          limit,
          totalPages
        }
      };
    } catch (error) {
      this.logger.error(`Failed to retrieve groups: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findOne(id: number): Promise<GroupDetailResponseDto> {
    try {
      this.logger.log(`Retrieving group with ID: ${id}`);
      
      const group = await this.prisma.group.findUnique({
        where: { id },
        include: {
          course: {
            select: { 
              id: true, 
              name: true, 
              price: true, 
              duration_months: true,
              duration_hours: true,
              description: true 
            }
          },
          room: {
            select: { 
              id: true, 
              name: true, 
              capacity: true
            }
          },
          teacher: {
            select: { 
              id: true, 
              fullname: true, 
              phone: true,
              email: true 
            }
          },
          branch: {
            select: { 
              id: true, 
              name: true,
              address: true 
            }
          },
          _count: {
            select: { students: true }
          },
          students: {
            select: {
              student: {
                select: {
                  id: true,
                  fullname: true,
                  phone: true
                }
              }
            }
          }
        }
      });

      if (!group) {
        throw new NotFoundException(`Group with ID ${id} not found`);
      }

      this.logger.log(`Group retrieved successfully: ${group.name}`);
      return this.formatGroupDetailResponse(group);
    } catch (error) {
      this.logger.error(`Failed to retrieve group ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async update(id: number, data: UpdateGroupDto): Promise<GroupResponseDto> {
    try {
      this.logger.log(`Updating group with ID: ${id}`);
      
      // Check if group exists
      const existingGroup = await this.findOne(id);
      
      // Validate dependencies if they're being updated
      if (data.courseId || data.branchId || data.teacherId || data.roomId) {
        await this.validateGroupDependencies({
          ...existingGroup,
          ...data
        } as CreateGroupDto);
      }
      
      // Check for scheduling conflicts if relevant fields are being updated
      if (data.teacherId !== undefined || data.roomId !== undefined || data.days || data.start_time) {
        await this.checkScheduleConflicts({
          ...existingGroup,
          ...data
        } as CreateGroupDto, id);
      }
      
      // Convert time string to Time for Prisma
      const updateData = {
        ...data,
        ...(data.start_time && { start_time: new Date(`1970-01-01T${data.start_time}`) }),
        ...(data.start_date && { start_date: new Date(data.start_date) }),
        ...(data.end_date && { end_date: new Date(data.end_date) }),
      };
      
      const updatedGroup = await this.prisma.group.update({
        where: { id },
        data: updateData,
        include: {
          course: {
            select: { 
              id: true, 
              name: true, 
              price: true, 
              duration_months: true 
            }
          },
          room: {
            select: { 
              id: true, 
              name: true, 
              capacity: true 
            }
          },
          teacher: {
            select: { 
              id: true, 
              fullname: true, 
              phone: true 
            }
          },
          branch: {
            select: { 
              id: true, 
              name: true 
            }
          },
          _count: {
            select: { students: true }
          }
        }
      });

      this.logger.log(`Group updated successfully: ${updatedGroup.name}`);
      return this.formatGroupResponse(updatedGroup);
    } catch (error) {
      this.logger.error(`Failed to update group ${id}: ${error.message}`, error.stack);
      
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('A group with this name already exists in this branch');
        }
        if (error.code === 'P2003') {
          throw new BadRequestException('Invalid course, room, teacher, or branch ID');
        }
        if (error.code === 'P2025') {
          throw new NotFoundException(`Group with ID ${id} not found`);
        }
      }
      
      throw error;
    }
  }

  async remove(id: number): Promise<{ message: string }> {
    try {
      this.logger.log(`Deleting group with ID: ${id}`);
      
      // Check if group exists
      await this.findOne(id);
      
      // Check if group has students
      const studentCount = await this.prisma.studentGroup.count({
        where: { groupId: id }
      });
      
      if (studentCount > 0) {
        throw new ConflictException(`Cannot delete group: it has ${studentCount} enrolled students`);
      }
      
      await this.prisma.group.delete({
        where: { id }
      });

      this.logger.log(`Group deleted successfully: ${id}`);
      return { message: 'Group deleted successfully' };
    } catch (error) {
      this.logger.error(`Failed to delete group ${id}: ${error.message}`, error.stack);
      
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Group with ID ${id} not found`);
        }
      }
      
      throw error;
    }
  }

  async getStatistics(branchId?: number): Promise<GroupStatisticsDto> {
    try {
      const where: Prisma.GroupWhereInput = branchId ? { branchId } : {};
      
      const [total, planned, ongoing, completed, daysStats, totalStudents] = await Promise.all([
        this.prisma.group.count({ where }),
        this.prisma.group.count({ where: { ...where, status: 'PLANNED' } }),
        this.prisma.group.count({ where: { ...where, status: 'ONGOING' } }),
        this.prisma.group.count({ where: { ...where, status: 'COMPLETED' } }),
        this.getGroupsByDaysStatistics(branchId),
        this.prisma.studentGroup.count({
          where: branchId ? { group: { branchId } } : {}
        })
      ]);

      // Calculate average students per group
      const averageStudentsPerGroup = total > 0 ? totalStudents / total : 0;

      return {
        total,
        byStatus: {
          planned,
          ongoing,
          completed
        },
        byDays: daysStats,
        averageStudentsPerGroup,
        totalStudents
      };
    } catch (error) {
      this.logger.error(`Failed to get group statistics: ${error.message}`, error.stack);
      throw error;
    }
  }

  async checkScheduleConflicts(
    groupData: CreateGroupDto, 
    excludeGroupId?: number
  ): Promise<GroupScheduleConflictDto[]> {
    const conflicts: GroupScheduleConflictDto[] = [];
    
    if (!groupData.days || !groupData.start_time) {
      return conflicts;
    }

    // Check teacher conflicts
    if (groupData.teacherId) {
      const teacherConflicts = await this.prisma.group.findMany({
        where: {
          teacherId: groupData.teacherId,
          days: { hasSome: groupData.days },
          start_time: groupData.start_time ? new Date(`1970-01-01T${groupData.start_time}`) : undefined,
          ...(excludeGroupId && { id: { not: excludeGroupId } })
        },
        select: { id: true, name: true, days: true, start_time: true }
      });

      for (const conflict of teacherConflicts) {
        const conflictDays = groupData.days.filter(day => conflict.days.includes(day));
        if (conflictDays.length > 0) {
          conflicts.push({
            conflictType: 'TEACHER_CONFLICT',
            conflictingGroupId: conflict.id,
            conflictingGroupName: conflict.name,
            conflictDays,
            conflictTime: conflict.start_time ? this.formatTime(conflict.start_time) : 'Unknown'
          });
        }
      }
    }

    // Check room conflicts
    if (groupData.roomId) {
      const roomConflicts = await this.prisma.group.findMany({
        where: {
          roomId: groupData.roomId,
          days: { hasSome: groupData.days },
          start_time: groupData.start_time ? new Date(`1970-01-01T${groupData.start_time}`) : undefined,
          ...(excludeGroupId && { id: { not: excludeGroupId } })
        },
        select: { id: true, name: true, days: true, start_time: true }
      });

      for (const conflict of roomConflicts) {
        const conflictDays = groupData.days.filter(day => conflict.days.includes(day));
        if (conflictDays.length > 0) {
          conflicts.push({
            conflictType: 'ROOM_CONFLICT',
            conflictingGroupId: conflict.id,
            conflictingGroupName: conflict.name,
            conflictDays,
            conflictTime: conflict.start_time ? this.formatTime(conflict.start_time) : 'Unknown'
          });
        }
      }
    }

    if (conflicts.length > 0) {
      throw new ConflictException({
        message: 'Schedule conflicts detected',
        conflicts
      });
    }

    return conflicts;
  }

  private async validateGroupDependencies(data: Partial<CreateGroupDto>): Promise<void> {
    const validationPromises: Promise<void>[] = [];

    // Validate course
    if (data.courseId) {
      validationPromises.push(
        this.prisma.course.findUnique({
          where: { id: data.courseId },
          select: { id: true, status: true, branchId: true }
        }).then(course => {
          if (!course) {
            throw new BadRequestException(`Course with ID ${data.courseId} not found`);
          }
          if (course.status !== 'ACTIVE') {
            throw new BadRequestException(`Course with ID ${data.courseId} is not active`);
          }
          if (data.branchId && course.branchId !== data.branchId) {
            throw new BadRequestException(`Course ${data.courseId} does not belong to branch ${data.branchId}`);
          }
        })
      );
    }

    // Validate branch
    if (data.branchId) {
      validationPromises.push(
        this.prisma.branch.findUnique({
          where: { id: data.branchId },
          select: { id: true, status: true }
        }).then(branch => {
          if (!branch) {
            throw new BadRequestException(`Branch with ID ${data.branchId} not found`);
          }
          if (branch.status !== 'ACTIVE') {
            throw new BadRequestException(`Branch with ID ${data.branchId} is not active`);
          }
        })
      );
    }

    // Validate teacher
    if (data.teacherId) {
      validationPromises.push(
        this.prisma.teacher.findUnique({
          where: { id: data.teacherId },
          select: { id: true, status: true, branchId: true }
        }).then(teacher => {
          if (!teacher) {
            throw new BadRequestException(`Teacher with ID ${data.teacherId} not found`);
          }
          if (teacher.status !== 'ACTIVE') {
            throw new BadRequestException(`Teacher with ID ${data.teacherId} is not active`);
          }
          if (data.branchId && teacher.branchId !== data.branchId) {
            throw new BadRequestException(`Teacher ${data.teacherId} does not belong to branch ${data.branchId}`);
          }
        })
      );
    }

    // Validate room
    if (data.roomId) {
      validationPromises.push(
        this.prisma.room.findUnique({
          where: { id: data.roomId },
          select: { id: true, branchId: true }
        }).then(room => {
          if (!room) {
            throw new BadRequestException(`Room with ID ${data.roomId} not found`);
          }
          if (data.branchId && room.branchId !== data.branchId) {
            throw new BadRequestException(`Room ${data.roomId} does not belong to branch ${data.branchId}`);
          }
        })
      );
    }

    await Promise.all(validationPromises);
  }

  private async getGroupsByDaysStatistics(branchId?: number): Promise<{ [key: string]: number }> {
    const where: Prisma.GroupWhereInput = branchId ? { branchId } : {};
    
    const groups = await this.prisma.group.findMany({
      where,
      select: { days: true }
    });

    const dayStats: { [key: string]: number } = {
      MON: 0, TUE: 0, WED: 0, THU: 0, FRI: 0, SAT: 0, SUN: 0
    };

    groups.forEach(group => {
      group.days.forEach(day => {
        dayStats[day] = (dayStats[day] || 0) + 1;
      });
    });

    return dayStats;
  }

  private formatGroupResponse(group: any): GroupResponseDto {
    return {
      ...group,
      start_time: group.start_time ? this.formatTime(group.start_time) : null,
      start_date: group.start_date ? this.formatDate(group.start_date) : null,
      end_date: group.end_date ? this.formatDate(group.end_date) : null,
    };
  }

  private formatGroupDetailResponse(group: any): GroupDetailResponseDto {
    return {
      ...group,
      start_time: group.start_time ? this.formatTime(group.start_time) : null,
      start_date: group.start_date ? this.formatDate(group.start_date) : null,
      end_date: group.end_date ? this.formatDate(group.end_date) : null,
      students: group.students?.map((sg: any) => sg.student) || []
    };
  }

  private formatTime(time: Date): string {
    return time.toTimeString().slice(0, 8); // "HH:mm:ss"
  }

  private formatDate(date: Date): string {
    return date.toISOString().slice(0, 10); // "YYYY-MM-DD"
  }
}
