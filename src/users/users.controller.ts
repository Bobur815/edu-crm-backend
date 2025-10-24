// src/users/users.controller.ts
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
  Request,
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
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { 
  ListUsersDto, 
  ListUsersResponseDto, 
  UserResponseDto, 
  UserStatsDto, 
  ChangePasswordDto, 
  ResetPasswordDto 
} from './dto/list-users.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { diskStorage } from 'multer';
import { extname } from 'path';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User created successfully',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'User with email already exists',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Branch not found',
  })
  async create(
    @Body(ValidationPipe) createUserDto: CreateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get all users with filtering and pagination' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Users retrieved successfully',
    type: ListUsersResponseDto,
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'search', required: false, example: 'admin' })
  @ApiQuery({ name: 'branchId', required: false, example: 1 })
  @ApiQuery({ name: 'role', required: false, enum: UserRole })
  @ApiQuery({ name: 'phone', required: false, example: '+998901234567' })
  @ApiQuery({ name: 'email', required: false, example: 'admin@example.com' })
  @ApiQuery({ name: 'sortBy', required: false, example: 'name' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  async findAll(
    @Query(ValidationPipe) listUsersDto: ListUsersDto,
  ): Promise<ListUsersResponseDto> {
    return this.usersService.findAll(listUsersDto);
  }

  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get user statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User statistics retrieved successfully',
    type: UserStatsDto,
  })
  async getStats(): Promise<UserStatsDto> {
    return this.usersService.getStats();
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User profile retrieved successfully',
    type: UserResponseDto,
  })
  async getProfile(@Request() req): Promise<UserResponseDto> {
    return this.usersService.findOne(req.user.id);
  }

  @Get('branch/:branchId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get users by branch' })
  @ApiParam({ name: 'branchId', example: 1 })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Users retrieved successfully',
    type: [UserResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Branch not found',
  })
  async findByBranch(
    @Param('branchId', ParseIntPipe) branchId: number,
  ): Promise<UserResponseDto[]> {
    return this.usersService.findByBranch(branchId);
  }

  @Get('role/:role')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get users by role' })
  @ApiParam({ name: 'role', enum: UserRole })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Users retrieved successfully',
    type: [UserResponseDto],
  })
  async findByRole(
    @Param('role') role: UserRole,
  ): Promise<UserResponseDto[]> {
    return this.usersService.findByRole(role);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User retrieved successfully',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<UserResponseDto> {
    return this.usersService.findOne(id);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Profile updated successfully',
    type: UserResponseDto,
  })
  async updateProfile(
    @Request() req,
    @Body(ValidationPipe) updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    // Users can only update their own profile and cannot change role
    const { role, ...allowedUpdates } = updateUserDto;
    return this.usersService.update(req.user.id, allowedUpdates);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update user' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User updated successfully',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'User with email already exists',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.update(id, updateUserDto);
  }

  @Patch(':id/role')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update user role' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User role updated successfully',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Cannot change role of the last admin user',
  })
  async updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body('role') role: UserRole,
  ): Promise<UserResponseDto> {
    return this.usersService.updateRole(id, role);
  }

  @Patch('change-password')
  @ApiOperation({ summary: 'Change current user password' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password changed successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Password changed successfully' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Current password is incorrect',
  })
  async changePassword(
    @Request() req,
    @Body(ValidationPipe) changePasswordDto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(req.user.id, changePasswordDto);
  }

  @Patch(':id/reset-password')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Reset user password (Admin only)' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password reset successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Password reset successfully for user John Doe' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  async resetPassword(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) resetPasswordDto: ResetPasswordDto,
  ) {
    return this.usersService.resetPassword(id, resetPasswordDto);
  }

  @Post('upload-photo')
  @ApiOperation({ summary: 'Upload user photo' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Photo uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Photo uploaded successfully' },
        photoUrl: { type: 'string', example: '/uploads/photo/users/1234567890.jpg' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid file format',
  })
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: diskStorage({
        destination: './uploads/photo/users',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, uniqueSuffix + extname(file.originalname));
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
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
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new Error('No file uploaded');
    }

    const photoUrl = `/uploads/photo/users/${file.filename}`;
    
    await this.usersService.update(req.user.id, { photo: photoUrl });

    return {
      message: 'Photo uploaded successfully',
      photoUrl,
    };
  }

  @Post(':id/upload-photo')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Upload photo for specific user' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Photo uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Photo uploaded successfully' },
        photoUrl: { type: 'string', example: '/uploads/photo/users/1234567890.jpg' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid file format',
  })
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: diskStorage({
        destination: './uploads/photo/users',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, uniqueSuffix + extname(file.originalname));
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
          return cb(new Error('Only image files are allowed'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  async uploadUserPhoto(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new Error('No file uploaded');
    }

    const photoUrl = `/uploads/photo/users/${file.filename}`;
    
    await this.usersService.update(id, { photo: photoUrl });

    return {
      message: 'Photo uploaded successfully',
      photoUrl,
    };
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete user' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'User John Doe has been successfully deleted' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Cannot delete the last admin user',
  })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
}
