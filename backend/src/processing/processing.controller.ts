import { Controller, Post, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProcessingService } from './processing.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Processing')
@Controller('processing')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProcessingController {
  constructor(private processingService: ProcessingService) {}

  @Post(':clipId/regenerate-hook')
  @ApiOperation({ summary: 'Regenerate hook for a clip' })
  async regenerateHook(@Param('clipId') clipId: string, @Request() req) {
    return this.processingService.regenerateHook(clipId, req.user.userId);
  }

  @Post(':clipId/ab-test')
  @ApiOperation({ summary: 'Generate A/B test hooks' })
  async generateABTest(@Param('clipId') clipId: string, @Request() req) {
    return this.processingService.generateABTest(clipId, req.user.userId);
  }

  @Patch(':clipId/hook')
  @ApiOperation({ summary: 'Update clip hook' })
  async updateHook(
    @Param('clipId') clipId: string,
    @Body('hookText') hookText: string,
    @Request() req,
  ) {
    return this.processingService.updateClipHook(clipId, req.user.userId, hookText);
  }

  @Patch(':clipId/titles')
  @ApiOperation({ summary: 'Update clip titles' })
  async updateTitles(
    @Param('clipId') clipId: string,
    @Body('titles') titles: string[],
    @Request() req,
  ) {
    return this.processingService.updateClipTitles(clipId, req.user.userId, titles);
  }

  @Post(':clipId/recalculate-score')
  @ApiOperation({ summary: 'Recalculate viral score' })
  async recalculateScore(@Param('clipId') clipId: string, @Request() req) {
    return this.processingService.recalculateViralScore(clipId, req.user.userId);
  }
}
