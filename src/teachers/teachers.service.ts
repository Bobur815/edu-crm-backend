// src/teachers/teachers.service.ts
import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { ListTeachersDto, ListTeachersResponseDto, TeacherResponseDto, TeacherStatsDto } from './dto/list-teachers.dto';
import { Prisma, Teacher, TeacherStatus, Gender } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class TeachersService {
  private readonly logger = new Logger(TeachersService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new teacher
   */
  async create(createTeacherDto: CreateTeacherDto): Promise<TeacherResponseDto> {
    this.logger.log(`Creating teacher: ${createTeacherDto.fullname}`);

    try {
      // Validate branch exists
      await this.validateBranchExists(createTeacherDto.branchId);

      // Check for unique constraints
      await this.checkUniqueConstraints(createTeacherDto.email, createTeacherDto.phone);

      // Hash password if provided
      let hashedPassword: string | undefined;
      if (createTeacherDto.password) {
        hashedPassword = await bcrypt.hash(createTeacherDto.password, 10);
      }

      // Parse birthday if provided
      let parsedBirthday: Date | undefined;
      if (createTeacherDto.birthday) {
        parsedBirthday = new Date(createTeacherDto.birthday);
        if (isNaN(parsedBirthday.getTime())) {
          throw new BadRequestException('Invalid birthday format');
        }
      }

      const teacher = await this.prisma.teacher.create({
        data: {
          phone: createTeacherDto.phone,
          email: createTeacherDto.email,
          fullname: createTeacherDto.fullname,
          gender: createTeacherDto.gender,
          photo: createTeacherDto.photo,
          birthday: parsedBirthday,
          password: hashedPassword,
          branchId: createTeacherDto.branchId,
          status: createTeacherDto.status || TeacherStatus.ACTIVE,
          description: createTeacherDto.description,
        },
        include: {
          branch: true,
          groups: {
            include: {
              course: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      this.logger.log(`Teacher created successfully with ID: ${teacher.id}`);
      return this.formatTeacherResponse(teacher);
    } catch (error) {
      this.logger.error(`Failed to create teacher: ${error.message}`, error.stack);
      this.handlePrismaError(error);
      throw error;
    }
  }

  /**
   * Get all teachers with filtering and pagination
   */
  async findAll(listTeachersDto: ListTeachersDto): Promise<ListTeachersResponseDto> {
    this.logger.log(`Fetching teachers with filters: ${JSON.stringify(listTeachersDto)}`);

    try {
      const { page = 1, limit = 10, search, branchId, status, gender, phone, email, sortBy = 'fullname', sortOrder = 'asc' } = listTeachersDto;

      // Build where clause
      const where: Prisma.TeacherWhereInput = {};

      if (search) {
        where.OR = [
          { fullname: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (branchId) {
        where.branchId = branchId;
      }

      if (status) {
        where.status = status;
      }

      if (gender) {
        where.gender = gender;
      }

      if (phone) {
        where.phone = { contains: phone, mode: 'insensitive' };
      }

      if (email) {
        where.email = { contains: email, mode: 'insensitive' };
      }

      // Calculate pagination
      const skip = (page - 1) * limit;

      // Build orderBy clause
      const orderBy: Prisma.TeacherOrderByWithRelationInput = {};
      if (sortBy === 'branch') {
        orderBy.branch = { name: sortOrder };
      } else {
        orderBy[sortBy as keyof Prisma.TeacherOrderByWithRelationInput] = sortOrder;
      }

      // Execute queries
      const [teachers, total] = await Promise.all([
        this.prisma.teacher.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          include: {
            branch: true,
            groups: {
              include: {
                course: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        }),
        this.prisma.teacher.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      this.logger.log(`Found ${teachers.length} teachers out of ${total} total`);

      return {
        data: teachers.map(teacher => this.formatTeacherResponse(teacher)),
        meta: {
          total,
          page,
          limit,
          totalPages,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to fetch teachers: ${error.message}`, error.stack);
      this.handlePrismaError(error);
      throw error;
    }
  }

  /**
   * Get teacher by ID
   */
  async findOne(id: number): Promise<TeacherResponseDto> {
    this.logger.log(`Fetching teacher with ID: ${id}`);

    try {
      const teacher = await this.prisma.teacher.findUnique({
        where: { id },
        include: {
          branch: true,
          groups: {
            include: {
              course: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!teacher) {
        throw new NotFoundException(`Teacher with ID ${id} not found`);
      }

      this.logger.log(`Teacher found: ${teacher.fullname}`);
      return this.formatTeacherResponse(teacher);
    } catch (error) {
      this.logger.error(`Failed to fetch teacher: ${error.message}`, error.stack);
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.handlePrismaError(error);
      throw error;
    }
  }

  /**
   * Update teacher
   */
  async update(id: number, updateTeacherDto: UpdateTeacherDto): Promise<TeacherResponseDto> {
    this.logger.log(`Updating teacher with ID: ${id}`);

    try {
      // Check if teacher exists
      const existingTeacher = await this.prisma.teacher.findUnique({
        where: { id },
      });

      if (!existingTeacher) {
        throw new NotFoundException(`Teacher with ID ${id} not found`);
      }

      // Validate branch if provided
      if (updateTeacherDto.branchId) {
        await this.validateBranchExists(updateTeacherDto.branchId);
      }

      // Check unique constraints if email or phone is being updated
      if (updateTeacherDto.email && updateTeacherDto.email !== existingTeacher.email) {
        await this.checkUniqueConstraints(updateTeacherDto.email, undefined, id);
      }

      // Hash password if provided
      let hashedPassword: string | undefined;
      if (updateTeacherDto.password) {
        hashedPassword = await bcrypt.hash(updateTeacherDto.password, 10);
      }

      // Parse birthday if provided
      let parsedBirthday: Date | undefined;
      if (updateTeacherDto.birthday) {
        parsedBirthday = new Date(updateTeacherDto.birthday);
        if (isNaN(parsedBirthday.getTime())) {
          throw new BadRequestException('Invalid birthday format');
        }
      }

      const updatedTeacher = await this.prisma.teacher.update({
        where: { id },
        data: {
          ...(updateTeacherDto.phone && { phone: updateTeacherDto.phone }),
          ...(updateTeacherDto.email && { email: updateTeacherDto.email }),
          ...(updateTeacherDto.fullname && { fullname: updateTeacherDto.fullname }),
          ...(updateTeacherDto.gender && { gender: updateTeacherDto.gender }),
          ...(updateTeacherDto.photo !== undefined && { photo: updateTeacherDto.photo }),
          ...(parsedBirthday && { birthday: parsedBirthday }),
          ...(hashedPassword && { password: hashedPassword }),
          ...(updateTeacherDto.branchId && { branchId: updateTeacherDto.branchId }),
          ...(updateTeacherDto.status && { status: updateTeacherDto.status }),
          ...(updateTeacherDto.description !== undefined && { description: updateTeacherDto.description }),
        },
        include: {
          branch: true,
          groups: {
            include: {
              course: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      this.logger.log(`Teacher updated successfully: ${updatedTeacher.fullname}`);
      return this.formatTeacherResponse(updatedTeacher);
    } catch (error) {
      this.logger.error(`Failed to update teacher: ${error.message}`, error.stack);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.handlePrismaError(error);
      throw error;
    }
  }

  /**
   * Delete teacher
   */
  async remove(id: number): Promise<{ message: string }> {
    this.logger.log(`Deleting teacher with ID: ${id}`);

    try {
      // Check if teacher exists
      const teacher = await this.prisma.teacher.findUnique({
        where: { id },
        include: {
          groups: true,
        },
      });

      if (!teacher) {
        throw new NotFoundException(`Teacher with ID ${id} not found`);
      }

      // Check if teacher has active groups
      const activeGroups = teacher.groups.filter(group => group.status === 'ONGOING');
      if (activeGroups.length > 0) {
        throw new ConflictException(
          `Cannot delete teacher. Teacher has ${activeGroups.length} active group(s). Please reassign or complete the groups first.`
        );
      }

      await this.prisma.teacher.delete({
        where: { id },
      });

      this.logger.log(`Teacher deleted successfully: ${teacher.fullname}`);
      return { message: `Teacher ${teacher.fullname} has been successfully deleted` };
    } catch (error) {
      this.logger.error(`Failed to delete teacher: ${error.message}`, error.stack);
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      this.handlePrismaError(error);
      throw error;
    }
  }

  /**
   * Get teacher statistics
   */
  async getStats(): Promise<TeacherStatsDto> {
    this.logger.log('Fetching teacher statistics');

    try {
      const [
        totalTeachers,
        activeTeachers,
        inactiveTeachers,
        maleTeachers,
        femaleTeachers,
        teachersWithGroups,
        totalGroups,
        teachersByBranch,
      ] = await Promise.all([
        this.prisma.teacher.count(),
        this.prisma.teacher.count({ where: { status: TeacherStatus.ACTIVE } }),
        this.prisma.teacher.count({ where: { status: TeacherStatus.INACTIVE } }),
        this.prisma.teacher.count({ where: { gender: Gender.MALE } }),
        this.prisma.teacher.count({ where: { gender: Gender.FEMALE } }),
        this.prisma.teacher.count({
          where: {
            groups: {
              some: {},
            },
          },
        }),
        this.prisma.group.count({
          where: {
            teacherId: { not: null },
          },
        }),
        this.prisma.teacher.groupBy({
          by: ['branchId'],
          _count: {
            id: true,
          },
          orderBy: {
            _count: {
              id: 'desc',
            },
          },
        }),
      ]);

      // Get branch names for statistics
      const branchIds = teachersByBranch.map(item => item.branchId);
      const branches = await this.prisma.branch.findMany({
        where: { id: { in: branchIds } },
        select: { id: true, name: true },
      });

      const branchMap = new Map(branches.map(branch => [branch.id, branch.name]));

      const teachersByBranchWithNames = teachersByBranch.map(item => ({
        branchId: item.branchId,
        branchName: branchMap.get(item.branchId) || 'Unknown Branch',
        teacherCount: item._count.id,
      }));

      this.logger.log('Teacher statistics fetched successfully');

      return {
        totalTeachers,
        activeTeachers,
        inactiveTeachers,
        maleTeachers,
        femaleTeachers,
        teachersWithGroups,
        totalGroups,
        teachersByBranch: teachersByBranchWithNames,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch teacher statistics: ${error.message}`, error.stack);
      this.handlePrismaError(error);
      throw error;
    }
  }

  /**
   * Find teachers by branch
   */
  async findByBranch(branchId: number): Promise<TeacherResponseDto[]> {
    this.logger.log(`Fetching teachers for branch ID: ${branchId}`);

    try {
      await this.validateBranchExists(branchId);

      const teachers = await this.prisma.teacher.findMany({
        where: { branchId },
        include: {
          branch: true,
          groups: {
            include: {
              course: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { fullname: 'asc' },
      });

      this.logger.log(`Found ${teachers.length} teachers for branch ${branchId}`);
      return teachers.map(teacher => this.formatTeacherResponse(teacher));
    } catch (error) {
      this.logger.error(`Failed to fetch teachers by branch: ${error.message}`, error.stack);
      this.handlePrismaError(error);
      throw error;
    }
  }

  /**
   * Update teacher status
   */
  async updateStatus(id: number, status: TeacherStatus): Promise<TeacherResponseDto> {
    this.logger.log(`Updating teacher status for ID: ${id} to ${status}`);

    try {
      const teacher = await this.prisma.teacher.findUnique({
        where: { id },
      });

      if (!teacher) {
        throw new NotFoundException(`Teacher with ID ${id} not found`);
      }

      // If deactivating teacher, check for active groups
      if (status === TeacherStatus.INACTIVE) {
        const activeGroups = await this.prisma.group.count({
          where: {
            teacherId: id,
            status: 'ONGOING',
          },
        });

        if (activeGroups > 0) {
          throw new ConflictException(
            `Cannot deactivate teacher. Teacher has ${activeGroups} active group(s). Please reassign the groups first.`
          );
        }
      }

      const updatedTeacher = await this.prisma.teacher.update({
        where: { id },
        data: { status },
        include: {
          branch: true,
          groups: {
            include: {
              course: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      this.logger.log(`Teacher status updated successfully: ${updatedTeacher.fullname} -> ${status}`);
      return this.formatTeacherResponse(updatedTeacher);
    } catch (error) {
      this.logger.error(`Failed to update teacher status: ${error.message}`, error.stack);
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      this.handlePrismaError(error);
      throw error;
    }
  }

  /**
   * Get teacher groups
   */
  async getTeacherGroups(id: number) {
    this.logger.log(`Fetching groups for teacher ID: ${id}`);

    try {
      const teacher = await this.prisma.teacher.findUnique({
        where: { id },
        include: {
          groups: {
            include: {
              course: true,
              room: true,
              students: {
                include: {
                  student: {
                    select: {
                      id: true,
                      fullname: true,
                      email: true,
                      phone: true,
                    },
                  },
                },
              },
            },
            orderBy: { name: 'asc' },
          },
        },
      });

      if (!teacher) {
        throw new NotFoundException(`Teacher with ID ${id} not found`);
      }

      this.logger.log(`Found ${teacher.groups.length} groups for teacher ${teacher.fullname}`);
      return teacher.groups;
    } catch (error) {
      this.logger.error(`Failed to fetch teacher groups: ${error.message}`, error.stack);
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.handlePrismaError(error);
      throw error;
    }
  }

  // Private helper methods

  private async validateBranchExists(branchId: number): Promise<void> {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
    });

    if (!branch) {
      throw new NotFoundException(`Branch with ID ${branchId} not found`);
    }
  }

  private async checkUniqueConstraints(email?: string, phone?: string, excludeId?: number): Promise<void> {
    if (email) {
      const existingTeacherByEmail = await this.prisma.teacher.findFirst({
        where: {
          email,
          ...(excludeId && { id: { not: excludeId } }),
        },
      });

      if (existingTeacherByEmail) {
        throw new ConflictException(`Teacher with email ${email} already exists`);
      }
    }

    if (phone) {
      const existingTeacherByPhone = await this.prisma.teacher.findFirst({
        where: {
          phone,
          ...(excludeId && { id: { not: excludeId } }),
        },
      });

      if (existingTeacherByPhone) {
        throw new ConflictException(`Teacher with phone ${phone} already exists`);
      }
    }
  }

  private formatTeacherResponse(teacher: any): TeacherResponseDto {
    return {
      id: teacher.id,
      phone: teacher.phone,
      email: teacher.email,
      fullname: teacher.fullname,
      gender: teacher.gender,
      photo: teacher.photo,
      birthday: teacher.birthday,
      branchId: teacher.branchId,
      status: teacher.status,
      description: teacher.description,
      branch: teacher.branch ? {
        id: teacher.branch.id,
        name: teacher.branch.name,
        region: teacher.branch.region,
        district: teacher.branch.district,
        address: teacher.branch.address,
        phone: teacher.branch.phone,
        status: teacher.branch.status,
      } : undefined,
      groups: teacher.groups?.map((group: any) => ({
        id: group.id,
        name: group.name,
        status: group.status,
        course: {
          id: group.course.id,
          name: group.course.name,
        },
      })),
    };
  }

  private handlePrismaError(error: any): void {
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0];
      throw new ConflictException(`Teacher with this ${field} already exists`);
    }
    if (error.code === 'P2025') {
      throw new NotFoundException('Teacher not found');
    }
    if (error.code === 'P2003') {
      throw new BadRequestException('Invalid foreign key reference');
    }
  }
}
