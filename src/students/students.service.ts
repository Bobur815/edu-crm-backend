// src/students/students.service.ts
import { 
  Injectable, 
  NotFoundException, 
  BadRequestException,
  ConflictException,
  Logger
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { ListStudentsDto } from './dto/list-students.dto';
import { 
  StudentResponseDto, 
  StudentsListResponseDto, 
  StudentDetailResponseDto,
  StudentStatisticsDto,
  EnrollStudentDto,
  StudentEnrollmentResponseDto
} from './dto/student-response.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class StudentsService {
  private readonly logger = new Logger(StudentsService.name);

  constructor(private prisma: PrismaService) {}

  async create(data: CreateStudentDto): Promise<StudentResponseDto> {
    try {
      this.logger.log(`Creating student: ${data.fullname}`);
      
      // Validate that branch exists and is active
      await this.validateBranch(data.branchId);
      
      // Check for duplicate email if provided
      if (data.email) {
        const existingStudent = await this.prisma.student.findUnique({
          where: { email: data.email }
        });
        
        if (existingStudent) {
          throw new ConflictException(`Student with email '${data.email}' already exists`);
        }
      }
      
      // Hash password if provided
      const hashedPassword = data.password 
        ? await bcrypt.hash(data.password, 10) 
        : null;
      
      // Convert birthday string to Date if provided
      const studentData = {
        ...data,
        password: hashedPassword,
        birthday: data.birthday ? new Date(data.birthday) : null,
      };
      
      const student = await this.prisma.student.create({
        data: studentData,
        include: {
          branch: {
            select: { 
              id: true, 
              name: true 
            }
          },
          _count: {
            select: { studentGroups: true }
          }
        }
      });

      this.logger.log(`Student created successfully with ID: ${student.id}`);
      return this.formatStudentResponse(student);
    } catch (error) {
      this.logger.error(`Failed to create student: ${error.message}`, error.stack);
      
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('A student with this email already exists');
        }
        if (error.code === 'P2003') {
          throw new BadRequestException('Invalid branch ID');
        }
      }
      
      throw error;
    }
  }

  async findAll(params: ListStudentsDto): Promise<StudentsListResponseDto> {
    try {
      const { 
        page = 1, 
        limit = 20, 
        branchId, 
        groupId,
        status,
        gender,
        search,
        birthdayFrom,
        birthdayTo,
        hasEmail,
        hasPhone,
        enrolled,
        sortBy = 'fullname',
        sortOrder = 'asc'
      } = params;
      
      // Build where clause for filtering
      const where: Prisma.StudentWhereInput = {
        ...(branchId && { branchId }),
        ...(status && { status }),
        ...(gender && { gender }),
        ...(search && {
          OR: [
            { fullname: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } }
          ]
        }),
        ...(birthdayFrom && birthdayTo && {
          birthday: {
            gte: new Date(birthdayFrom),
            lte: new Date(birthdayTo)
          }
        }),
        ...(hasEmail !== undefined && {
          email: hasEmail ? { not: null } : null
        }),
        ...(hasPhone !== undefined && {
          phone: hasPhone ? { not: null } : null
        }),
        ...(enrolled !== undefined && {
          studentGroups: enrolled 
            ? { some: { group: { status: { in: ['PLANNED', 'ONGOING'] } } } }
            : { none: { group: { status: { in: ['PLANNED', 'ONGOING'] } } } }
        }),
        ...(groupId && {
          studentGroups: {
            some: { groupId }
          }
        })
      };

      // Build order by clause
      const orderBy: Prisma.StudentOrderByWithRelationInput = {};
      if (sortBy === 'fullname') {
        orderBy.fullname = sortOrder;
      } else if (sortBy === 'birthday') {
        orderBy.birthday = sortOrder;
      } else if (sortBy === 'status') {
        orderBy.status = sortOrder;
      } else {
        orderBy.id = sortOrder;
      }

      const [students, total] = await Promise.all([
        this.prisma.student.findMany({
          where,
          include: {
            branch: {
              select: { 
                id: true, 
                name: true 
              }
            },
            _count: {
              select: { studentGroups: true }
            }
          },
          orderBy,
          skip: (page - 1) * limit,
          take: limit
        }),
        this.prisma.student.count({ where })
      ]);

      const totalPages = Math.ceil(total / limit);

      // Calculate enrollment info for each student
      const studentsWithEnrollment = await Promise.all(
        students.map(async (student) => {
          const enrollmentInfo = await this.calculateEnrollmentInfo(student.id);
          return this.formatStudentResponse({
            ...student,
            enrollmentInfo
          });
        })
      );

      this.logger.log(`Retrieved ${students.length} students (page ${page}/${totalPages})`);

      return {
        data: studentsWithEnrollment,
        meta: {
          total,
          page,
          limit,
          totalPages
        }
      };
    } catch (error) {
      this.logger.error(`Failed to retrieve students: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findOne(id: string): Promise<StudentDetailResponseDto> {
    try {
      this.logger.log(`Retrieving student with ID: ${id}`);
      
      const student = await this.prisma.student.findUnique({
        where: { id },
        include: {
          branch: {
            select: { 
              id: true, 
              name: true,
              address: true 
            }
          },
          studentGroups: {
            include: {
              group: {
                include: {
                  course: {
                    select: {
                      id: true,
                      name: true,
                      price: true
                    }
                  },
                  teacher: {
                    select: {
                      id: true,
                      fullname: true
                    }
                  },
                  room: {
                    select: {
                      id: true,
                      name: true
                    }
                  }
                }
              }
            },
            orderBy: {
              group: {
                start_date: 'desc'
              }
            }
          },
          _count: {
            select: { studentGroups: true }
          }
        }
      });

      if (!student) {
        throw new NotFoundException(`Student with ID ${id} not found`);
      }

      // Calculate academic metrics
      const academicInfo = await this.calculateAcademicInfo(id);

      this.logger.log(`Student retrieved successfully: ${student.fullname}`);
      return this.formatStudentDetailResponse(student, academicInfo);
    } catch (error) {
      this.logger.error(`Failed to retrieve student ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async update(id: string, data: UpdateStudentDto): Promise<StudentResponseDto> {
    try {
      this.logger.log(`Updating student with ID: ${id}`);
      
      // Check if student exists
      await this.findOne(id);
      
      // Validate branch if it's being updated
      if (data.branchId) {
        await this.validateBranch(data.branchId);
      }
      
      // Check for duplicate email if email is being updated
      if (data.email) {
        const existingStudent = await this.prisma.student.findUnique({
          where: { email: data.email }
        });
        
        if (existingStudent && existingStudent.id !== id) {
          throw new ConflictException(`Student with email '${data.email}' already exists`);
        }
      }
      
      // Hash password if provided
      const hashedPassword = data.password 
        ? await bcrypt.hash(data.password, 10) 
        : undefined;
      
      // Convert birthday string to Date if provided
      const updateData = {
        ...data,
        ...(hashedPassword && { password: hashedPassword }),
        ...(data.birthday && { birthday: new Date(data.birthday) }),
      };
      
      const updatedStudent = await this.prisma.student.update({
        where: { id },
        data: updateData,
        include: {
          branch: {
            select: { 
              id: true, 
              name: true 
            }
          },
          _count: {
            select: { studentGroups: true }
          }
        }
      });

      this.logger.log(`Student updated successfully: ${updatedStudent.fullname}`);
      return this.formatStudentResponse(updatedStudent);
    } catch (error) {
      this.logger.error(`Failed to update student ${id}: ${error.message}`, error.stack);
      
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('A student with this email already exists');
        }
        if (error.code === 'P2003') {
          throw new BadRequestException('Invalid branch ID');
        }
        if (error.code === 'P2025') {
          throw new NotFoundException(`Student with ID ${id} not found`);
        }
      }
      
      throw error;
    }
  }

  async remove(id: string): Promise<{ message: string }> {
    try {
      this.logger.log(`Deleting student with ID: ${id}`);
      
      // Check if student exists
      await this.findOne(id);
      
      // Check if student has active group enrollments
      const activeEnrollments = await this.prisma.studentGroup.count({
        where: { 
          studentId: id,
          group: {
            status: {
              in: ['PLANNED', 'ONGOING']
            }
          }
        }
      });
      
      if (activeEnrollments > 0) {
        throw new ConflictException(`Cannot delete student: has ${activeEnrollments} active group enrollments`);
      }
      
      await this.prisma.student.delete({
        where: { id }
      });

      this.logger.log(`Student deleted successfully: ${id}`);
      return { message: 'Student deleted successfully' };
    } catch (error) {
      this.logger.error(`Failed to delete student ${id}: ${error.message}`, error.stack);
      
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Student with ID ${id} not found`);
        }
      }
      
      throw error;
    }
  }

  async enrollStudent(data: EnrollStudentDto): Promise<StudentEnrollmentResponseDto> {
    try {
      this.logger.log(`Enrolling student ${data.studentId} to group ${data.groupId}`);
      
      // Validate student exists
      const student = await this.prisma.student.findUnique({
        where: { id: data.studentId },
        select: { id: true, fullname: true, email: true, phone: true, branchId: true }
      });
      
      if (!student) {
        throw new NotFoundException(`Student with ID ${data.studentId} not found`);
      }
      
      // Validate group exists and belongs to the same branch
      const group = await this.prisma.group.findUnique({
        where: { id: data.groupId },
        include: {
          course: {
            select: { id: true, name: true, price: true }
          }
        }
      });
      
      if (!group) {
        throw new NotFoundException(`Group with ID ${data.groupId} not found`);
      }
      
      if (group.branchId !== data.branchId || student.branchId !== data.branchId) {
        throw new BadRequestException('Student and group must belong to the same branch');
      }
      
      // Check if student is already enrolled in this group
      const existingEnrollment = await this.prisma.studentGroup.findUnique({
        where: {
          groupId_studentId: {
            groupId: data.groupId,
            studentId: data.studentId
          }
        }
      });
      
      if (existingEnrollment) {
        throw new ConflictException('Student is already enrolled in this group');
      }
      
      const enrollment = await this.prisma.studentGroup.create({
        data,
        include: {
          student: {
            select: {
              id: true,
              fullname: true,
              email: true,
              phone: true
            }
          },
          group: {
            include: {
              course: {
                select: {
                  id: true,
                  name: true,
                  price: true
                }
              }
            }
          }
        }
      });

      this.logger.log(`Student enrolled successfully in group: ${data.groupId}`);
      return this.formatEnrollmentResponse(enrollment);
    } catch (error) {
      this.logger.error(`Failed to enroll student: ${error.message}`, error.stack);
      
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Student is already enrolled in this group');
        }
        if (error.code === 'P2003') {
          throw new BadRequestException('Invalid student, group, or branch ID');
        }
      }
      
      throw error;
    }
  }

  async unenrollStudent(groupId: number, studentId: string): Promise<{ message: string }> {
    try {
      this.logger.log(`Unenrolling student ${studentId} from group ${groupId}`);
      
      const enrollment = await this.prisma.studentGroup.findUnique({
        where: {
          groupId_studentId: {
            groupId,
            studentId
          }
        }
      });
      
      if (!enrollment) {
        throw new NotFoundException('Student enrollment not found');
      }
      
      await this.prisma.studentGroup.delete({
        where: {
          groupId_studentId: {
            groupId,
            studentId
          }
        }
      });

      this.logger.log(`Student unenrolled successfully from group: ${groupId}`);
      return { message: 'Student unenrolled successfully' };
    } catch (error) {
      this.logger.error(`Failed to unenroll student: ${error.message}`, error.stack);
      
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('Student enrollment not found');
        }
      }
      
      throw error;
    }
  }

  async getStatistics(branchId?: number): Promise<StudentStatisticsDto> {
    try {
      const where: Prisma.StudentWhereInput = branchId ? { branchId } : {};
      
      const [
        total,
        active,
        inactive,
        male,
        female,
        unspecified,
        enrollmentStats,
        ageDistribution,
        contactInfo
      ] = await Promise.all([
        this.prisma.student.count({ where }),
        this.prisma.student.count({ where: { ...where, status: 'ACTIVE' } }),
        this.prisma.student.count({ where: { ...where, status: 'INACTIVE' } }),
        this.prisma.student.count({ where: { ...where, gender: 'MALE' } }),
        this.prisma.student.count({ where: { ...where, gender: 'FEMALE' } }),
        this.prisma.student.count({ where: { ...where, gender: null } }),
        this.calculateEnrollmentStats(branchId),
        this.calculateAgeDistribution(branchId),
        this.calculateContactInfo(branchId)
      ]);

      return {
        total,
        byStatus: { active, inactive },
        byGender: { male, female, unspecified },
        enrollmentStats,
        ageDistribution,
        contactInfo
      };
    } catch (error) {
      this.logger.error(`Failed to get student statistics: ${error.message}`, error.stack);
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

  private async calculateEnrollmentInfo(studentId: string) {
    const enrollments = await this.prisma.studentGroup.findMany({
      where: { studentId },
      include: { group: { select: { status: true } } }
    });

    const totalGroups = enrollments.length;
    const activeGroups = enrollments.filter(e => ['PLANNED', 'ONGOING'].includes(e.group.status)).length;
    const completedGroups = enrollments.filter(e => e.group.status === 'COMPLETED').length;

    return {
      totalGroups,
      activeGroups,
      completedGroups
    };
  }

  private async calculateAcademicInfo(studentId: string) {
    const enrollments = await this.prisma.studentGroup.findMany({
      where: { studentId },
      include: {
        group: {
          include: {
            course: { select: { id: true } }
          }
        }
      }
    });

    const totalGroups = enrollments.length;
    const activeGroups = enrollments.filter(e => ['PLANNED', 'ONGOING'].includes(e.group.status)).length;
    const plannedGroups = enrollments.filter(e => e.group.status === 'PLANNED').length;
    const completedGroups = enrollments.filter(e => e.group.status === 'COMPLETED').length;
    
    const uniqueCourses = new Set(enrollments.map(e => e.group.course.id));
    const totalCoursesEnrolled = uniqueCourses.size;
    
    const currentEnrollments = enrollments.filter(e => ['PLANNED', 'ONGOING'].includes(e.group.status));
    const currentUniqueCourses = new Set(currentEnrollments.map(e => e.group.course.id));
    const currentCoursesEnrolled = currentUniqueCourses.size;

    return {
      totalGroups,
      activeGroups,
      plannedGroups,
      completedGroups,
      totalCoursesEnrolled,
      currentCoursesEnrolled
    };
  }

  private async calculateEnrollmentStats(branchId?: number) {
    const where: Prisma.StudentGroupWhereInput = branchId ? { branchId } : {};
    
    const [totalEnrollments, activeEnrollments, studentsWithoutGroups] = await Promise.all([
      this.prisma.studentGroup.count({ where }),
      this.prisma.studentGroup.count({
        where: {
          ...where,
          group: { status: { in: ['PLANNED', 'ONGOING'] } }
        }
      }),
      this.prisma.student.count({
        where: {
          ...(branchId && { branchId }),
          studentGroups: { none: {} }
        }
      })
    ]);

    const totalStudents = await this.prisma.student.count({
      where: branchId ? { branchId } : {}
    });

    const averageGroupsPerStudent = totalStudents > 0 
      ? Math.round((totalEnrollments / totalStudents) * 100) / 100 
      : 0;

    return {
      totalEnrollments,
      activeEnrollments,
      averageGroupsPerStudent,
      studentsWithoutGroups
    };
  }

  private async calculateAgeDistribution(branchId?: number) {
    const where: Prisma.StudentWhereInput = branchId ? { branchId } : {};
    const today = new Date();
    
    const [under18, age18to25, age26to35, over35, unknown] = await Promise.all([
      this.prisma.student.count({
        where: {
          ...where,
          birthday: { gte: new Date(today.getFullYear() - 18, today.getMonth(), today.getDate()) }
        }
      }),
      this.prisma.student.count({
        where: {
          ...where,
          birthday: {
            gte: new Date(today.getFullYear() - 25, today.getMonth(), today.getDate()),
            lt: new Date(today.getFullYear() - 18, today.getMonth(), today.getDate())
          }
        }
      }),
      this.prisma.student.count({
        where: {
          ...where,
          birthday: {
            gte: new Date(today.getFullYear() - 35, today.getMonth(), today.getDate()),
            lt: new Date(today.getFullYear() - 26, today.getMonth(), today.getDate())
          }
        }
      }),
      this.prisma.student.count({
        where: {
          ...where,
          birthday: { lt: new Date(today.getFullYear() - 35, today.getMonth(), today.getDate()) }
        }
      }),
      this.prisma.student.count({
        where: { ...where, birthday: null }
      })
    ]);

    return { under18, age18to25, age26to35, over35, unknown };
  }

  private async calculateContactInfo(branchId?: number) {
    const where: Prisma.StudentWhereInput = branchId ? { branchId } : {};
    
    const [withEmail, withPhone, withBoth, withNeither] = await Promise.all([
      this.prisma.student.count({
        where: { ...where, email: { not: null } }
      }),
      this.prisma.student.count({
        where: { ...where, phone: { not: null } }
      }),
      this.prisma.student.count({
        where: { ...where, email: { not: null }, phone: { not: null } }
      }),
      this.prisma.student.count({
        where: { ...where, email: null, phone: null }
      })
    ]);

    return { withEmail, withPhone, withBoth, withNeither };
  }

  private formatStudentResponse(student: any): StudentResponseDto {
    return {
      id: student.id,
      fullname: student.fullname,
      email: student.email,
      phone: student.phone,
      gender: student.gender,
      photo: student.photo,
      birthday: student.birthday ? this.formatDate(student.birthday) : null,
      status: student.status,
      other_details: student.other_details,
      branchId: student.branchId,
      branch: student.branch,
      _count: student._count,
      enrollmentInfo: student.enrollmentInfo
    };
  }

  private formatStudentDetailResponse(student: any, academicInfo: any): StudentDetailResponseDto {
    return {
      id: student.id,
      fullname: student.fullname,
      email: student.email,
      phone: student.phone,
      gender: student.gender,
      photo: student.photo,
      birthday: student.birthday ? this.formatDate(student.birthday) : null,
      status: student.status,
      other_details: student.other_details,
      branchId: student.branchId,
      branch: student.branch,
      studentGroups: student.studentGroups.map((sg: any) => ({
        id: sg.id,
        group: {
          ...sg.group,
          start_time: sg.group.start_time ? this.formatTime(sg.group.start_time) : null,
          start_date: sg.group.start_date ? this.formatDate(sg.group.start_date) : null,
          end_date: sg.group.end_date ? this.formatDate(sg.group.end_date) : null
        }
      })),
      _count: student._count,
      academicInfo
    };
  }

  private formatEnrollmentResponse(enrollment: any): StudentEnrollmentResponseDto {
    return {
      id: enrollment.id,
      groupId: enrollment.groupId,
      studentId: enrollment.studentId,
      branchId: enrollment.branchId,
      enrolledAt: new Date().toISOString(),
      student: enrollment.student,
      group: enrollment.group
    };
  }

  private formatTime(time: Date): string {
    return time.toTimeString().slice(0, 8); // "HH:mm:ss"
  }

  private formatDate(date: Date): string {
    return date.toISOString().slice(0, 10); // "YYYY-MM-DD"
  }
}
