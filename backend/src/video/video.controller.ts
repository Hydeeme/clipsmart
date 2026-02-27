import {
  Controller, Post, Get, Param, UploadedFile, UseInterceptors,
  UseGuards, Request, Res, StreamableFile, Body, Query
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Response } from 'express';
import { createReadStream, statSync } from 'fs';
import { VideoService } from './video.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Video')
@Controller('video')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VideoController {
  constructor(private videoService: VideoService) {}

  @Post(':projectId/upload')
  @ApiOperation({ summary: 'Upload video file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadVideo(
    @Param('projectId') projectId: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    return this.videoService.uploadVideo(projectId, file, req.user.userId);
  }

  @Post(':projectId/import-youtube')
  @ApiOperation({ summary: 'Import video from YouTube' })
  async importYouTube(
    @Param('projectId') projectId: string,
    @Body('url') url: string,
    @Request() req,
  ) {
    return this.videoService.importFromYouTube(projectId, url, req.user.userId);
  }

  @Get(':projectId/stream')
  @ApiOperation({ summary: 'Stream video' })
  async streamVideo(
    @Param('projectId') projectId: string,
    @Query('clipId') clipId: string,
    @Request() req,
    @Res({ passthrough: true }) res: Response,
  ) {
    const videoPath = await this.videoService.getVideoStream(projectId, clipId, req.user.userId);
    const stat = statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;
      const file = createReadStream(videoPath, { start, end });
      
      res.status(206);
      res.set({
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
      });
      
      return new StreamableFile(file);
    } else {
      res.set({
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
      });
      
      const file = createReadStream(videoPath);
      return new StreamableFile(file);
    }
  }
}
