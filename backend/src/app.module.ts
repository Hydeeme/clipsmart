import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { ProjectsModule } from './projects/projects.module';
import { VideoModule } from './video/video.module';
import { ProcessingModule } from './processing/processing.module';
import { AIModule } from './ai/ai.module';
import { CommonModule } from './common/common.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    CommonModule,
    AuthModule,
    ProjectsModule,
    VideoModule,
    ProcessingModule,
    AIModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
