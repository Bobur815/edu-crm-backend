import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { UsersModule } from './users/users.module';
import { UsersController } from './users/users.controller';
import { UsersService } from './users/users.service';
import { BranchesModule } from './branches/branches.module';
import { BranchesController } from './branches/branches.controller';
import { BranchesService } from './branches/branches.service';
import { RoomsModule } from './rooms/rooms.module';
import { RoomsController } from './rooms/rooms.controller';
import { RoomsService } from './rooms/rooms.service';
import { CategoriesModule } from './categories/categories.module';
import { CategoriesController } from './categories/categories.controller';
import { CategoriesService } from './categories/categories.service';
import { CoursesModule } from './courses/courses.module';
import { CoursesController } from './courses/courses.controller';
import { CoursesService } from './courses/courses.service';
import { TeachersModule } from './teachers/teachers.module';
import { TeachersController } from './teachers/teachers.controller';
import { TeachersService } from './teachers/teachers.service';
import { StudentsModule } from './students/students.module';
import { StudentsController } from './students/students.controller';
import { StudentsService } from './students/students.service';
import { GroupsModule } from './groups/groups.module';
import { GroupsController } from './groups/groups.controller';
import { GroupsService } from './groups/groups.service';
import { StudentGroupModule } from './student-group/student-group.module';
import { StudentGroupController } from './student-group/student-group.controller';
import { StudentGroupService } from './student-group/student-group.service';
import { JwtModule } from '@nestjs/jwt';
import { AdminSeeder } from './prisma/seed/admin.seedor';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule, JwtModule, UsersModule, BranchesModule, RoomsModule, CategoriesModule, CoursesModule, TeachersModule, StudentsModule, GroupsModule, StudentGroupModule],
  controllers: [AuthController, UsersController, BranchesController, RoomsController, CategoriesController, CoursesController, TeachersController, StudentsController, GroupsController, StudentGroupController],
  providers: [AuthService, AdminSeeder, UsersService, BranchesService, RoomsService, CategoriesService, CoursesService, TeachersService, StudentsService, GroupsService, StudentGroupService],
})
export class AppModule { }
