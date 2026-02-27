import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawn } from 'child_process';
import * as fs from 'fs';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
}

@Injectable()
export class TranscriptionService {
  private whisperModel: string;
  private whisperPath: string;

  constructor(private configService: ConfigService) {
    this.whisperModel = this.configService.get<string>('WHISPER_MODEL') || 'base';
    this.whisperPath = this.configService.get<string>('WHISPER_PATH') || 'whisper';
  }

  async transcribe(videoPath: string): Promise<{
    transcript: string;
    segments: TranscriptionSegment[];
    srt: string;
  }> {
    const outputDir = `${videoPath}_transcription`;
    const baseName = 'transcription';

    // Run faster-whisper or whisper
    const args = [
      videoPath,
      '--model', this.whisperModel,
      '--language', 'en',
      '--output_format', 'srt',
      '--output_dir', outputDir,
      '--word_timestamps', 'True',
    ];

    await this.execWhisper(args);

    const srtPath = `${outputDir}/${baseName}.srt`;
    const srt = await readFile(srtPath, 'utf-8');
    const segments = this.parseSRT(srt);
    const transcript = segments.map(s => s.text).join(' ');

    // Cleanup
    try {
      await unlink(srtPath);
      fs.rmdirSync(outputDir);
    } catch (e) {}

    return { transcript, segments, srt };
  }

  private async execWhisper(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const process = spawn(this.whisperPath, args);
      let stderr = '';

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          // Try with whisper_cli as fallback
          reject(new Error(`Whisper failed with code ${code}: ${stderr}`));
        }
      });

      process.on('error', (err) => {
        reject(err);
      });
    });
  }

  parseSRT(srtContent: string): TranscriptionSegment[] {
    const segments: TranscriptionSegment[] = [];
    const blocks = srtContent.trim().split('\n\n');

    for (const block of blocks) {
      const lines = block.split('\n');
      if (lines.length < 3) continue;

      const timeLine = lines[1];
      const textLines = lines.slice(2);

      const timeMatch = timeLine.match(/(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/);
      if (!timeMatch) continue;

      const start = this.parseSRTTime(timeMatch[1]);
      const end = this.parseSRTTime(timeMatch[2]);
      const text = textLines.join(' ').trim();

      segments.push({ start, end, text });
    }

    return segments;
  }

  private parseSRTTime(timeStr: string): number {
    const [hours, minutes, seconds] = timeStr.split(':');
    const [secs, ms] = seconds.split(',');
    return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(secs) + parseInt(ms) / 1000;
  }

  convertToASS(segments: TranscriptionSegment[]): string {
    const header = `[Script Info]
Title: ClipSmart Generated Subtitles
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,64,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,4,0,2,40,40,140,1

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
    for (const segment of segments) {
      const startTime = formatTime(segment.start);
      const endTime = formatTime(segment.end);
      // Escape special characters and add line breaks for long text
      let text = segment.text
        .replace(/\\/g, '\\\\')
        .replace(/{/g, '\\{')
        .replace(/}/g, '\\}')
        .replace(/\n/g, '\\N');
      
      // Add karaoke effect for better readability
      events += `Dialogue: 0,${startTime},${endTime},Default,,0,0,0,,${text}\n`;
    }

    return header + events;
  }

  // Alternative: Use local faster-whisper Python script
  async transcribeWithPython(videoPath: string): Promise<{
    transcript: string;
    segments: TranscriptionSegment[];
    srt: string;
  }> {
    const outputPath = `${videoPath}.json`;
    
    const pythonScript = `
import sys
import json
from faster_whisper import WhisperModel

model = WhisperModel("${this.whisperModel}", device="cpu", compute_type="int8")
segments, info = model.transcribe(sys.argv[1], word_timestamps=True)

result = []
for segment in segments:
    result.append({
        "start": segment.start,
        "end": segment.end,
        "text": segment.text.strip()
    })

with open(sys.argv[2], 'w') as f:
    json.dump(result, f)
`;

    const scriptPath = `${videoPath}_transcribe.py`;
    await writeFile(scriptPath, pythonScript);

    await new Promise<void>((resolve, reject) => {
      const process = spawn('python', [scriptPath, videoPath, outputPath]);
      
      process.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Python transcription failed with code ${code}`));
        }
      });
    });

    const jsonContent = await readFile(outputPath, 'utf-8');
    const segments: TranscriptionSegment[] = JSON.parse(jsonContent);
    
    const transcript = segments.map(s => s.text).join(' ');
    const srt = this.convertToSRT(segments);

    // Cleanup
    await unlink(scriptPath);
    await unlink(outputPath);

    return { transcript, segments, srt };
  }

  private convertToSRT(segments: TranscriptionSegment[]): string {
    let srt = '';
    let index = 1;

    for (const segment of segments) {
      const start = this.formatSRTTime(segment.start);
      const end = this.formatSRTTime(segment.end);
      
      srt += `${index}\n`;
      srt += `${start} --> ${end}\n`;
      srt += `${segment.text}\n\n`;
      index++;
    }

    return srt;
  }

  private formatSRTTime(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
  }
}
