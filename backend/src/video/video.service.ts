import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { PrismaService } from '../common/prisma.service';
import { QueueService } from '../common/queue.service';
import { LoggerService } from '../common/logger.service';
import { ProjectStatus, SourceType } from '@prisma/client';

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const exists = promisify(fs.exists);

@Injectable()
export class VideoService {
  private uploadDir: string;
  private processedDir: string;

  constructor(
    private prisma: PrismaService,
    private queueService: QueueService,
    private configService: ConfigService,
    private logger: LoggerService,
  ) {
    this.uploadDir = this.configService.get<string>('UPLOAD_DIR') || './uploads';
    this.processedDir = this.configService.get<string>('PROCESSED_DIR') || './processed';
    this.ensureDirectories();
  }

  private async ensureDirectories() {
    const dirs = [this.uploadDir, this.processedDir];
    for (const dir of dirs) {
      if (!await exists(dir)) {
        await mkdir(dir, { recursive: true });
      }
    }
  }

  async saveUploadedFile(projectId: string, file: Express.Multer.File): Promise<string> {
    const projectDir = path.join(this.uploadDir, projectId);
    await mkdir(projectDir, { recursive: true });

    const fileName = `original${path.extname(file.originalname)}`;
    const filePath = path.join(projectDir, fileName);

    await writeFile(filePath, file.buffer);

    await this.prisma.project.update({
      where: { id: projectId },
      data: {
        originalVideoPath: filePath,
        status: ProjectStatus.UPLOADING,
      },
    });

    return filePath;
  }

  async uploadVideo(projectId: string, file: Express.Multer.File, userId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const maxFileSize = parseInt(this.configService.get<string>('MAX_FILE_SIZE', '2147483648'));
    if (file.size > maxFileSize) {
      throw new BadRequestException('File size exceeds limit (2GB)');
    }

    const allowedMimeTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Allowed: MP4, MOV, AVI, WebM');
    }

    const filePath = await this.saveUploadedFile(projectId, file);

    await this.prisma.processingJob.updateMany({
      where: { projectId },
      data: {
        status: 'QUEUED',
        startedAt: new Date(),
      },
    });

    await this.queueService.addVideoJob('process-video', {
      projectId,
      filePath,
      userId,
    }, {
      jobId: projectId,
    });

    return {
      projectId,
      filePath,
      status: 'QUEUED',
      message: 'Video uploaded and queued for processing',
    };
  }

  async importFromYouTube(projectId: string, youtubeUrl: string, userId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
    if (!youtubeRegex.test(youtubeUrl)) {
      throw new BadRequestException('Invalid YouTube URL');
    }

    await this.prisma.project.update({
      where: { id: projectId },
      data: {
        sourceUrl: youtubeUrl,
        sourceType: SourceType.YOUTUBE,
        status: ProjectStatus.UPLOADING,
      },
    });

    await this.prisma.processingJob.updateMany({
      where: { projectId },
      data: {
        status: 'QUEUED',
        startedAt: new Date(),
      },
    });

    await this.queueService.addVideoJob('download-youtube', {
      projectId,
      youtubeUrl,
      userId,
    }, {
      jobId: `${projectId}-download`,
    });

    return {
      projectId,
      youtubeUrl,
      status: 'QUEUED',
      message: 'YouTube download queued',
    };
  }

  async getVideoStream(projectId: string, clipId: string | null, userId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId },
      include: { clips: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    let videoPath: string;

    if (clipId) {
      const clip = project.clips.find(c => c.id === clipId);
      if (!clip) {
        throw new NotFoundException('Clip not found');
      }
      videoPath = clip.videoPath;
    } else {
      videoPath = project.originalVideoPath;
    }

    if (!videoPath || !fs.existsSync(videoPath)) {
      throw new NotFoundException('Video file not found');
    }

    return videoPath;
  }
}
