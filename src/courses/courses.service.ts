import { Injectable } from '@nestjs/common';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CoursesService {
  constructor(private prisma: PrismaService) {}

  create(data: CreateCourseDto) {
    return this.prisma.course.create({ data });
  }
  findAll(branchId?: number) {
    return this.prisma.course.findMany({
      where: { branchId: branchId ?? undefined },
      include: { category: true },
      orderBy: { id: 'desc' },
    });
  }
  findOne(id: number) {
    return this.prisma.course.findUnique({ where: { id } });
  }
  update(id: number, data: UpdateCourseDto) {
    return this.prisma.course.update({ where: { id }, data });
  }
  remove(id: number) {
    return this.prisma.course.delete({ where: { id } });
  }
}
