// src/prisma/prisma.service.ts
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(PrismaService.name)

    constructor() {
        super({ log: ['info', 'warn', 'error'] });
    }

    async onModuleInit() {
        try {
            await this.$connect()
            this.logger.log('Database successfully connected')
        } catch (error) {
            this.logger.error('Database connection failed', error);
            throw error;
        }
    }

    async onModuleDestroy() {
        try {
            await this.$disconnect();
            this.logger.log('Database successfully disconnected');
        } catch (error) {
            this.logger.error('Database disconnection failed', error);
            throw error;
        }
    }
}