import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { LoggerService } from './logger.service';

@Injectable()
export class QueueService implements OnModuleInit {
  private connection: IORedis;
  public videoQueue: Queue;
  public processingQueue: Queue;
  private workers: Map<string, Worker> = new Map();

  constructor(
    private configService: ConfigService,
    private logger: LoggerService,
  ) {}

  async onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
    
    this.connection = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

    this.videoQueue = new Queue('video-processing', { connection: this.connection });
    this.processingQueue = new Queue('ai-processing', { connection: this.connection });

    this.logger.log('QueueService initialized with Redis');
  }

  async addVideoJob(jobType: string, data: any, opts: any = {}) {
    const job = await this.videoQueue.add(jobType, data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      ...opts,
    });
    
    this.logger.log(`Added video job ${job.id} of type ${jobType}`);
    return job;
  }

  async addProcessingJob(jobType: string, data: any, opts: any = {}) {
    const job = await this.processingQueue.add(jobType, data, {
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 3000,
      },
      ...opts,
    });
    
    this.logger.log(`Added processing job ${job.id} of type ${jobType}`);
    return job;
  }

  registerWorker(queueName: string, processor: (job: Job) => Promise<any>) {
    const worker = new Worker(queueName, processor, { connection: this.connection });
    
    worker.on('completed', (job) => {
      this.logger.log(`Job ${job.id} completed`);
    });
    
    worker.on('failed', (job, err) => {
      this.logger.error(`Job ${job?.id} failed: ${err.message}`);
    });

    this.workers.set(queueName, worker);
    return worker;
  }

  async getJobStatus(queueName: string, jobId: string) {
    const queue = queueName === 'video-processing' ? this.videoQueue : this.processingQueue;
    const job = await queue.getJob(jobId);
    
    if (!job) return null;
    
    const state = await job.getState();
    const progress = job.progress || 0;
    
    return {
      id: job.id,
      state,
      progress,
      data: job.data,
      returnvalue: job.returnvalue,
      failedReason: job.failedReason,
    };
  }
}
