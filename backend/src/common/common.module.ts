import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { QueueService } from './queue.service';
import { LoggerService } from './logger.service';

@Global()
@Module({
  providers: [PrismaService, QueueService, LoggerService],
  exports: [PrismaService, QueueService, LoggerService],
})
export class CommonModule {}
