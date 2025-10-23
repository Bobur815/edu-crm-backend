// src/auth/auth.controller.ts
import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiBody, ApiConsumes, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { CreateTeacherDto } from 'src/teachers/dto/create-teacher.dto';
import { CreateStudentDto } from 'src/students/dto/create-student.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { toPublicUrl, uploadStudentPhoto, uploadTeacherPhoto, uploadUserPhoto } from 'src/common/upload/upload.util';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly auth: AuthService) { }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Login with email or phone and password' })
    @ApiBody({ type: LoginDto })
    @ApiOkResponse({ description: 'Returns access & refresh tokens with principal' })
    @ApiBadRequestResponse({ description: 'Invalid credentials' })
    async login(@Body() dto: LoginDto) {        
        return this.auth.login(dto);
    }

    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get new access & refresh tokens using refresh token' })
    @ApiBody({ schema: { properties: { refreshToken: { type: 'string' } }, required: ['refreshToken'] } })
    @ApiOkResponse({ description: 'New tokens issued' })
    async refresh(@Body('refreshToken') refreshToken: string) {
        return this.auth.refresh(refreshToken);
    }

    // ---------- Register User (with optional photo) ----------
    @Post('register/user')
    @ApiOperation({ summary: 'Register an admin/manager user (no tokens)' })
    @ApiConsumes('multipart/form-data')
    @UseInterceptors(uploadUserPhoto())
    @ApiCreatedResponse({ description: 'User created' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                name: { type: 'string', example: 'Admin User' },
                email: { type: 'string', example: 'admin@example.com' },
                phone: { type: 'string', example: '+998901234567' },
                password: { type: 'string', example: 'secret123', minLength: 6 },
                photo: { type: 'string', format: 'binary' },
                role: { type: 'string', example: 'ADMIN' },
                branchId: { type: 'integer', example: 1, nullable: true },
            },
            required: ['name', 'email', 'password', 'role'],
        },
    })
    async registerUser(@Body() dto: CreateUserDto, @UploadedFile() file?: Express.Multer.File) {
        if (file) dto.photo = toPublicUrl(file, 'users');
        return this.auth.registerUser(dto);
    }

    // ---------- Register Teacher (with optional photo) ----------
    @Post('register/teacher')
    @ApiOperation({ summary: 'Register a teacher (no tokens)' })
    @ApiConsumes('multipart/form-data')
    @UseInterceptors(uploadTeacherPhoto())
    @ApiCreatedResponse({ description: 'Teacher created' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                phone: { type: 'string', example: '+998901234567' },
                email: { type: 'string', example: 'teacher@example.com', nullable: true },
                fullname: { type: 'string', example: 'John Smith' },
                gender: { type: 'string', example: 'MALE' },
                photo: { type: 'string', format: 'binary' },
                birthday: { type: 'string', example: '1990-05-10T00:00:00.000Z', nullable: true },
                password: { type: 'string', example: 'secret123', nullable: true },
                branchId: { type: 'integer', example: 1 },
                status: { type: 'string', example: 'ACTIVE', nullable: true },
                description: { type: 'string', example: 'IELTS instructor', nullable: true },
            },
            required: ['phone', 'fullname', 'gender', 'branchId'],
        },
    })
    async registerTeacher(@Body() dto: CreateTeacherDto, @UploadedFile() file?: Express.Multer.File) {
        if (file) dto.photo = toPublicUrl(file, 'teachers');
        return this.auth.registerTeacher(dto);
    }

    // ---------- Register Student (with optional photo) ----------
    @Post('register/student')
    @ApiOperation({ summary: 'Register a student (no tokens)' })
    @ApiConsumes('multipart/form-data')
    @UseInterceptors(uploadStudentPhoto())
    @ApiCreatedResponse({ description: 'Student created' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                fullname: { type: 'string', example: 'Laylo Abdullayeva' },
                email: { type: 'string', example: 'student@example.com', nullable: true },
                password: { type: 'string', example: 'secret123', nullable: true },
                phone: { type: 'string', example: '+998931112233', nullable: true },
                gender: { type: 'string', example: 'FEMALE', nullable: true },
                photo: { type: 'string', format: 'binary' },
                birthday: { type: 'string', example: '2006-09-01', nullable: true },
                status: { type: 'string', example: 'ACTIVE', nullable: true },
                other_details: {
                    type: 'object',
                    example: { parentName: 'Karimov Akmal', notes: 'Allergic to penicillin' },
                    nullable: true,
                },
                branchId: { type: 'integer', example: 1 },
            },
            required: ['fullname', 'branchId'],
        },
    })
    async registerStudent(@Body() dto: CreateStudentDto, @UploadedFile() file?: Express.Multer.File) {
        if (file) dto.photo = toPublicUrl(file, 'students');
        return this.auth.registerStudent(dto);
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get current principal (from JWT access token)' })
    @ApiOkResponse({ description: 'Returns principal from token' })
    me(@Req() req: any) {
        return req.user; // { sub, role }
    }
}
