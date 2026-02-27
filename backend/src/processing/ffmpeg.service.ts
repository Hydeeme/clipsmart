import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);
const mkdir = promisify(fs.mkdir);

interface Segment {
  start: number;
  end: number;
  duration: number;
}

interface SilenceDetection {
  silences: Array<{ start: number; end: number; duration: number }>;
}

@Injectable()
export class FFmpegService {
  private ffmpegPath: string;
  private ffprobePath: string;

  constructor(private configService: ConfigService) {
    this.ffmpegPath = this.configService.get<string>('FFMPEG_PATH') || 'ffmpeg';
    this.ffprobePath = this.configService.get<string>('FFPROBE_PATH') || 'ffprobe';
  }

  private async execFFmpeg(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const process = spawn(this.ffmpegPath, args);
      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`FFmpeg failed with code ${code}: ${stderr}`));
        }
      });

      process.on('error', (err) => {
        reject(err);
      });
    });
  }

  private async execFFprobe(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const process = spawn(this.ffprobePath, args);
      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`FFprobe failed with code ${code}: ${stderr}`));
        }
      });

      process.on('error', (err) => {
        reject(err);
      });
    });
  }

  async getVideoInfo(videoPath: string): Promise<any> {
    const args = [
      '-v', 'error',
      '-show_entries', 'format=duration,size,bit_rate',
      '-show_entries', 'stream=codec_name,width,height,r_frame_rate',
      '-of', 'json',
      videoPath,
    ];

    const output = await this.execFFprobe(args);
    return JSON.parse(output);
  }

  async getDuration(videoPath: string): Promise<number> {
    const args = [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      videoPath,
    ];

    const output = await this.execFFprobe(args);
    return parseFloat(output.trim());
  }

  // STEP 1: Audio Normalization (loudnorm)
  async normalizeAudio(inputPath: string, outputPath: string): Promise<void> {
    const args = [
      '-i', inputPath,
      '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11',
      '-c:v', 'copy',
      '-ar', '48000',
      '-y',
      outputPath,
    ];

    await this.execFFmpeg(args);
  }

  // STEP 2: Silence Detection (silencedetect)
  async detectSilence(videoPath: string, noiseDb = -50, minDuration = 0.5): Promise<SilenceDetection> {
    const args = [
      '-i', videoPath,
      '-af', `silencedetect=noise=${noiseDb}dB:d=${minDuration}`,
      '-f', 'null',
      '-',
    ];

    const output = await this.execFFmpeg(args);
    const silences: Array<{ start: number; end: number; duration: number }> = [];
    
    const silenceStartRegex = /silence_start: ([\d.]+)/g;
    const silenceEndRegex = /silence_end: ([\d.]+)/g;
    
    const starts: number[] = [];
    const ends: number[] = [];
    
    let match;
    while ((match = silenceStartRegex.exec(output)) !== null) {
      starts.push(parseFloat(match[1]));
    }
    
    while ((match = silenceEndRegex.exec(output)) !== null) {
      ends.push(parseFloat(match[1]));
    }
    
    for (let i = 0; i < Math.min(starts.length, ends.length); i++) {
      silences.push({
        start: starts[i],
        end: ends[i],
        duration: ends[i] - starts[i],
      });
    }

    return { silences };
  }

  // STEP 3: Segment Cutting (15-60s)
  generateSegments(duration: number, targetDuration = 30, silenceData: SilenceDetection): Segment[] {
    const segments: Segment[] = [];
    const minDuration = 15;
    const maxDuration = 60;
    const overlap = 2;

    // Use silence data to find natural break points
    const breakpoints = silenceData.silences
      .filter(s => s.duration >= 0.3)
      .map(s => s.start);
    
    breakpoints.push(duration);

    let currentTime = 0;
    
    while (currentTime < duration) {
      let endTime = Math.min(currentTime + targetDuration, duration);
      
      // Find nearest silence breakpoint
      const nearestBreakpoint = breakpoints.find(bp => bp > currentTime + minDuration && bp < currentTime + maxDuration);
      if (nearestBreakpoint) {
        endTime = nearestBreakpoint;
      }

      // Ensure min duration
      if (endTime - currentTime < minDuration) {
        endTime = Math.min(currentTime + minDuration, duration);
      }

      // Ensure max duration
      if (endTime - currentTime > maxDuration) {
        endTime = currentTime + maxDuration;
      }

      segments.push({
        start: currentTime,
        end: endTime,
        duration: endTime - currentTime,
      });

      currentTime = endTime - overlap;
      
      if (endTime >= duration) break;
    }

    return segments;
  }

  async cutSegment(inputPath: string, outputPath: string, start: number, duration: number): Promise<void> {
    const args = [
      '-ss', start.toString(),
      '-t', duration.toString(),
      '-i', inputPath,
      '-c', 'copy',
      '-avoid_negative_ts', 'make_zero',
      '-y',
      outputPath,
    ];

    await this.execFFmpeg(args);
  }

  // STEP 4: Safe Center-Weighted Crop (no face ML)
  // Crops to 9:16 aspect ratio, center-weighted for talking head content
  async cropToVertical(inputPath: string, outputPath: string): Promise<void> {
    // Get video dimensions
    const info = await this.getVideoInfo(inputPath);
    const stream = info.streams.find((s: any) => s.codec_type === 'video');
    const width = parseInt(stream.width);
    const height = parseInt(stream.height);

    // Calculate crop for 9:16 aspect ratio (1080x1920 target)
    const targetAspect = 9 / 16;
    const currentAspect = width / height;

    let cropWidth, cropHeight, x, y;

    if (currentAspect > targetAspect) {
      // Video is wider, crop sides
      cropHeight = height;
      cropWidth = Math.floor(height * targetAspect);
      // Center-weighted: shift slightly left (people usually stand left of center)
      x = Math.floor((width - cropWidth) * 0.45);
      y = 0;
    } else {
      // Video is taller, crop top/bottom
      cropWidth = width;
      cropHeight = Math.floor(width / targetAspect);
      x = 0;
      y = Math.floor((height - cropHeight) * 0.4); // Slight top bias for eye level
    }

    const args = [
      '-i', inputPath,
      '-vf', `crop=${cropWidth}:${cropHeight}:${x}:${y}`,
      '-c:a', 'copy',
      '-y',
      outputPath,
    ];

    await this.execFFmpeg(args);
  }

  // STEP 5: Scale to 1080x1920
  async scaleToVertical(inputPath: string, outputPath: string): Promise<void> {
    const args = [
      '-i', inputPath,
      '-vf', 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black',
      '-c:a', 'copy',
      '-y',
      outputPath,
    ];

    await this.execFFmpeg(args);
  }

  // STEP 6: Subtitle Burn (ASS)
  async burnSubtitles(inputPath: string, outputPath: string, assPath: string): Promise<void> {
    const args = [
      '-i', inputPath,
      '-vf', `ass='${assPath}'`,
      '-c:a', 'copy',
      '-y',
      outputPath,
    ];

    await this.execFFmpeg(args);
  }

  // STEP 7: Final Render (libx264)
  async finalRender(inputPath: string, outputPath: string): Promise<void> {
    const args = [
      '-i', inputPath,
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '23',
      '-movflags', '+faststart',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-ar', '48000',
      '-y',
      outputPath,
    ];

    await this.execFFmpeg(args);
  }

  // Generate ASS subtitle file
  async generateASS(subtitles: Array<{ start: number; end: number; text: string }>, outputPath: string): Promise<void> {
    const header = `[Script Info]
Title: ClipSmart Generated Subtitles
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,64,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,3,0,2,40,40,120,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

    const formatTime = (seconds: number): string => {
      const hrs = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);
      const ms = Math.floor((seconds % 1) * 100);
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    };

    let events = '';
    for (const sub of subtitles) {
      const startTime = formatTime(sub.start);
      const endTime = formatTime(sub.end);
      // Escape special characters
      const text = sub.text.replace(/\\/g, '\\\\').replace(/{/g, '\\{').replace(/}/g, '\\}');
      events += `Dialogue: 0,${startTime},${endTime},Default,,0,0,0,,${text}\n`;
    }

    const assContent = header + events;
    await writeFile(outputPath, assContent, 'utf-8');
  }

  // Generate thumbnail
  async generateThumbnail(videoPath: string, outputPath: string, time = 1): Promise<void> {
    const args = [
      '-ss', time.toString(),
      '-i', videoPath,
      '-vframes', '1',
      '-q:v', '2',
      '-y',
      outputPath,
    ];

    await this.execFFmpeg(args);
  }

  // Full pipeline for a segment
  async processSegment(
    inputPath: string,
    outputPath: string,
    segment: Segment,
    subtitles: Array<{ start: number; end: number; text: string }>,
    workingDir: string,
  ): Promise<void> {
    await mkdir(workingDir, { recursive: true });

    const step1Path = path.join(workingDir, 'step1_normalized.mp4');
    const step3Path = path.join(workingDir, 'step3_cut.mp4');
    const step4Path = path.join(workingDir, 'step4_cropped.mp4');
    const step5Path = path.join(workingDir, 'step5_scaled.mp4');
    const step6Path = path.join(workingDir, 'step6_subtitled.mp4');
    const assPath = path.join(workingDir, 'subtitles.ass');

    try {
      // Adjust subtitle timestamps to segment
      const segmentSubtitles = subtitles
        .filter(s => s.start >= segment.start && s.end <= segment.end)
        .map(s => ({
          start: s.start - segment.start,
          end: s.end - segment.start,
          text: s.text,
        }));

      // STEP 1: Audio normalization
      await this.normalizeAudio(inputPath, step1Path);

      // STEP 2: Silence detection (already done, passed in segment)

      // STEP 3: Cut segment
      await this.cutSegment(step1Path, step3Path, segment.start, segment.duration);

      // STEP 4: Safe center-weighted crop
      await this.cropToVertical(step3Path, step4Path);

      // STEP 5: Scale to 1080x1920
      await this.scaleToVertical(step4Path, step5Path);

      // STEP 6: Generate and burn subtitles
      await this.generateASS(segmentSubtitles, assPath);
      await this.burnSubtitles(step5Path, step6Path, assPath);

      // STEP 7: Final render
      await this.finalRender(step6Path, outputPath);

    } finally {
      // Cleanup temp files
      const tempFiles = [step1Path, step3Path, step4Path, step5Path, step6Path, assPath];
      for (const file of tempFiles) {
        try {
          if (fs.existsSync(file)) await unlink(file);
        } catch (e) {}
      }
    }
  }
}
