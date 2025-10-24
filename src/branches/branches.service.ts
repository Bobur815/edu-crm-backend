import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { ListBranchesDto } from './dto/list-branches.dto';

@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateBranchDto) {
    return this.prisma.branch.create({
      data: {
        name: dto.name,
        region: dto.region,
        district: dto.district,
        address: dto.address,
        phone: dto.phone,
        status: dto.status, // undefined -> Prisma keeps default
      },
    });
  }

  async findAll(query: ListBranchesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.BranchWhereInput = query.search
      ? { name: { contains: query.search, mode: 'insensitive' } }
      : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.branch.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'desc' },
      }),
      this.prisma.branch.count({ where }),
    ]);

    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const branch = await this.prisma.branch.findUnique({ where: { id } });
    if (!branch) throw new NotFoundException('Branch not found');
    return branch;
  }

  async update(id: number, dto: UpdateBranchDto) {
    try {
      return await this.prisma.branch.update({
        where: { id },
        data: {
          name: dto.name,
          region: dto.region,
          district: dto.district,
          address: dto.address,
          phone: dto.phone,
          status: dto.status,
        },
      });
    } catch (e) {
      // When not found, Prisma throws P2025
      throw new NotFoundException('Branch not found');
    }
  }

  async remove(id: number) {
    try {
      await this.prisma.branch.delete({ where: { id } });
      return { success: true };
    } catch {
      throw new NotFoundException('Branch not found');
    }
  }
}
