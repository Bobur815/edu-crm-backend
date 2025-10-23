import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class CategorySeeder implements OnModuleInit {
    private readonly logger = new Logger(CategorySeeder.name);
    constructor(private readonly prisma: PrismaService) { }

    async onModuleInit() {
        const categories: Array<{ name: string; branchId: number }> = [
            { name: 'General English', branchId: 1 },
            { name: 'Spoken English', branchId: 1 },
            { name: 'IELTS', branchId: 1 },
            { name: 'TOEFL', branchId: 1 },
            { name: 'Academic Writing', branchId: 1 },
            { name: 'Mathematics (Algebra)', branchId: 1 },
            { name: 'SMM', branchId: 1 },
            { name: 'Physics', branchId: 1 },
            { name: 'Chemistry', branchId: 1 },
            { name: 'Biology', branchId: 1 },
            { name: 'Frontend Development', branchId: 2 },
            { name: 'Backend Development', branchId: 2 }
        ];

        for (const cat of categories) {
            await this.prisma.courseCategory.upsert({
                where: { branchId_name: { branchId: cat.branchId, name: cat.name } }, // uses @@unique
                update: {}, // nothing to update (only name+branchId)
                create: { name: cat.name, branchId: cat.branchId }
            });
        }

        this.logger.log(`✅ Categories seeded (${categories.length} items)`);
    }
}
