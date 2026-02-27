import { 
  Controller, Get, Post, Patch, Delete, Body, Param, Query, 
  UseGuards, Request 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Projects')
@Controller('projects')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all projects' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.projectsService.findAll(
      req.user.userId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project by ID' })
  async findOne(@Param('id') id: string, @Request() req) {
    return this.projectsService.findOne(id, req.user.userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create new project' })
  async create(@Body() dto: CreateProjectDto, @Request() req) {
    return this.projectsService.create(req.user.userId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update project' })
  async update(@Param('id') id: string, @Body() dto: UpdateProjectDto, @Request() req) {
    return this.projectsService.update(id, req.user.userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete project' })
  async delete(@Param('id') id: string, @Request() req) {
    return this.projectsService.delete(id, req.user.userId);
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'Get project processing status' })
  async getStatus(@Param('id') id: string, @Request() req) {
    return this.projectsService.getStatus(id, req.user.userId);
  }
}
