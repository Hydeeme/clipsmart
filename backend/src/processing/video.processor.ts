import { Injectable, OnModuleInit } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../common/prisma.service';
import { QueueService } from '../common/queue.service';
import { LoggerService } from '../common/logger.service';
import { FFmpegService } from './ffmpeg.service';
import { TranscriptionService } from './transcription.service';
import { ViralScoreService } from './viral-score.service';
import { AIService } from '../ai/ai.service';
import { ProjectStatus, ClipStatus } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';
import { promisify } from 'util';
import * as ytdl from 'ytdl-core';

const mkdir = promisify(fs.mkdir);

@Injectable()
export class VideoProcessor implements OnModuleInit {
  constructor(
    private prisma: PrismaService,
    private queueService: QueueService,
    private ffmpegService: FFmpegService,
    private transcriptionService: TranscriptionService,
    private viralScoreService: ViralScoreService,
    private aiService: AIService,
    private logger: LoggerService,
  ) {}

  onModuleInit() {
    // Register video processing worker
    this.queueService.registerWorker('video-processing', async (job: Job) => {
      switch (job.name) {
        case 'process-video':
          return this.processVideo(job);
        case 'download-youtube':
          return this.downloadYouTube(job);
        default:
          throw new Error(`Unknown job type: ${job.name}`);
      }
    });

    // Register AI processing worker
    this.queueService.registerWorker('ai-processing', async (job: Job) => {
      switch (job.name) {
        case 'generate-hook':
          return this.generateHook(job);
        case 'ab-test-hooks':
          return this.abTestHooks(job);
        default:
          throw new Error(`Unknown job type: ${job.name}`);
      }
    });

    this.logger.log('VideoProcessor workers registered');
  }

  private async updateJobProgress(projectId: string, progress: number, step: string) {
    await this.prisma.processingJob.updateMany({
      where: { projectId },
      data: {
        progress,
        currentStep: step,
      },
    });
  }

  private async updateProjectStatus(projectId: string, status: ProjectStatus) {
    await this.prisma.project.update({
      where: { id: projectId },
      data: { status },
    });
  }

  async downloadYouTube(job: Job): Promise<void> {
    const { projectId, youtubeUrl, userId } = job.data;

    try {
      await this.updateJobProgress(projectId, 10, 'Downloading from YouTube');
      await this.updateProjectStatus(projectId, ProjectStatus.UPLOADING);

      const projectDir = path.join('./uploads', projectId);
      await mkdir(projectDir, { recursive: true });
      const outputPath = path.join(projectDir, 'original.mp4');

      // Download YouTube video
      const videoStream = ytdl(youtubeUrl, {
        quality: 'highestvideo',
        filter: 'audioandvideo',
      });

      const writeStream = fs.createWriteStream(outputPath);
      
      await new Promise<void>((resolve, reject) => {
        videoStream.pipe(writeStream);
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
        videoStream.on('error', reject);
      });

      await this.updateJobProgress(projectId, 100, 'Download complete');

      // Update project with file path
      await this.prisma.project.update({
        where: { id: projectId },
        data: {
          originalVideoPath: outputPath,
          status: ProjectStatus.UPLOADING,
        },
      });

      // Queue for processing
      await this.queueService.addVideoJob('process-video', {
        projectId,
        filePath: outputPath,
        userId,
      }, {
        jobId: projectId,
      });

    } catch (error) {
      await this.prisma.processingJob.updateMany({
        where: { projectId },
        data: {
          status: 'FAILED',
          errorMessage: error.message,
        },
      });
      await this.updateProjectStatus(projectId, ProjectStatus.FAILED);
      throw error;
    }
  }

