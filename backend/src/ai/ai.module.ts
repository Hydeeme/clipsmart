import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AIService } from './ai.service';
import { OpenAIProvider } from './providers/openai.provider';
import { DeepSeekProvider } from './providers/deepseek.provider';

@Module({
  imports: [ConfigModule],
  providers: [AIService, OpenAIProvider, DeepSeekProvider],
  exports: [AIService],
})
export class AIModule {}
