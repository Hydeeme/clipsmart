import { Module } from '@nestjs/common';
import { ProcessingService } from './processing.service';
import { VideoProcessor } from './video.processor';
import { ViralScoreService } from './viral-score.service';
import { FFmpegService } from './ffmpeg.service';
import { TranscriptionService } from './transcription.service';
import { ProcessingController } from './processing.controller';
import { AIModule } from '../ai/ai.module';

@Module({
  imports: [AIModule],
  providers: [
    ProcessingService,
    VideoProcessor,
    ViralScoreService,
    FFmpegService,
    TranscriptionService,
  ],
  controllers: [ProcessingController],
  exports: [ProcessingService],
})
export class ProcessingModule {}
