'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Upload, Link as LinkIcon } from 'lucide-react';
import { useProjectsStore } from '@/stores/projects.store';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function CreateProjectDialog() {
  const router = useRouter();
  const { createProject } = useProjectsStore();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [activeTab, setActiveTab] = useState('upload');

  const handleCreate = async () => {
    if (!title.trim()) return;

    setIsLoading(true);
    try {
      const project = await createProject({
        title: title.trim(),
        sourceType: activeTab === 'upload' ? 'UPLOAD' : 'YOUTUBE',
        sourceUrl: activeTab === 'youtube' ? youtubeUrl : undefined,
      });
      
      setOpen(false);
      setTitle('');
      setYoutubeUrl('');
      
      router.push(`/project/${project.id}`);
    } catch (error) {
      console.error('Failed to create project:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Start by uploading a video or importing from YouTube.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">
              <Upload className="mr-2 h-4 w-4" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="youtube">
              <LinkIcon className="mr-2 h-4 w-4" />
              YouTube
            </TabsTrigger>
          </TabsList>

          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Project Title</Label>
              <Input
                id="title"
                placeholder="Enter project title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <TabsContent value="upload" className="mt-0">
              <p className="text-sm text-muted-foreground">
                Upload an MP4, MOV, or AVI file. You&apos;ll be able to upload the video on the next screen.
              </p>
            </TabsContent>

            <TabsContent value="youtube" className="mt-0 space-y-2">
              <Label htmlFor="youtubeUrl">YouTube URL</Label>
              <Input
                id="youtubeUrl"
                placeholder="https://youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
              />
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!title.trim() || isLoading}>
            {isLoading ? 'Creating...' : 'Create Project'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
