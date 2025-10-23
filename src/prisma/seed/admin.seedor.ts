import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs'; // ✅ use bcryptjs to avoid native build issues
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AdminSeeder implements OnModuleInit {
  private readonly logger = new Logger(AdminSeeder.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    await this.seedAdmin();
  }

  private async seedAdmin() {
    const email = this.config.get<string>('ADMIN_EMAIL') || 'ergashevboburmirzo815@gmail.com';
    const password = this.config.get<string>('ADMIN_PASSWORD') || '123456';
    const fullName = this.config.get<string>('ADMIN_FULL_NAME') || 'Boburmirzo';

    const existingAdmin = await this.prisma.user.findFirst({
      where: { role: UserRole.ADMIN },
      select: { id: true },
    });

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await this.prisma.user.upsert({
        where: { email }, // email must be unique in Prisma (it is)
        update: {
          name: fullName,
          role: UserRole.ADMIN,
          password: hashedPassword,
        },
        create: {
          email,
          name: fullName,
          role: UserRole.ADMIN,
          password: hashedPassword,
        },
      });
      this.logger.log('✅ Admin created');
    } else {
      this.logger.log('ℹ️ Admin already exists');
    }
  }
}
