export interface HookGenerationResult {
  hook: string;
  score: number;
}

export interface ABTestResult {
  winner: 'A' | 'B';
  hookA: string;
  hookB: string;
  scoreA: number;
  scoreB: number;
}

export interface AIProvider {
  generateHook(text: string): Promise<HookGenerationResult>;
  generateABTest(text: string): Promise<ABTestResult>;
}

export class AIService {
  constructor(private readonly provider: AIProvider) {}

  getTemplate(type: 'hook' | 'titles' | 'abTest'): string {
    const templates: Record<string, string> = {
      hook: 'Generate viral hook',
      titles: 'Generate viral titles',
      abTest: 'Generate A/B hooks'
    };
    return templates[type];
  }
}