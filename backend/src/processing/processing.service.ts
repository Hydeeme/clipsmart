import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { QueueService } from '../common/queue.service';
import { AIService } from '../ai/ai.service';
import { ViralScoreService } from './viral-score.service';

@Injectable()
export class ProcessingService {
  constructor(
    private prisma: PrismaService,
    private queueService: QueueService,
    private aiService: AIService,
    private viralScoreService: ViralScoreService,
  ) {}

  async regenerateHook(clipId: string, userId: string) {
    const clip = await this.prisma.clip.findFirst({
      where: { id: clipId, project: { userId } },
    });

    if (!clip) {
      throw new NotFoundException('Clip not found');
    }

    await this.queueService.addProcessingJob('generate-hook', { clipId });

    return { message: 'Hook regeneration queued' };
  }

  async generateABTest(clipId: string, userId: string) {
    const clip = await this.prisma.clip.findFirst({
      where: { id: clipId, project: { userId } },
    });

    if (!clip) {
      throw new NotFoundException('Clip not found');
    }

    await this.queueService.addProcessingJob('ab-test-hooks', { clipId });

    return { message: 'A/B test generation queued' };
  }

  async updateClipHook(clipId: string, userId: string, hookText: string) {
    const clip = await this.prisma.clip.findFirst({
      where: { id: clipId, project: { userId } },
    });

    if (!clip) {
      throw new NotFoundException('Clip not found');
    }

    return this.prisma.clip.update({
      where: { id: clipId },
      data: { hookText },
    });
  }

  async updateClipTitles(clipId: string, userId: string, titles: string[]) {
    const clip = await this.prisma.clip.findFirst({
      where: { id: clipId, project: { userId } },
    });

    if (!clip) {
      throw new NotFoundException('Clip not found');
    }

    return this.prisma.clip.update({
      where: { id: clipId },
      data: { titles },
    });
  }

  async recalculateViralScore(clipId: string, userId: string) {
    const clip = await this.prisma.clip.findFirst({
      where: { id: clipId, project: { userId } },
      include: { project: true },
    });

    if (!clip) {
      throw new NotFoundException('Clip not found');
    }

    // Recalculate score (in production, you'd also fetch silence data)
    const silenceData: any[] = []; // Would need to store/retrieve silence data
    
    const viralScore = this.viralScoreService.calculateViralScore(
      clip.transcript || '',
      clip.duration,
      silenceData,
    );

    return this.prisma.clip.update({
      where: { id: clipId },
      data: {
        viralScore: viralScore.total,
        viralScoreBreakdown: viralScore.breakdown,
      },
    });
  }
}
