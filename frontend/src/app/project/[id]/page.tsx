'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Loader2, Upload, Link as LinkIcon, Video } from 'lucide-react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { ClipEditor } from '@/components/editor/ClipEditor';
import { ViralScoreRing } from '@/components/editor/ViralScoreRing';
import { useProjectsStore } from '@/stores/projects.store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Clip } from '@/types';

export default function ProjectPage() {
  const params = useParams();
  const projectId = params.id as string;
  const {
    currentProject,
    currentClip,
    isLoading,
    fetchProject,
    uploadVideo,
    importYouTube,
    setCurrentClip,
    refreshProjectStatus,
  } = useProjectsStore();

  const [isUploading, setIsUploading] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    if (projectId) {
      fetchProject(projectId);
    }
  }, [projectId, fetchProject]);

  // Poll for status updates while processing
  useEffect(() => {
    if (!currentProject) return;
    
    const isProcessing = currentProject.status === 'PROCESSING' || currentProject.status === 'UPLOADING';
    if (!isProcessing) return;

    const interval = setInterval(() => {
      refreshProjectStatus(projectId);
    }, 3000);

    return () => clearInterval(interval);
  }, [currentProject, projectId, refreshProjectStatus]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      await uploadVideo(projectId, file);
    } finally {
      setIsUploading(false);
    }
  };

  const handleYouTubeImport = async () => {
    if (!youtubeUrl) return;
    
    setIsImporting(true);
    try {
      await importYouTube(projectId, youtubeUrl);
    } finally {
      setIsImporting(false);
    }
  };

  if (isLoading || !currentProject) {
    return (
      <ProtectedRoute>
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </ProtectedRoute>
    );
  }

  // Show upload screen if no video uploaded yet
  if (!currentProject.originalVideoPath) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background">
          <Navbar />
          <main className="container py-8">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Projects
              </Button>
            </Link>

            <div className="mx-auto mt-8 max-w-2xl">
              <h1 className="text-2xl font-bold">{currentProject.title}</h1>
              <p className="text-muted-foreground">Upload your video to get started</p>

              <Card className="mt-8 p-8">
                {currentProject.sourceType === 'YOUTUBE' ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-primary">
                      <LinkIcon className="h-5 w-5" />
                      <span className="font-medium">Import from YouTube</span>
                    </div>
                    <Input
                      placeholder="https://youtube.com/watch?v=..."
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                    />
                    <Button 
                      onClick={handleYouTubeImport} 
                      disabled={!youtubeUrl || isImporting}
                      className="w-full"
                    >
                      {isImporting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <LinkIcon className="mr-2 h-4 w-4" />
                      )}
                      Import Video
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-primary">
                      <Upload className="h-5 w-5" />
                      <span className="font-medium">Upload Video</span>
                    </div>
                    <label className="flex cursor-pointer flex-col items-center gap-4 rounded-lg border-2 border-dashed border-muted-foreground/25 p-12 hover:border-primary/50">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <div className="text-center">
                        <p className="font-medium">Click to upload</p>
                        <p className="text-sm text-muted-foreground">
                          MP4, MOV, AVI up to 2GB
                        </p>
                      </div>
                      <input
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={isUploading}
                      />
                    </label>
                    {isUploading && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading...
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </div>
          </main>
        </div>
      </ProtectedRoute>
    );
  }

  // Show processing screen
  const isProcessing = currentProject.status === 'PROCESSING' || currentProject.status === 'ANALYZING';
  if (isProcessing) {
    const progress = currentProject.processingJob?.progress || 0;
    const step = currentProject.processingJob?.currentStep || 'Processing...';

    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background">
          <Navbar />
          <main className="container py-8">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Projects
              </Button>
            </Link>

            <div className="mx-auto mt-16 flex max-w-md flex-col items-center text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <h2 className="mt-4 text-xl font-semibold">Processing Video</h2>
              <p className="text-muted-foreground">{step}</p>
              <div className="mt-4 w-full">
                <Progress value={progress} className="h-2" />
                <p className="mt-2 text-sm text-muted-foreground">{progress}%</p>
              </div>
            </div>
          </main>
        </div>
      </ProtectedRoute>
    );
  }

  // Show editor
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container py-4">
          <div className="mb-4 flex items-center justify-between">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </Link>
            
            {currentProject.viralScore !== null && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Project Score:</span>
                <Badge variant={currentProject.viralScore >= 65 ? 'default' : 'secondary'}>
                  {currentProject.viralScore}/100
                </Badge>
              </div>
            )}
          </div>

          {currentClip ? (
            <ClipEditor 
              clip={currentClip} 
              projectId={projectId}
              onUpdate={(updatedClip) => setCurrentClip(updatedClip)}
            />
          ) : (
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Clips List */}
              <div className="lg:col-span-1">
                <h2 className="mb-4 text-lg font-semibold">Generated Clips</h2>
                <div className="space-y-3">
                  {currentProject.clips?.map((clip: Clip) => (
                    <Card
                      key={clip.id}
                      className={`cursor-pointer p-4 transition-all hover:border-primary ${
                        currentClip?.id === clip.id ? 'border-primary bg-primary/5' : ''
                      }`}
                      onClick={() => setCurrentClip(clip)}
                    >
                      <div className="flex items-center gap-3">
                        {clip.thumbnailUrl ? (
                          <img
                            src={clip.thumbnailUrl}
                            alt="Thumbnail"
                            className="h-16 w-12 rounded object-cover"
                          />
                        ) : (
                          <div className="flex h-16 w-12 items-center justify-center rounded bg-muted">
                            <Video className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-medium">
                            {clip.hookText || `Clip ${clip.id.slice(0, 8)}`}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{Math.round(clip.duration)}s</span>
                            <span>•</span>
                            <span className={clip.viralScore >= 65 ? 'text-emerald-500' : ''}>
                              Score: {clip.viralScore}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Project Overview */}
              <div className="lg:col-span-2">
                <Card className="p-8">
                  <h2 className="text-xl font-semibold">{currentProject.title}</h2>
                  <p className="mt-2 text-muted-foreground">
                    {currentProject.clips?.length || 0} clips generated from your video.
                    Select a clip to edit hooks, titles, and view details.
                  </p>
                  
                  {currentProject.viralScoreBreakdown && (
                    <div className="mt-8 flex justify-center">
                      <ViralScoreRing
                        score={currentProject.viralScore || 0}
                        breakdown={currentProject.viralScoreBreakdown}
                        size={180}
                      />
                    </div>
                  )}
                </Card>
              </div>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
