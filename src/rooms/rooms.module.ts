// src/rooms/rooms.module.ts
import { Module } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { RoomsController } from './rooms.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RoomsController],
  providers: [RoomsService],
  exports: [RoomsService] // Export service for use in other modules (like groups)
})
export class RoomsModule {}
