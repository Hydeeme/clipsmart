import { AIProvider, HookGenerationResult, ABTestResult } from '../ai.service';

export class DeepSeekProvider implements AIProvider {
  async generateHook(text: string): Promise<HookGenerationResult> {
    return { hook: text, score: 0.5 };
  }

  async generateABTest(text: string): Promise<ABTestResult> {
    return {
      winner: 'A',
      hookA: text,
      hookB: text + ' B',
      scoreA: 0.6,
      scoreB: 0.4
    };
  }
}