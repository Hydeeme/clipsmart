export interface User {
  id: string;
  email: string;
  name: string | null;
  plan: 'FREE' | 'PRO' | 'ENTERPRISE';
  usage?: {
    videosProcessed: number;
    videosLimit: number;
    minutesProcessed: number;
    minutesLimit: number;
  };
}

export interface Project {
  id: string;
  title: string;
  description: string | null;
  status: 'PENDING' | 'UPLOADING' | 'PROCESSING' | 'ANALYZING' | 'COMPLETED' | 'FAILED';
  sourceType: 'UPLOAD' | 'YOUTUBE';
  sourceUrl: string | null;
  duration: number | null;
  thumbnailUrl: string | null;
  transcript: string | null;
  viralScore: number | null;
  viralScoreBreakdown: ViralScoreBreakdown | null;
  createdAt: string;
  updatedAt: string;
  clipCount?: number;
  clips?: Clip[];
  processingJob?: {
    status: string;
    progress: number;
    currentStep: string | null;
  };
}

export interface ViralScoreBreakdown {
  hookScore: number;
  emotionScore: number;
  pacingScore: number;
  clarityScore: number;
  platformScore: number;
}

export interface Clip {
  id: string;
  projectId: string;
  title: string | null;
  startTime: number;
  endTime: number;
  duration: number;
  videoPath: string;
  thumbnailUrl: string | null;
  transcript: string | null;
  hookText: string | null;
  titles: string[] | null;
  abTestEnabled: boolean;
  hookVariantA: string | null;
  hookVariantB: string | null;
  abTestWinner: string | null;
  viralScore: number;
  viralScoreBreakdown: ViralScoreBreakdown | null;
  isFavorite: boolean;
  status: 'PROCESSING' | 'READY' | 'FAILED';
  createdAt: string;
  updatedAt: string;
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

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
}

export interface ProjectFormData {
  title: string;
  description?: string;
  sourceType: 'UPLOAD' | 'YOUTUBE';
  sourceUrl?: string;
}
