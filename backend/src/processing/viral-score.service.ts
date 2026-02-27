import { Injectable } from '@nestjs/common';

export interface ViralScoreResult {
  total: number;
  breakdown: {
    hookScore: number;
    emotionScore: number;
    pacingScore: number;
    clarityScore: number;
    platformScore: number;
  };
  verdict: string;
  details: {
    hookKeywords: string[];
    emotionalWords: string[];
    wordsPerSecond: number;
    silenceFrequency: number;
    avgSentenceLength: number;
    fillerWordCount: number;
  };
}

@Injectable()
export class ViralScoreService {
  // Emotional words that drive engagement
  private emotionalWords = [
    'amazing', 'incredible', 'shocking', 'surprising', 'unbelievable',
    'powerful', 'transformative', 'essential', 'crucial', 'vital',
    'love', 'hate', 'fear', 'joy', 'excited', 'worried', 'thrilled',
    'devastating', 'brilliant', 'genius', 'stupid', 'terrifying',
    'mind-blowing', 'life-changing', 'secret', 'truth', 'finally',
    'never', 'always', 'everyone', 'nobody', 'must', 'need',
    'dangerous', 'safe', 'risky', 'guaranteed', 'proven',
  ];

  // Hook keywords for first 3 seconds
  private hookKeywords = [
    'watch', 'look', 'see', 'this', 'what', 'how', 'why', 'when',
    'discover', 'learn', 'find out', 'you won\'t believe', 'wait',
    'stop', 'listen', 'quick', 'before', 'until', 'unless',
  ];

  // Filler words that reduce clarity
  private fillerWords = [
    'um', 'uh', 'like', 'you know', 'actually', 'basically', 'literally',
    'sort of', 'kind of', 'i mean', 'so', 'right', 'okay',
  ];

  calculateViralScore(
    transcript: string,
    duration: number,
    silenceData: Array<{ start: number; end: number; duration: number }>,
  ): ViralScoreResult {
    const words = transcript.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 0);

    // HOOK SCORE (0-30)
    const hookScore = this.calculateHookScore(transcript, words);

    // EMOTION SCORE (0-20)
    const emotionScore = this.calculateEmotionScore(words);

    // PACING SCORE (0-15)
    const pacingScore = this.calculatePacingScore(words.length, duration, silenceData);

    // CLARITY SCORE (0-15)
    const clarityScore = this.calculateClarityScore(words, sentences, transcript);

    // PLATFORM SCORE (0-20)
    const platformScore = this.calculatePlatformScore(duration);

    const total = Math.round(hookScore + emotionScore + pacingScore + clarityScore + platformScore);

    const result: ViralScoreResult = {
      total: Math.min(100, total),
      breakdown: {
        hookScore: Math.round(hookScore),
        emotionScore: Math.round(emotionScore),
        pacingScore: Math.round(pacingScore),
        clarityScore: Math.round(clarityScore),
        platformScore: Math.round(platformScore),
      },
      verdict: this.getVerdict(total),
      details: {
        hookKeywords: this.findHookKeywords(transcript),
        emotionalWords: this.findEmotionalWords(words),
        wordsPerSecond: parseFloat((words.length / duration).toFixed(2)),
        silenceFrequency: parseFloat((silenceData.length / duration * 60).toFixed(2)),
        avgSentenceLength: sentences.length > 0 ? Math.round(words.length / sentences.length) : 0,
        fillerWordCount: this.countFillerWords(transcript),
      },
    };

