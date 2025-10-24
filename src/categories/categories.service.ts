import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateCategoryDto) {
    return this.prisma.courseCategory.create({
      data: {
        name: dto.name,
        branchId: dto.branchId,
      },
    });
  }

  findAll(branchId?: number) {
    const where: Prisma.CourseCategoryWhereInput = branchId
      ? { branchId }
      : {};
    return this.prisma.courseCategory.findMany({
      where,
      orderBy: { id: 'desc' },
    });
  }

  async findOne(id: number) {
    const item = await this.prisma.courseCategory.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Category not found');
    return item;
  }

  async update(id: number, dto: UpdateCategoryDto) {
    try {
      return await this.prisma.courseCategory.update({
        where: { id },
        data: {
          name: dto.name,
          branchId: dto.branchId,
        },
      });
    } catch {
      throw new NotFoundException('Category not found');
    }
  }

  async remove(id: number) {
    try {
      await this.prisma.courseCategory.delete({ where: { id } });
      return { success: true };
    } catch {
      throw new NotFoundException('Category not found');
    }
  }
}