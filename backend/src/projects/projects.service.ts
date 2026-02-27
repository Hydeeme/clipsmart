import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { QueueService } from '../common/queue.service';
import { CreateProjectDto, UpdateProjectDto, ProjectListResponse } from './dto/project.dto';
import { ProjectStatus, SourceType } from '@prisma/client';

@Injectable()
export class ProjectsService {
  constructor(
    private prisma: PrismaService,
    private queueService: QueueService,
  ) {}

  async findAll(userId: string, page = 1, limit = 10): Promise<ProjectListResponse> {
    const skip = (page - 1) * limit;
    
    const [projects, total] = await Promise.all([
      this.prisma.project.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { clips: true } },
          processingJob: {
            select: { status: true, progress: true, currentStep: true },
          },
        },
      }),
      this.prisma.project.count({ where: { userId } }),
    ]);

    return {
      projects: projects.map(p => ({
        ...p,
        clipCount: p._count.clips,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, userId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, userId },
      include: {
        clips: {
          orderBy: { viralScore: 'desc' },
        },
        processingJob: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  async create(userId: string, dto: CreateProjectDto) {
    const usage = await this.prisma.usageStat.findUnique({
      where: { userId },
    });

    if (usage && usage.videosProcessed >= usage.videosLimit) {
      throw new ForbiddenException('Video processing limit reached for this period');
    }

    const project = await this.prisma.project.create({
      data: {
        userId,
        title: dto.title,
        description: dto.description,
        sourceType: dto.sourceType || SourceType.UPLOAD,
        sourceUrl: dto.sourceUrl,
        status: ProjectStatus.PENDING,
      },
    });

    await this.prisma.processingJob.create({
      data: {
        projectId: project.id,
        jobType: 'VIDEO_PROCESSING',
        status: 'PENDING',
      },
    });

    return project;
  }

  async update(id: string, userId: string, dto: UpdateProjectDto) {
    const project = await this.findOne(id, userId);
    
    return this.prisma.project.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: string, userId: string) {
    const project = await this.findOne(id, userId);
    
    await this.prisma.project.delete({ where: { id } });
    
    return { success: true };
  }

  async getStatus(id: string, userId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, userId },
      include: { processingJob: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return {
      projectId: project.id,
      status: project.status,
      progress: project.processingJob?.progress || 0,
      currentStep: project.processingJob?.currentStep,
      error: project.processingJob?.errorMessage,
    };
  }
}
