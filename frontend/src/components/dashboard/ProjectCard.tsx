'use client';

import Link from 'next/link';
import { Video, Clock, BarChart3, Loader2 } from 'lucide-react';
import { Project } from '@/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatDuration, formatDate, getViralScoreColor } from '@/lib/utils';

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const getStatusBadge = () => {
    switch (project.status) {
      case 'COMPLETED':
        return <Badge variant="default">Completed</Badge>;
      case 'PROCESSING':
      case 'ANALYZING':
        return <Badge variant="secondary">Processing</Badge>;
      case 'FAILED':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const isProcessing = project.status === 'PROCESSING' || project.status === 'ANALYZING';
  const progress = project.processingJob?.progress || 0;

  return (
    <Link href={`/project/${project.id}`}>
      <Card className="group cursor-pointer transition-all hover:shadow-lg">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary">
                {project.thumbnailUrl ? (
                  <img
                    src={project.thumbnailUrl}
                    alt={project.title}
                    className="h-full w-full rounded-lg object-cover"
                  />
                ) : (
                  <Video className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div>
                <h3 className="font-semibold line-clamp-1 group-hover:text-primary">
                  {project.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {formatDate(project.createdAt)}
                </p>
              </div>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
        
        <CardContent>
          {isProcessing ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{project.processingJob?.currentStep || 'Processing...'}</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          ) : (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{project.duration ? formatDuration(project.duration) : '--:--'}</span>
              </div>
              <div className="flex items-center gap-1">
                <Video className="h-4 w-4" />
                <span>{project.clipCount || 0} clips</span>
              </div>
              {project.viralScore !== null && (
                <div className={`flex items-center gap-1 ${getViralScoreColor(project.viralScore)}`}>
                  <BarChart3 className="h-4 w-4" />
                  <span className="font-medium">{project.viralScore}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
