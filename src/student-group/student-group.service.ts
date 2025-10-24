// src/student-group/student-group.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { StudentGroupDto, UpdateStudentGroupDto } from './dto/student-group.dto';

@Injectable()
export class StudentGroupService {
    constructor(private readonly prisma: PrismaService) {}

    async findAll() {
        return this.prisma.studentGroup.findMany();
    }

    async findOne(id: number) {
        return this.prisma.studentGroup.findUnique({ where: { id } });
    }

    async create(data: StudentGroupDto) {
        return this.prisma.studentGroup.create({ data });
    }

    async update(id: number, data: UpdateStudentGroupDto) {
        return this.prisma.studentGroup.update({ where: { id }, data });
    }

    async remove(id: number) {
        return this.prisma.studentGroup.delete({ where: { id } });
    }
}