    return result;
  }

  // HOOK SCORE (0-30): Keywords in first 3 seconds, questions, volume spikes
  private calculateHookScore(transcript: string, words: string[]): number {
    let score = 0;

    // Assume first 3 seconds = first ~8 words (average speaking rate)
    const firstWords = words.slice(0, 8).join(' ');

    // Check for hook keywords (0-12 points)
    const foundHookKeywords = this.hookKeywords.filter(kw => 
      firstWords.includes(kw.toLowerCase())
    );
    score += Math.min(12, foundHookKeywords.length * 4);

    // Check for question in first 3 seconds (0-10 points)
    if (firstWords.includes('?') || 
        /^(what|how|why|when|where|who|which|can|could|would|will|do|does|did|are|is|was|were)/i.test(firstWords)) {
      score += 10;
    }

    // Check for "you" or "your" in first 3 seconds (0-8 points)
    if (firstWords.includes('you') || firstWords.includes('your')) {
      score += 8;
    }

    return Math.min(30, score);
  }

  // EMOTION SCORE (0-20): Emotional word count, exclamation emphasis
  private calculateEmotionScore(words: string[]): number {
    let score = 0;

    // Count emotional words (0-12 points)
    const emotionalCount = words.filter(w => 
      this.emotionalWords.some(ew => w.includes(ew))
    ).length;
    score += Math.min(12, emotionalCount * 2);

    // Check for exclamation emphasis in transcript (0-8 points)
    const exclamationCount = words.filter(w => w.includes('!')).length;
    score += Math.min(8, exclamationCount * 2);

    return Math.min(20, score);
  }

  // PACING SCORE (0-15): Words per second, silence frequency
  private calculatePacingScore(
    wordCount: number, 
    duration: number,
    silenceData: Array<{ start: number; end: number; duration: number }>,
  ): number {
    let score = 0;

    const wordsPerSecond = wordCount / duration;
    const silenceRatio = silenceData.reduce((sum, s) => sum + s.duration, 0) / duration;

    // Optimal words per second: 2.5-3.5 (0-8 points)
    if (wordsPerSecond >= 2.5 && wordsPerSecond <= 3.5) {
      score += 8;
    } else if (wordsPerSecond >= 2.0 && wordsPerSecond <= 4.0) {
      score += 5;
    } else if (wordsPerSecond >= 1.5) {
      score += 2;
    }

    // Silence frequency (0-7 points)
    // Some silence is good for pacing, too much is bad
    if (silenceRatio >= 0.05 && silenceRatio <= 0.15) {
      score += 7;
    } else if (silenceRatio >= 0.02 && silenceRatio <= 0.20) {
      score += 4;
    } else if (silenceRatio < 0.02) {
      score += 2; // Too little silence
    }

    return Math.min(15, score);
  }

  // CLARITY SCORE (0-15): Average sentence length, filler word count
  private calculateClarityScore(words: string[], sentences: string[], transcript: string): number {
    let score = 0;

    // Average sentence length (0-8 points)
    // Optimal: 10-15 words per sentence
    const avgSentenceLength = sentences.length > 0 ? words.length / sentences.length : 0;
    if (avgSentenceLength >= 10 && avgSentenceLength <= 15) {
      score += 8;
    } else if (avgSentenceLength >= 8 && avgSentenceLength <= 20) {
      score += 5;
    } else if (avgSentenceLength >= 5) {
      score += 2;
    }

    // Filler word count (0-7 points)
    const fillerCount = this.fillerWords.reduce((count, fw) => {
      const regex = new RegExp(`\\b${fw}\\b`, 'gi');
      const matches = transcript.match(regex);
      return count + (matches ? matches.length : 0);
    }, 0);

    const fillerRatio = words.length > 0 ? fillerCount / words.length : 0;
    if (fillerRatio < 0.02) {
      score += 7;
    } else if (fillerRatio < 0.05) {
      score += 4;
    } else if (fillerRatio < 0.10) {
      score += 2;
    }

    return Math.min(15, score);
  }

  // PLATFORM SCORE (0-20): Duration 15-45s, vertical format, subtitles
  private calculatePlatformScore(duration: number): number {
    let score = 0;

    // Duration (0-10 points)
    // Sweet spot: 30-45 seconds
    if (duration >= 30 && duration <= 45) {
      score += 10;
    } else if (duration >= 20 && duration <= 60) {
      score += 7;
    } else if (duration >= 15 && duration <= 90) {
      score += 4;
    }

    // Vertical format bonus (0-5 points)
    // Always true for our processed clips
    score += 5;

    // Subtitle presence (0-5 points)
    // Always true for our processed clips
    score += 5;

    return Math.min(20, score);
  }

  private getVerdict(score: number): string {
    if (score >= 80) return 'High viral potential - Strong hook, clear message, optimal pacing';
    if (score >= 65) return 'Good viral potential - Solid foundation with room for improvement';
    if (score >= 50) return 'Moderate potential - Consider refining hook or pacing';
    if (score >= 35) return 'Needs work - Hook and clarity improvements recommended';
    return 'Low viral potential - Significant revisions suggested';
  }

  private findHookKeywords(text: string): string[] {
    const firstWords = text.toLowerCase().split(/\s+/).slice(0, 8).join(' ');
    return this.hookKeywords.filter(kw => firstWords.includes(kw.toLowerCase()));
  }

  private findEmotionalWords(words: string[]): string[] {
    const found: string[] = [];
    for (const word of words) {
      for (const ew of this.emotionalWords) {
        if (word.includes(ew) && !found.includes(ew)) {
          found.push(ew);
        }
      }
    }
    return found.slice(0, 5);
  }

  private countFillerWords(transcript: string): number {
    let count = 0;
    for (const fw of this.fillerWords) {
      const regex = new RegExp(`\\b${fw}\\b`, 'gi');
      const matches = transcript.match(regex);
      count += matches ? matches.length : 0;
    }
    return count;
  }
}
