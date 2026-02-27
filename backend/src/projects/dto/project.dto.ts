import { IsString, IsOptional, IsEnum, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectStatus, SourceType } from '@prisma/client';

export class CreateProjectDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: SourceType })
  @IsOptional()
  @IsEnum(SourceType)
  sourceType?: SourceType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  sourceUrl?: string;
}

export class UpdateProjectDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export interface ProjectListResponse {
  projects: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
