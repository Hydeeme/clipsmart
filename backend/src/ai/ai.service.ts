import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAIProvider } from './providers/openai.provider';
import { DeepSeekProvider } from './providers/deepseek.provider';

export interface AIProvider {
  generateHook(transcript: string, duration: number): Promise<HookGenerationResult>;
  generateTitles(hook: string, transcript: string): Promise<string[]>;
  generateABTestHooks(transcript: string, duration: number): Promise<ABTestResult>;
}

export interface HookGenerationResult {
  hook: string;
  explanation: string;
}

export interface ABTestResult {
  hookA: {
    text: string;
    score: number;
  };
  hookB: {
    text: string;
    score: number;
  };
  winner: 'A' | 'B';
  reason: string;
}

@Injectable()
export class AIService {
  private provider: AIProvider;

  constructor(
    private configService: ConfigService,
    private openAIProvider: OpenAIProvider,
    private deepSeekProvider: DeepSeekProvider,
  ) {
    this.setProvider(this.configService.get<string>('AI_PROVIDER') || 'openai');
  }

  setProvider(providerName: string) {
    switch (providerName.toLowerCase()) {
      case 'openai':
        this.provider = this.openAIProvider;
        break;
      case 'deepseek':
        this.provider = this.deepSeekProvider;
        break;
      default:
        this.provider = this.openAIProvider;
    }
  }

  async generateHook(transcript: string, duration: number): Promise<HookGenerationResult> {
    return this.provider.generateHook(transcript, duration);
  }

  async generateTitles(hook: string, transcript: string): Promise<string[]> {
    return this.provider.generateTitles(hook, transcript);
  }

  async generateABTestHooks(transcript: string, duration: number): Promise<ABTestResult> {
    return this.provider.generateABTestHooks(transcript, duration);
  }

  getPromptTemplate(type: string): string {
    const templates = {
      hook: `You are a viral content strategist. Analyze this video transcript and generate a compelling hook.

Transcript: {{transcript}}
Duration: {{duration}} seconds

Generate:
1. A hook (3-7 seconds opening line, max 12 words, spoken/casual tone)
2. An explanation of why this hook works

Rules:
- Same language as transcript
- No invented facts
- No hashtags
- No emojis
- No clickbait lies
- Casual, human, spoken style

Return JSON only:
{
  "hook": "string",
  "explanation": "string"
}`,

      titles: `You are a content strategist. Based on the hook and transcript, generate 3 title variations.

Hook: {{hook}}
Transcript: {{transcript}}

Generate 3 titles:
- Max 60 characters each
- Platform-optimized (TikTok/Reels/Shorts)
- No hashtags
- No emojis
- Attention-grabbing but honest

Return JSON only:
{
  "titles": ["string", "string", "string"]
}`,

      abTest: `You are an A/B testing expert. Generate 2 hook variants for this video.

Transcript: {{transcript}}
Duration: {{duration}} seconds

Generate:
1. Hook A: Safe approach, clarity-first, direct value proposition
2. Hook B: Curiosity/emotion-first approach, intrigue-based

For each hook, score:
- Retention potential (0-100)
- Emotional trigger strength (0-100)
- Clarity (0-100)
- Platform fit (0-100)

Calculate overall score from these factors.

Rules:
- Same language as transcript
- Max 12 words per hook
- No emojis, no hashtags
- No invented facts

Return JSON only:
{
  "hookA": {
    "text": "string",
    "score": number
  },
  "hookB": {
    "text": "string",
    "score": number
  },
  "winner": "A" or "B",
  "reason": "string"
}`
    };

    return templates[type] || '';
  }
}
