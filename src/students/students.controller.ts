// src/students/students.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  ValidationPipe
} from '@nestjs/common';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { ListStudentsDto } from './dto/list-students.dto';
import { EnrollStudentDto } from './dto/student-response.dto';

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

import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';

@ApiTags('Students')
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  /** -------------------- CREATE (ADMIN/MANAGER) -------------------- */
  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Create a new student',
    description: 'Creates a new student in the specified branch. Validates branch existence, checks for duplicate emails, and hashes passwords if provided.'
  })
  @ApiCreatedResponse({ 
    description: 'Student created successfully',
    schema: {
      example: {
        id: "uuid-student-id",
        fullname: "John Doe",
        email: "john.doe@example.com",
        phone: "+998901234567",
        gender: "MALE",
        photo: null,
        birthday: "2000-01-15",
        status: "ACTIVE",
        other_details: { parentName: "Jane Doe", notes: "Honor student" },
        branchId: 1,
        branch: { id: 1, name: "Main Branch" },
        _count: { studentGroups: 0 },
        enrollmentInfo: {
          totalGroups: 0,
          activeGroups: 0,
          completedGroups: 0
        }
      }
    }
  })
  @ApiConflictResponse({ description: 'Student with this email already exists' })
  @ApiBadRequestResponse({ description: 'Invalid input data or branch not found' })
  create(@Body() createStudentDto: CreateStudentDto) {
    return this.studentsService.create(createStudentDto);
  }

  /** -------------------- READ (Public/Protected) -------------------- */
  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.TEACHER)
  @ApiOperation({ 
    summary: 'List students with filtering and pagination',
    description: 'Retrieves a paginated list of students with comprehensive filtering options including branch, group, status, demographics, and enrollment status.'
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' })
  @ApiQuery({ name: 'branchId', required: false, type: Number, description: 'Filter by branch ID' })
  @ApiQuery({ name: 'groupId', required: false, type: Number, description: 'Filter by group enrollment' })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'INACTIVE'], description: 'Filter by student status' })
  @ApiQuery({ name: 'gender', required: false, enum: ['MALE', 'FEMALE'], description: 'Filter by gender' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search in name, email, phone' })
  @ApiQuery({ name: 'birthdayFrom', required: false, type: String, description: 'Filter by birth date from (YYYY-MM-DD)' })
  @ApiQuery({ name: 'birthdayTo', required: false, type: String, description: 'Filter by birth date to (YYYY-MM-DD)' })
  @ApiQuery({ name: 'hasEmail', required: false, type: Boolean, description: 'Filter by email presence' })
  @ApiQuery({ name: 'hasPhone', required: false, type: Boolean, description: 'Filter by phone presence' })
  @ApiQuery({ name: 'enrolled', required: false, type: Boolean, description: 'Filter by active enrollment status' })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['fullname', 'birthday', 'status', 'id'], description: 'Sort field' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], description: 'Sort order' })
  @ApiOkResponse({ 
    description: 'Students retrieved successfully',
    schema: {
      example: {
        data: [
          {
            id: "uuid-student-id",
            fullname: "John Doe",
            email: "john.doe@example.com",
            phone: "+998901234567",
            gender: "MALE",
            photo: null,
            birthday: "2000-01-15",
            status: "ACTIVE",
            other_details: null,
            branchId: 1,
            branch: { id: 1, name: "Main Branch" },
            _count: { studentGroups: 2 },
            enrollmentInfo: {
              totalGroups: 2,
              activeGroups: 1,
              completedGroups: 1
            }
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
  findAll(@Query(new ValidationPipe({ transform: true })) params: ListStudentsDto) {
    return this.studentsService.findAll(params);
  }

  @Get('statistics')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ 
    summary: 'Get comprehensive student statistics',
    description: 'Retrieves detailed statistics about students including demographics, enrollment patterns, age distribution, and contact information analytics.'
  })
  @ApiQuery({ name: 'branchId', required: false, type: Number, description: 'Filter statistics by branch ID' })
  @ApiOkResponse({ 
    description: 'Student statistics retrieved successfully',
    schema: {
      example: {
        total: 150,
        byStatus: { active: 135, inactive: 15 },
        byGender: { male: 75, female: 70, unspecified: 5 },
        enrollmentStats: {
          totalEnrollments: 285,
          activeEnrollments: 180,
          averageGroupsPerStudent: 1.9,
          studentsWithoutGroups: 25
        },
        ageDistribution: {
          under18: 45,
          age18to25: 85,
          age26to35: 15,
          over35: 3,
          unknown: 2
        },
        contactInfo: {
          withEmail: 120,
          withPhone: 145,
          withBoth: 115,
          withNeither: 5
        }
      }
    }
  })
  getStatistics(@Query('branchId') branchId?: number) {
    return this.studentsService.getStatistics(branchId);
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.TEACHER)
  @ApiOperation({ 
    summary: 'Get student details by ID',
    description: 'Retrieves comprehensive information about a specific student including enrollment history, academic progress, and group participation.'
  })
  @ApiParam({ name: 'id', type: String, description: 'Student UUID' })
  @ApiOkResponse({ 
    description: 'Student details retrieved successfully',
    schema: {
      example: {
        id: "uuid-student-id",
        fullname: "John Doe",
        email: "john.doe@example.com",
        phone: "+998901234567",
        gender: "MALE",
        photo: "https://example.com/photo.jpg",
        birthday: "2000-01-15",
        status: "ACTIVE",
        other_details: { parentName: "Jane Doe", emergencyContact: "+998907654321" },
        branchId: 1,
        branch: {
          id: 1,
          name: "Main Branch",
          address: "123 Education Street"
        },
        studentGroups: [
          {
            id: 1,
            group: {
              id: 5,
              name: "Math Group A",
              status: "ONGOING",
              days: ["MON", "WED", "FRI"],
              start_time: "09:00:00",
              start_date: "2025-01-15",
              end_date: "2025-06-15",
              course: { id: 1, name: "Advanced Mathematics", price: 500000 },
              teacher: { id: 1, fullname: "Prof. Smith" },
              room: { id: 1, name: "Room 101" }
            }
          }
        ],
        _count: { studentGroups: 2 },
        academicInfo: {
          totalGroups: 2,
          activeGroups: 1,
          plannedGroups: 0,
          completedGroups: 1,
          totalCoursesEnrolled: 2,
          currentCoursesEnrolled: 1
        }
      }
    }
  })
  @ApiNotFoundResponse({ description: 'Student not found' })
  findOne(@Param('id') id: string) {
    return this.studentsService.findOne(id);
  }

  /** -------------------- UPDATE (ADMIN/MANAGER) -------------------- */
  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ 
    summary: 'Update student information',
    description: 'Updates student details. Validates branch existence, checks for duplicate emails if email is being changed, and hashes passwords if provided.'
  })
  @ApiParam({ name: 'id', type: String, description: 'Student UUID to update' })
  @ApiOkResponse({ 
    description: 'Student updated successfully',
    schema: {
      example: {
        id: "uuid-student-id",
        fullname: "John Doe Updated",
        email: "john.doe.updated@example.com",
        phone: "+998901234567",
        gender: "MALE",
        photo: "https://example.com/new-photo.jpg",
        birthday: "2000-01-15",
        status: "ACTIVE",
        other_details: { parentName: "Jane Doe", notes: "Updated notes" },
        branchId: 1,
        branch: { id: 1, name: "Main Branch" },
        _count: { studentGroups: 2 }
      }
    }
  })
  @ApiNotFoundResponse({ description: 'Student not found' })
  @ApiConflictResponse({ description: 'Student with this email already exists' })
  @ApiBadRequestResponse({ description: 'Invalid input data or branch not found' })
  update(@Param('id') id: string, @Body() updateStudentDto: UpdateStudentDto) {
    return this.studentsService.update(id, updateStudentDto);
  }

  /** -------------------- DELETE (ADMIN/MANAGER) -------------------- */
  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Delete a student',
    description: 'Deletes a student. Prevents deletion if student has active group enrollments to maintain data integrity.'
  })
  @ApiParam({ name: 'id', type: String, description: 'Student UUID to delete' })
  @ApiOkResponse({ 
    description: 'Student deleted successfully',
    schema: {
      example: {
        message: "Student deleted successfully"
      }
    }
  })
  @ApiNotFoundResponse({ description: 'Student not found' })
  @ApiConflictResponse({ description: 'Cannot delete student: has active group enrollments' })
  remove(@Param('id') id: string) {
    return this.studentsService.remove(id);
  }

  /** -------------------- GROUP ENROLLMENT MANAGEMENT (ADMIN/MANAGER) -------------------- */
  @Post('enroll')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Enroll student in a group',
    description: 'Enrolls a student in a specific group. Validates that both student and group exist and belong to the same branch. Prevents duplicate enrollments.'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        studentId: { type: 'string', example: 'uuid-student-id' },
        groupId: { type: 'number', example: 5 },
        branchId: { type: 'number', example: 1 }
      },
      required: ['studentId', 'groupId', 'branchId']
    }
  })
  @ApiCreatedResponse({ 
    description: 'Student enrolled successfully',
    schema: {
      example: {
        id: 15,
        groupId: 5,
        studentId: "uuid-student-id",
        branchId: 1,
        enrolledAt: "2025-10-23T10:30:00.000Z",
        student: {
          id: "uuid-student-id",
          fullname: "John Doe",
          email: "john.doe@example.com",
          phone: "+998901234567"
        },
        group: {
          id: 5,
          name: "Math Group A",
          status: "ONGOING",
          course: { id: 1, name: "Advanced Mathematics", price: 500000 }
        }
      }
    }
  })
  @ApiNotFoundResponse({ description: 'Student or group not found' })
  @ApiConflictResponse({ description: 'Student is already enrolled in this group' })
  @ApiBadRequestResponse({ description: 'Student and group must belong to the same branch' })
  enrollStudent(@Body() enrollStudentDto: EnrollStudentDto) {
    return this.studentsService.enrollStudent(enrollStudentDto);
  }

  @Delete(':studentId/groups/:groupId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Unenroll student from a group',
    description: 'Removes a student from a specific group enrollment. This action cannot be undone and may affect academic records.'
  })
  @ApiParam({ name: 'studentId', type: String, description: 'Student UUID' })
  @ApiParam({ name: 'groupId', type: Number, description: 'Group ID' })
  @ApiOkResponse({ 
    description: 'Student unenrolled successfully',
    schema: {
      example: {
        message: "Student unenrolled successfully"
      }
    }
  })
  @ApiNotFoundResponse({ description: 'Student enrollment not found' })
  unenrollStudent(
    @Param('studentId') studentId: string,
    @Param('groupId') groupId: string
  ) {
    return this.studentsService.unenrollStudent(parseInt(groupId), studentId);
  }

  @Get(':id/groups')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.TEACHER)
  @ApiOperation({ 
    summary: 'Get student group enrollments',
    description: 'Retrieves all group enrollments for a specific student including current and historical enrollments with course and schedule details.'
  })
  @ApiParam({ name: 'id', type: String, description: 'Student UUID' })
  @ApiQuery({ name: 'status', required: false, enum: ['PLANNED', 'ONGOING', 'COMPLETED'], description: 'Filter by group status' })
  @ApiOkResponse({ 
    description: 'Student group enrollments retrieved successfully',
    schema: {
      example: {
        studentId: "uuid-student-id",
        studentName: "John Doe",
        enrollments: [
          {
            id: 15,
            groupId: 5,
            enrolledAt: "2025-01-15T08:00:00.000Z",
            group: {
              id: 5,
              name: "Math Group A",
              status: "ONGOING",
              days: ["MON", "WED", "FRI"],
              start_time: "09:00:00",
              start_date: "2025-01-15",
              end_date: "2025-06-15",
              course: { id: 1, name: "Advanced Mathematics", price: 500000 },
              teacher: { id: 1, fullname: "Prof. Smith" },
              room: { id: 1, name: "Room 101" }
            }
          }
        ]
      }
    }
  })
  @ApiNotFoundResponse({ description: 'Student not found' })
  getStudentGroups(
    @Param('id') id: string,
    @Query('status') status?: string
  ) {
    // This would be implemented as a separate method in the service
    return this.studentsService.findOne(id).then(student => ({
      studentId: student.id,
      studentName: student.fullname,
      enrollments: status 
        ? student.studentGroups.filter(sg => sg.group.status === status)
        : student.studentGroups
    }));
  }
}