  async processVideo(job: Job): Promise<void> {
    const { projectId, filePath, userId } = job.data;

    try {
      this.logger.log(`Starting video processing for project ${projectId}`);
      await this.updateProjectStatus(projectId, ProjectStatus.PROCESSING);

      // Step 1: Get video info
      await this.updateJobProgress(projectId, 5, 'Analyzing video');
      const videoInfo = await this.ffmpegService.getVideoInfo(filePath);
      const duration = await this.ffmpegService.getDuration(filePath);

      await this.prisma.project.update({
        where: { id: projectId },
        data: { duration },
      });

      // Update usage stats
      await this.prisma.usageStat.update({
        where: { userId },
        data: {
          videosProcessed: { increment: 1 },
          minutesProcessed: { increment: Math.ceil(duration / 60) },
        },
      });

      // Step 2: Transcribe
      await this.updateJobProgress(projectId, 15, 'Transcribing audio');
      let transcription;
      try {
        transcription = await this.transcriptionService.transcribeWithPython(filePath);
      } catch (e) {
        this.logger.warn('Python transcription failed, trying fallback');
        transcription = await this.transcriptionService.transcribe(filePath);
      }

      await this.prisma.project.update({
        where: { id: projectId },
        data: {
          transcript: transcription.transcript,
          transcriptSrt: transcription.srt,
        },
      });

      // Step 3: Detect silence
      await this.updateJobProgress(projectId, 25, 'Detecting silence');
      const silenceData = await this.ffmpegService.detectSilence(filePath);

      // Step 4: Generate segments
      await this.updateJobProgress(projectId, 30, 'Generating segments');
      const segments = this.ffmpegService.generateSegments(duration, 30, silenceData);

      // Step 5: Process each segment
      const processedDir = path.join('./processed', projectId);
      await mkdir(processedDir, { recursive: true });

      const processedClips = [];
      const totalSegments = segments.length;

      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const progress = 30 + Math.floor((i / totalSegments) * 50);
        await this.updateJobProgress(projectId, progress, `Processing clip ${i + 1} of ${totalSegments}`);

        const outputPath = path.join(processedDir, `clip_${i + 1}.mp4`);
        const workingDir = path.join(processedDir, `working_${i + 1}`);
        const thumbnailPath = path.join(processedDir, `clip_${i + 1}.jpg`);

        // Process segment through FFmpeg pipeline
        await this.ffmpegService.processSegment(
          filePath,
          outputPath,
          segment,
          transcription.segments,
          workingDir,
        );

        // Generate thumbnail
        await this.ffmpegService.generateThumbnail(outputPath, thumbnailPath, 1);

        // Calculate viral score for segment
        const segmentTranscript = transcription.segments
          .filter(s => s.start >= segment.start && s.end <= segment.end)
          .map(s => s.text)
          .join(' ');

        const segmentSilences = silenceData.silences.filter(
          s => s.start >= segment.start && s.end <= segment.end
        );

        const viralScore = this.viralScoreService.calculateViralScore(
          segmentTranscript,
          segment.duration,
          segmentSilences,
        );

        // Create clip record
        const clip = await this.prisma.clip.create({
          data: {
            projectId,
            startTime: segment.start,
            endTime: segment.end,
            duration: segment.duration,
            videoPath: outputPath,
            thumbnailUrl: `/api/v1/video/${projectId}/thumbnail?clipId=clip_${i + 1}`,
            transcript: segmentTranscript,
            viralScore: viralScore.total,
            viralScoreBreakdown: viralScore.breakdown,
            status: ClipStatus.READY,
          },
        });

        processedClips.push(clip);
      }

      // Step 6: Generate hooks and titles for top clips
      await this.updateJobProgress(projectId, 85, 'Generating hooks and titles');

      // Sort by viral score and pick top 3
      const topClips = processedClips
        .sort((a, b) => b.viralScore - a.viralScore)
        .slice(0, 3);

      for (const clip of topClips) {
        try {
          const hookResult = await this.aiService.generateHook(clip.transcript, clip.duration);
          const titles = await this.aiService.generateTitles(hookResult.hook, clip.transcript);

          await this.prisma.clip.update({
            where: { id: clip.id },
            data: {
              hookText: hookResult.hook,
              titles: titles,
            },
          });
        } catch (e) {
          this.logger.error(`Failed to generate hook for clip ${clip.id}: ${e.message}`);
        }
      }

      // Step 7: Calculate overall viral score
      await this.updateJobProgress(projectId, 95, 'Finalizing');
      const overallViralScore = this.viralScoreService.calculateViralScore(
        transcription.transcript,
        duration,
        silenceData.silences,
      );

      await this.prisma.project.update({
        where: { id: projectId },
        data: {
          viralScore: overallViralScore.total,
          viralScoreBreakdown: overallViralScore.breakdown,
          status: ProjectStatus.COMPLETED,
          thumbnailUrl: topClips[0]?.thumbnailUrl || null,
        },
      });

      await this.prisma.processingJob.updateMany({
        where: { projectId },
        data: {
          status: 'COMPLETED',
          progress: 100,
          completedAt: new Date(),
        },
      });

      this.logger.log(`Video processing completed for project ${projectId}`);

    } catch (error) {
      this.logger.error(`Video processing failed for project ${projectId}: ${error.message}`);
      
      await this.prisma.processingJob.updateMany({
        where: { projectId },
        data: {
          status: 'FAILED',
          errorMessage: error.message,
        },
      });
      
      await this.updateProjectStatus(projectId, ProjectStatus.FAILED);
      throw error;
    }
  }

  async generateHook(job: Job): Promise<void> {
    const { clipId } = job.data;

    const clip = await this.prisma.clip.findUnique({
      where: { id: clipId },
    });

    if (!clip) {
      throw new Error(`Clip not found: ${clipId}`);
    }

    const hookResult = await this.aiService.generateHook(clip.transcript, clip.duration);
    const titles = await this.aiService.generateTitles(hookResult.hook, clip.transcript);

    await this.prisma.clip.update({
      where: { id: clipId },
      data: {
        hookText: hookResult.hook,
        titles: titles,
      },
    });
  }

  async abTestHooks(job: Job): Promise<void> {
    const { clipId } = job.data;

    const clip = await this.prisma.clip.findUnique({
      where: { id: clipId },
    });

    if (!clip) {
      throw new Error(`Clip not found: ${clipId}`);
    }

    const abResult = await this.aiService.generateABTestHooks(clip.transcript, clip.duration);

    await this.prisma.clip.update({
      where: { id: clipId },
      data: {
        abTestEnabled: true,
        hookVariantA: abResult.hookA.text,
        hookVariantB: abResult.hookB.text,
        abTestWinner: abResult.winner,
        hookText: abResult.winner === 'A' ? abResult.hookA.text : abResult.hookB.text,
      },
    });
  }
}
