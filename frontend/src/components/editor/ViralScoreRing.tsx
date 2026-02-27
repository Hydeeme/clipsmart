'use client';

import { ViralScoreBreakdown } from '@/types';
import { getViralScoreColor, getScoreLabel } from '@/lib/utils';

interface ViralScoreRingProps {
  score: number;
  breakdown?: ViralScoreBreakdown | null;
  size?: number;
  showDetails?: boolean;
}

export function ViralScoreRing({ 
  score, 
  breakdown, 
  size = 120,
  showDetails = true 
}: ViralScoreRingProps) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const colorClass = getViralScoreColor(score);
  const bgColorClass = getViralScoreBg(score);

  function getViralScoreBg(score: number): string {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 65) return 'bg-blue-500';
    if (score >= 50) return 'bg-yellow-500';
    if (score >= 35) return 'bg-orange-500';
    return 'bg-red-500';
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background circle */}
        <svg className="score-ring" width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-muted"
            opacity={0.2}
          />
          {/* Score circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            className={`score-ring-circle ${colorClass}`}
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: offset,
            }}
          />
        </svg>
        
        {/* Score text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-bold ${colorClass}`}>{score}</span>
          <span className="text-xs text-muted-foreground">/ 100</span>
        </div>
      </div>

      {showDetails && (
        <div className="w-full space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Rating</span>
            <span className={`font-medium ${colorClass}`}>{getScoreLabel(score)}</span>
          </div>
          
          {breakdown && (
            <div className="space-y-1.5 text-xs">
              <ScoreBar label="Hook" score={breakdown.hookScore} maxScore={30} />
              <ScoreBar label="Emotion" score={breakdown.emotionScore} maxScore={20} />
              <ScoreBar label="Pacing" score={breakdown.pacingScore} maxScore={15} />
              <ScoreBar label="Clarity" score={breakdown.clarityScore} maxScore={15} />
              <ScoreBar label="Platform" score={breakdown.platformScore} maxScore={20} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ScoreBar({ label, score, maxScore }: { label: string; score: number; maxScore: number }) {
  const percentage = (score / maxScore) * 100;
  
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 text-muted-foreground">{label}</span>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="w-8 text-right tabular-nums">{score}</span>
    </div>
  );
}
