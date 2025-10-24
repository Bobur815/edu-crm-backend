// src/teachers/teachers.controller.ts
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
    ParseIntPipe,
    ValidationPipe,
    HttpStatus,
    UploadedFile,
    UseInterceptors,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiConsumes,
    ApiParam,
    ApiQuery,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { TeachersService } from './teachers.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { ListTeachersDto, ListTeachersResponseDto, TeacherResponseDto, TeacherStatsDto } from './dto/list-teachers.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, TeacherStatus } from '@prisma/client';
import { diskStorage } from 'multer';
import { extname } from 'path';

@ApiTags('Teachers')
@Controller('teachers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TeachersController {
    constructor(private readonly teachersService: TeachersService) { }

    @Post()
    @Roles(UserRole.ADMIN, UserRole.MANAGER)
    @ApiOperation({ summary: 'Create a new teacher' })
    @ApiResponse({
        status: HttpStatus.CREATED,
        description: 'Teacher created successfully',
        type: TeacherResponseDto,
    })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: 'Invalid input data',
    })
    @ApiResponse({
        status: HttpStatus.CONFLICT,
        description: 'Teacher with email or phone already exists',
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Branch not found',
    })
    async create(
        @Body(ValidationPipe) createTeacherDto: CreateTeacherDto,
    ): Promise<TeacherResponseDto> {
        return this.teachersService.create(createTeacherDto);
    }

    @Get()
    @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.TEACHER)
    @ApiOperation({ summary: 'Get all teachers with filtering and pagination' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Teachers retrieved successfully',
        type: ListTeachersResponseDto,
    })
    @ApiQuery({ name: 'page', required: false, example: 1 })
    @ApiQuery({ name: 'limit', required: false, example: 10 })
    @ApiQuery({ name: 'search', required: false, example: 'John' })
    @ApiQuery({ name: 'branchId', required: false, example: 1 })
    @ApiQuery({ name: 'status', required: false, enum: TeacherStatus })
    @ApiQuery({ name: 'gender', required: false, enum: ['MALE', 'FEMALE'] })
    @ApiQuery({ name: 'phone', required: false, example: '+998901234567' })
    @ApiQuery({ name: 'email', required: false, example: 'teacher@example.com' })
    @ApiQuery({ name: 'sortBy', required: false, example: 'fullname' })
    @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
    async findAll(
        @Query(ValidationPipe) listTeachersDto: ListTeachersDto,
    ): Promise<ListTeachersResponseDto> {
        return this.teachersService.findAll(listTeachersDto);
    }

    @Get('stats')
    @Roles(UserRole.ADMIN, UserRole.MANAGER)
    @ApiOperation({ summary: 'Get teacher statistics' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Teacher statistics retrieved successfully',
        type: TeacherStatsDto,
    })
    async getStats(): Promise<TeacherStatsDto> {
        return this.teachersService.getStats();
    }

    @Get('branch/:branchId')
    @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.TEACHER)
    @ApiOperation({ summary: 'Get teachers by branch' })
    @ApiParam({ name: 'branchId', example: 1 })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Teachers retrieved successfully',
        type: [TeacherResponseDto],
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Branch not found',
    })
    async findByBranch(
        @Param('branchId', ParseIntPipe) branchId: number,
    ): Promise<TeacherResponseDto[]> {
        return this.teachersService.findByBranch(branchId);
    }

    @Get(':id')
    @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.TEACHER)
    @ApiOperation({ summary: 'Get teacher by ID' })
    @ApiParam({ name: 'id', example: 1 })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Teacher retrieved successfully',
        type: TeacherResponseDto,
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Teacher not found',
    })
    async findOne(
        @Param('id', ParseIntPipe) id: number,
    ): Promise<TeacherResponseDto> {
        return this.teachersService.findOne(id);
    }

    @Get(':id/groups')
    @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.TEACHER)
    @ApiOperation({ summary: 'Get teacher groups' })
    @ApiParam({ name: 'id', example: 1 })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Teacher groups retrieved successfully',
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Teacher not found',
    })
    async getTeacherGroups(@Param('id', ParseIntPipe) id: number) {
        return this.teachersService.getTeacherGroups(id);
    }

    @Patch(':id')
    @Roles(UserRole.ADMIN, UserRole.MANAGER)
    @ApiOperation({ summary: 'Update teacher' })
    @ApiParam({ name: 'id', example: 1 })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Teacher updated successfully',
        type: TeacherResponseDto,
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Teacher not found',
    })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: 'Invalid input data',
    })
    @ApiResponse({
        status: HttpStatus.CONFLICT,
        description: 'Teacher with email already exists',
    })
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body(ValidationPipe) updateTeacherDto: UpdateTeacherDto,
    ): Promise<TeacherResponseDto> {
        return this.teachersService.update(id, updateTeacherDto);
    }

    @Patch(':id/status')
    @Roles(UserRole.ADMIN, UserRole.MANAGER)
    @ApiOperation({ summary: 'Update teacher status' })
    @ApiParam({ name: 'id', example: 1 })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Teacher status updated successfully',
        type: TeacherResponseDto,
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Teacher not found',
    })
    @ApiResponse({
        status: HttpStatus.CONFLICT,
        description: 'Cannot deactivate teacher with active groups',
    })
    async updateStatus(
        @Param('id', ParseIntPipe) id: number,
        @Body('status') status: TeacherStatus,
    ): Promise<TeacherResponseDto> {
        return this.teachersService.updateStatus(id, status);
    }

    @Post(':id/upload-photo')
    @Roles(UserRole.ADMIN, UserRole.MANAGER)
    @ApiOperation({ summary: 'Upload teacher photo' })
    @ApiConsumes('multipart/form-data')
    @ApiParam({ name: 'id', example: 1 })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Photo uploaded successfully',
        schema: {
            type: 'object',
            properties: {
                message: { type: 'string', example: 'Photo uploaded successfully' },
                photoUrl: { type: 'string', example: '/uploads/photo/teachers/1234567890.jpg' },
            },
        },
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Teacher not found',
    })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: 'Invalid file format',
    })
    @UseInterceptors(
        FileInterceptor('photo', {
            storage: diskStorage({
                destination: './uploads/photo/teachers',
                filename: (req, file, cb) => {
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                    cb(null, uniqueSuffix + extname(file.originalname));
                },
            }),
            fileFilter: (req, file, cb) => {
                if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
                    return cb(new Error('Only image files are allowed'), false);
                }
                cb(null, true);
            },
            limits: {
                fileSize: 5 * 1024 * 1024, // 5MB
            },
        }),
    )
    async uploadPhoto(
        @Param('id', ParseIntPipe) id: number,
        @UploadedFile() file: Express.Multer.File,
    ) {
        if (!file) {
            throw new Error('No file uploaded');
        }

        const photoUrl = `/uploads/photo/teachers/${file.filename}`;

        await this.teachersService.update(id, { photo: photoUrl });

        return {
            message: 'Photo uploaded successfully',
            photoUrl,
        };
    }

    @Delete(':id')
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Delete teacher' })
    @ApiParam({ name: 'id', example: 1 })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Teacher deleted successfully',
        schema: {
            type: 'object',
            properties: {
                message: { type: 'string', example: 'Teacher John Smith has been successfully deleted' },
            },
        },
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Teacher not found',
    })
    @ApiResponse({
        status: HttpStatus.CONFLICT,
        description: 'Cannot delete teacher with active groups',
    })
    async remove(@Param('id', ParseIntPipe) id: number) {
        return this.teachersService.remove(id);
    }
}
