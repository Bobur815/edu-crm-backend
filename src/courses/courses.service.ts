// src/courses/courses.service.ts
import { 
  Injectable, 
  NotFoundException, 
  BadRequestException,
  ConflictException,
  Logger
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { ListCoursesDto } from './dto/list-courses.dto';
import { 
  CourseResponseDto, 
  CoursesListResponseDto, 
  CourseDetailResponseDto 
} from './dto/course-response.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CoursesService {
  private readonly logger = new Logger(CoursesService.name);

  constructor(private prisma: PrismaService) {}

  async create(data: CreateCourseDto): Promise<CourseResponseDto> {
    try {
      this.logger.log(`Creating course: ${data.name}`);
      
      // Validate that branch and category exist
      await this.validateBranchAndCategory(data.branchId, data.categoryId);
      
      const course = await this.prisma.course.create({
        data,
        include: {
          category: {
            select: { id: true, name: true }
          },
          branch: {
            select: { id: true, name: true }
          }
        }
      });

      this.logger.log(`Course created successfully with ID: ${course.id}`);
      return course;
    } catch (error) {
      this.logger.error(`Failed to create course: ${error.message}`, error.stack);
      
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('A course with this name already exists in this branch');
        }
        if (error.code === 'P2003') {
          throw new BadRequestException('Invalid branch or category ID');
        }
      }
      
      throw error;
    }
  }

  async findAll(params: ListCoursesDto): Promise<CoursesListResponseDto> {
    try {
      const { page = 1, limit = 20, branchId, categoryId, status, search, minPrice, maxPrice, minDuration, maxDuration } = params;
      
      // Build where clause for filtering
      const where: Prisma.CourseWhereInput = {
        ...(branchId && { branchId }),
        ...(categoryId && { categoryId }),
        ...(status && { status }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { category: { name: { contains: search, mode: 'insensitive' } } }
          ]
        }),
        ...(minPrice !== undefined || maxPrice !== undefined) && {
          price: {
            ...(minPrice !== undefined && { gte: minPrice }),
            ...(maxPrice !== undefined && { lte: maxPrice })
          }
        },
        ...(minDuration !== undefined || maxDuration !== undefined) && {
          duration_months: {
            ...(minDuration !== undefined && { gte: minDuration }),
            ...(maxDuration !== undefined && { lte: maxDuration })
          }
        }
      };

      const [courses, total] = await Promise.all([
        this.prisma.course.findMany({
          where,
          include: {
            category: {
              select: { id: true, name: true }
            }
          },
          orderBy: { id: 'desc' },
          skip: (page - 1) * limit,
          take: limit
        }),
        this.prisma.course.count({ where })
      ]);

      const totalPages = Math.ceil(total / limit);

      this.logger.log(`Retrieved ${courses.length} courses (page ${page}/${totalPages})`);

      return {
        data: courses,
        meta: {
          total,
          page,
          limit,
          totalPages
        }
      };
    } catch (error) {
      this.logger.error(`Failed to retrieve courses: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findOne(id: number): Promise<CourseDetailResponseDto> {
    try {
      this.logger.log(`Retrieving course with ID: ${id}`);
      
      const course = await this.prisma.course.findUnique({
        where: { id },
        include: {
          category: {
            select: { id: true, name: true }
          },
          branch: {
            select: { id: true, name: true }
          }
        }
      });

      if (!course) {
        throw new NotFoundException(`Course with ID ${id} not found`);
      }

      this.logger.log(`Course retrieved successfully: ${course.name}`);
      return course;
    } catch (error) {
      this.logger.error(`Failed to retrieve course ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async update(id: number, data: UpdateCourseDto): Promise<CourseResponseDto> {
    try {
      this.logger.log(`Updating course with ID: ${id}`);
      
      // Check if course exists
      await this.findOne(id);
      
      // Validate branch and category if they're being updated
      if (data.branchId || data.categoryId) {
        const currentCourse = await this.prisma.course.findUnique({
          where: { id },
          select: { branchId: true, categoryId: true }
        });
        
        if (!currentCourse) {
          throw new NotFoundException(`Course with ID ${id} not found`);
        }
        
        await this.validateBranchAndCategory(
          data.branchId ?? currentCourse.branchId,
          data.categoryId ?? currentCourse.categoryId
        );
      }
      
      const updatedCourse = await this.prisma.course.update({
        where: { id },
        data,
        include: {
          category: {
            select: { id: true, name: true }
          },
          branch: {
            select: { id: true, name: true }
          }
        }
      });

      this.logger.log(`Course updated successfully: ${updatedCourse.name}`);
      return updatedCourse;
    } catch (error) {
      this.logger.error(`Failed to update course ${id}: ${error.message}`, error.stack);
      
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('A course with this name already exists in this branch');
        }
        if (error.code === 'P2003') {
          throw new BadRequestException('Invalid branch or category ID');
        }
        if (error.code === 'P2025') {
          throw new NotFoundException(`Course with ID ${id} not found`);
        }
      }
      
      throw error;
    }
  }

  async remove(id: number): Promise<{ message: string }> {
    try {
      this.logger.log(`Deleting course with ID: ${id}`);
      
      // Check if course exists
      await this.findOne(id);
      
      await this.prisma.course.delete({
        where: { id }
      });

      this.logger.log(`Course deleted successfully: ${id}`);
      return { message: 'Course deleted successfully' };
    } catch (error) {
      this.logger.error(`Failed to delete course ${id}: ${error.message}`, error.stack);
      
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Course with ID ${id} not found`);
        }
        if (error.code === 'P2003') {
          throw new ConflictException('Cannot delete course: it has associated groups or other dependencies');
        }
      }
      
      throw error;
    }
  }

  /**
   * Validates that both branch and category exist and that the category belongs to the branch
   */
  private async validateBranchAndCategory(branchId: number, categoryId: number): Promise<void> {
    const [branch, category] = await Promise.all([
      this.prisma.branch.findUnique({
        where: { id: branchId },
        select: { id: true, status: true }
      }),
      this.prisma.courseCategory.findUnique({
        where: { id: categoryId },
        select: { id: true, branchId: true }
      })
    ]);

    if (!branch) {
      throw new BadRequestException(`Branch with ID ${branchId} not found`);
    }

    if (branch.status !== 'ACTIVE') {
      throw new BadRequestException(`Branch with ID ${branchId} is not active`);
    }

    if (!category) {
      throw new BadRequestException(`Category with ID ${categoryId} not found`);
    }

    if (category.branchId !== branchId) {
      throw new BadRequestException(`Category ${categoryId} does not belong to branch ${branchId}`);
    }
  }

  /**
   * Get courses statistics for a branch
   */
  async getStatistics(branchId?: number) {
    try {
      const where: Prisma.CourseWhereInput = branchId ? { branchId } : {};
      
      const [total, active, draft, archived, avgPrice] = await Promise.all([
        this.prisma.course.count({ where }),
        this.prisma.course.count({ where: { ...where, status: 'ACTIVE' } }),
        this.prisma.course.count({ where: { ...where, status: 'DRAFT' } }),
        this.prisma.course.count({ where: { ...where, status: 'ARCHIVED' } }),
        this.prisma.course.aggregate({
          where,
          _avg: { price: true }
        })
      ]);

      return {
        total,
        byStatus: {
          active,
          draft,
          archived
        },
        averagePrice: avgPrice._avg.price || 0
      };
    } catch (error) {
      this.logger.error(`Failed to get course statistics: ${error.message}`, error.stack);
      throw error;
    }
  }
}
