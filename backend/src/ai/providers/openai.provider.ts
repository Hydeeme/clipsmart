import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { AIProvider, HookGenerationResult, ABTestResult } from '../ai.service';

@Injectable()
export class OpenAIProvider implements AIProvider {
  private client: OpenAI;

  constructor(private configService: ConfigService) {
    this.client = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async generateHook(transcript: string, duration: number): Promise<HookGenerationResult> {
    const prompt = `You are a viral content strategist. Analyze this video transcript and generate a compelling hook.

Transcript: ${transcript.slice(0, 3000)}
Duration: ${duration} seconds

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
}`;

    const response = await this.client.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: 'You are a viral content strategist. Return JSON only.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0].message.content);
    return {
      hook: result.hook,
      explanation: result.explanation,
    };
  }

  async generateTitles(hook: string, transcript: string): Promise<string[]> {
    const prompt = `You are a content strategist. Based on the hook and transcript, generate 3 title variations.

Hook: ${hook}
Transcript: ${transcript.slice(0, 2000)}

Generate 3 titles:
- Max 60 characters each
- Platform-optimized (TikTok/Reels/Shorts)
- No hashtags
- No emojis
- Attention-grabbing but honest

Return JSON only:
{
  "titles": ["string", "string", "string"]
}`;

    const response = await this.client.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: 'You are a content strategist. Return JSON only.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0].message.content);
    return result.titles;
  }

  async generateABTestHooks(transcript: string, duration: number): Promise<ABTestResult> {
    const prompt = `You are an A/B testing expert. Generate 2 hook variants for this video.

Transcript: ${transcript.slice(0, 3000)}
Duration: ${duration} seconds

Generate:
1. Hook A: Safe approach, clarity-first, direct value proposition
2. Hook B: Curiosity/emotion-first approach, intrigue-based

For each hook, score (0-100):
- Retention potential
- Emotional trigger strength  
- Clarity
- Platform fit

Overall score = average of factors above.

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
}`;

    const response = await this.client.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: 'You are an A/B testing expert. Return JSON only.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.8,
      response_format: { type: 'json_object' },
    });

    return JSON.parse(response.choices[0].message.content);
  }
}
