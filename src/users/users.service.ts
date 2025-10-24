// src/users/users.service.ts
import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ListUsersDto, ListUsersResponseDto, UserResponseDto, UserStatsDto, ChangePasswordDto, ResetPasswordDto } from './dto/list-users.dto';
import { Prisma, User, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new user
   */
  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    this.logger.log(`Creating user: ${createUserDto.name} (${createUserDto.email})`);

    try {
      // Validate branch exists if provided
      if (createUserDto.branchId) {
        await this.validateBranchExists(createUserDto.branchId);
      }

      // Check for unique email
      await this.checkUniqueEmail(createUserDto.email);

      // Hash password
      const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

      const user = await this.prisma.user.create({
        data: {
          name: createUserDto.name,
          email: createUserDto.email,
          phone: createUserDto.phone,
          password: hashedPassword,
          photo: createUserDto.photo,
          role: createUserDto.role,
          branchId: createUserDto.branchId,
        },
        include: {
          branch: true,
        },
      });

      this.logger.log(`User created successfully with ID: ${user.id}`);
      return this.formatUserResponse(user);
    } catch (error) {
      this.logger.error(`Failed to create user: ${error.message}`, error.stack);
      this.handlePrismaError(error);
      throw error;
    }
  }

  /**
   * Get all users with filtering and pagination
   */
  async findAll(listUsersDto: ListUsersDto): Promise<ListUsersResponseDto> {
    this.logger.log(`Fetching users with filters: ${JSON.stringify(listUsersDto)}`);

    try {
      const { page = 1, limit = 10, search, branchId, role, phone, email, sortBy = 'name', sortOrder = 'asc' } = listUsersDto;

      // Build where clause
      const where: Prisma.UserWhereInput = {};

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (branchId) {
        where.branchId = branchId;
      }

      if (role) {
        where.role = role;
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
      const orderBy: Prisma.UserOrderByWithRelationInput = {};
      if (sortBy === 'branch') {
        orderBy.branch = { name: sortOrder };
      } else {
        orderBy[sortBy as keyof Prisma.UserOrderByWithRelationInput] = sortOrder;
      }

      // Execute queries
      const [users, total] = await Promise.all([
        this.prisma.user.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          include: {
            branch: true,
          },
        }),
        this.prisma.user.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      this.logger.log(`Found ${users.length} users out of ${total} total`);

      return {
        data: users.map(user => this.formatUserResponse(user)),
        meta: {
          total,
          page,
          limit,
          totalPages,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to fetch users: ${error.message}`, error.stack);
      this.handlePrismaError(error);
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async findOne(id: number): Promise<UserResponseDto> {
    this.logger.log(`Fetching user with ID: ${id}`);

    try {
      const user = await this.prisma.user.findUnique({
        where: { id },
        include: {
          branch: true,
        },
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      this.logger.log(`User found: ${user.name} (${user.email})`);
      return this.formatUserResponse(user);
    } catch (error) {
      this.logger.error(`Failed to fetch user: ${error.message}`, error.stack);
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.handlePrismaError(error);
      throw error;
    }
  }

  /**
   * Get user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    this.logger.log(`Fetching user by email: ${email}`);

    try {
      const user = await this.prisma.user.findUnique({
        where: { email },
        include: {
          branch: true,
        },
      });

      return user;
    } catch (error) {
      this.logger.error(`Failed to fetch user by email: ${error.message}`, error.stack);
      this.handlePrismaError(error);
      throw error;
    }
  }

  /**
   * Update user
   */
  async update(id: number, updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
    this.logger.log(`Updating user with ID: ${id}`);

    try {
      // Check if user exists
      const existingUser = await this.prisma.user.findUnique({
        where: { id },
      });

      if (!existingUser) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      // Validate branch if provided
      if (updateUserDto.branchId) {
        await this.validateBranchExists(updateUserDto.branchId);
      }

      // Check unique email if being updated
      if (updateUserDto.email && updateUserDto.email !== existingUser.email) {
        await this.checkUniqueEmail(updateUserDto.email, id);
      }

      // Hash password if provided
      let hashedPassword: string | undefined;
      if (updateUserDto.password) {
        hashedPassword = await bcrypt.hash(updateUserDto.password, 10);
      }

      const updatedUser = await this.prisma.user.update({
        where: { id },
        data: {
          ...(updateUserDto.name && { name: updateUserDto.name }),
          ...(updateUserDto.email && { email: updateUserDto.email }),
          ...(updateUserDto.phone !== undefined && { phone: updateUserDto.phone }),
          ...(hashedPassword && { password: hashedPassword }),
          ...(updateUserDto.photo !== undefined && { photo: updateUserDto.photo }),
          ...(updateUserDto.role && { role: updateUserDto.role }),
          ...(updateUserDto.branchId !== undefined && { branchId: updateUserDto.branchId }),
        },
        include: {
          branch: true,
        },
      });

      this.logger.log(`User updated successfully: ${updatedUser.name} (${updatedUser.email})`);
      return this.formatUserResponse(updatedUser);
    } catch (error) {
      this.logger.error(`Failed to update user: ${error.message}`, error.stack);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.handlePrismaError(error);
      throw error;
    }
  }

  /**
   * Delete user
   */
  async remove(id: number): Promise<{ message: string }> {
    this.logger.log(`Deleting user with ID: ${id}`);

    try {
      // Check if user exists
      const user = await this.prisma.user.findUnique({
        where: { id },
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      // Prevent deletion of ADMIN users if it's the last admin
      if (user.role === UserRole.ADMIN) {
        const adminCount = await this.prisma.user.count({
          where: { role: UserRole.ADMIN },
        });

        if (adminCount <= 1) {
          throw new ForbiddenException('Cannot delete the last admin user');
        }
      }

      await this.prisma.user.delete({
        where: { id },
      });

      this.logger.log(`User deleted successfully: ${user.name} (${user.email})`);
      return { message: `User ${user.name} has been successfully deleted` };
    } catch (error) {
      this.logger.error(`Failed to delete user: ${error.message}`, error.stack);
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      this.handlePrismaError(error);
      throw error;
    }
  }

  /**
   * Get user statistics
   */
  async getStats(): Promise<UserStatsDto> {
    this.logger.log('Fetching user statistics');

    try {
      const [
        totalUsers,
        adminUsers,
        managerUsers,
        teacherUsers,
        studentUsers,
        usersWithBranch,
        usersWithoutBranch,
        usersByBranch,
        usersByRole,
      ] = await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { role: UserRole.ADMIN } }),
        this.prisma.user.count({ where: { role: UserRole.MANAGER } }),
        this.prisma.user.count({ where: { role: UserRole.TEACHER } }),
        this.prisma.user.count({ where: { role: UserRole.STUDENT } }),
        this.prisma.user.count({ where: { branchId: { not: null } } }),
        this.prisma.user.count({ where: { branchId: null } }),
        this.prisma.user.groupBy({
          by: ['branchId'],
          where: { branchId: { not: null } },
          _count: {
            id: true,
          },
          orderBy: {
            _count: {
              id: 'desc',
            },
          },
        }),
        this.prisma.user.groupBy({
          by: ['role'],
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
      const branchIds = usersByBranch.map(item => item.branchId!);
      const branches = await this.prisma.branch.findMany({
        where: { id: { in: branchIds } },
        select: { id: true, name: true },
      });

      const branchMap = new Map(branches.map(branch => [branch.id, branch.name]));

      const usersByBranchWithNames = usersByBranch.map(item => ({
        branchId: item.branchId!,
        branchName: branchMap.get(item.branchId!) || 'Unknown Branch',
        userCount: item._count.id,
      }));

      const usersByRoleFormatted = usersByRole.map(item => ({
        role: item.role,
        count: item._count.id,
      }));

      this.logger.log('User statistics fetched successfully');

      return {
        totalUsers,
        adminUsers,
        managerUsers,
        teacherUsers,
        studentUsers,
        usersWithBranch,
        usersWithoutBranch,
        usersByBranch: usersByBranchWithNames,
        usersByRole: usersByRoleFormatted,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch user statistics: ${error.message}`, error.stack);
      this.handlePrismaError(error);
      throw error;
    }
  }

  /**
   * Find users by branch
   */
  async findByBranch(branchId: number): Promise<UserResponseDto[]> {
    this.logger.log(`Fetching users for branch ID: ${branchId}`);

    try {
      await this.validateBranchExists(branchId);

      const users = await this.prisma.user.findMany({
        where: { branchId },
        include: {
          branch: true,
        },
        orderBy: { name: 'asc' },
      });

      this.logger.log(`Found ${users.length} users for branch ${branchId}`);
      return users.map(user => this.formatUserResponse(user));
    } catch (error) {
      this.logger.error(`Failed to fetch users by branch: ${error.message}`, error.stack);
      this.handlePrismaError(error);
      throw error;
    }
  }

  /**
   * Find users by role
   */
  async findByRole(role: UserRole): Promise<UserResponseDto[]> {
    this.logger.log(`Fetching users with role: ${role}`);

    try {
      const users = await this.prisma.user.findMany({
        where: { role },
        include: {
          branch: true,
        },
        orderBy: { name: 'asc' },
      });

      this.logger.log(`Found ${users.length} users with role ${role}`);
      return users.map(user => this.formatUserResponse(user));
    } catch (error) {
      this.logger.error(`Failed to fetch users by role: ${error.message}`, error.stack);
      this.handlePrismaError(error);
      throw error;
    }
  }

  /**
   * Change user password
   */
  async changePassword(id: number, changePasswordDto: ChangePasswordDto): Promise<{ message: string }> {
    this.logger.log(`Changing password for user ID: ${id}`);

    try {
      const user = await this.prisma.user.findUnique({
        where: { id },
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(changePasswordDto.currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        throw new BadRequestException('Current password is incorrect');
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);

      await this.prisma.user.update({
        where: { id },
        data: { password: hashedNewPassword },
      });

      this.logger.log(`Password changed successfully for user: ${user.name}`);
      return { message: 'Password changed successfully' };
    } catch (error) {
      this.logger.error(`Failed to change password: ${error.message}`, error.stack);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.handlePrismaError(error);
      throw error;
    }
  }

  /**
   * Reset user password (Admin only)
   */
  async resetPassword(id: number, resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    this.logger.log(`Resetting password for user ID: ${id}`);

    try {
      const user = await this.prisma.user.findUnique({
        where: { id },
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(resetPasswordDto.newPassword, 10);

      await this.prisma.user.update({
        where: { id },
        data: { password: hashedNewPassword },
      });

      this.logger.log(`Password reset successfully for user: ${user.name}`);
      return { message: `Password reset successfully for user ${user.name}` };
    } catch (error) {
      this.logger.error(`Failed to reset password: ${error.message}`, error.stack);
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.handlePrismaError(error);
      throw error;
    }
  }

  /**
   * Update user role
   */
  async updateRole(id: number, role: UserRole): Promise<UserResponseDto> {
    this.logger.log(`Updating role for user ID: ${id} to ${role}`);

    try {
      const user = await this.prisma.user.findUnique({
        where: { id },
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      // Prevent role change from ADMIN if it's the last admin
      if (user.role === UserRole.ADMIN && role !== UserRole.ADMIN) {
        const adminCount = await this.prisma.user.count({
          where: { role: UserRole.ADMIN },
        });

        if (adminCount <= 1) {
          throw new ForbiddenException('Cannot change role of the last admin user');
        }
      }

      const updatedUser = await this.prisma.user.update({
        where: { id },
        data: { role },
        include: {
          branch: true,
        },
      });

      this.logger.log(`Role updated successfully for user: ${updatedUser.name} -> ${role}`);
      return this.formatUserResponse(updatedUser);
    } catch (error) {
      this.logger.error(`Failed to update user role: ${error.message}`, error.stack);
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
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

  private async checkUniqueEmail(email: string, excludeId?: number): Promise<void> {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        email,
        ...(excludeId && { id: { not: excludeId } }),
      },
    });

    if (existingUser) {
      throw new ConflictException(`User with email ${email} already exists`);
    }
  }

  private formatUserResponse(user: any): UserResponseDto {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      photo: user.photo,
      role: user.role,
      branchId: user.branchId,
      branch: user.branch ? {
        id: user.branch.id,
        name: user.branch.name,
        region: user.branch.region,
        district: user.branch.district,
        address: user.branch.address,
        phone: user.branch.phone,
        status: user.branch.status,
      } : undefined,
    };
  }

  private handlePrismaError(error: any): void {
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0];
      throw new ConflictException(`User with this ${field} already exists`);
    }
    if (error.code === 'P2025') {
      throw new NotFoundException('User not found');
    }
    if (error.code === 'P2003') {
      throw new BadRequestException('Invalid foreign key reference');
    }
  }
}
