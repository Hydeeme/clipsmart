'use client';

import { useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { ProjectCard } from '@/components/dashboard/ProjectCard';
import { CreateProjectDialog } from '@/components/dashboard/CreateProjectDialog';
import { useProjectsStore } from '@/stores/projects.store';
import { Button } from '@/components/ui/button';
import { Loader2, Video } from 'lucide-react';

export default function DashboardPage() {
  const { projects, isLoading, fetchProjects, pagination } = useProjectsStore();

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Navbar />
        
        <main className="container py-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Projects</h1>
              <p className="text-muted-foreground">
                Manage and edit your video projects
              </p>
            </div>
            <CreateProjectDialog />
          </div>

          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : projects.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-4 rounded-lg border border-dashed">
              <Video className="h-12 w-12 text-muted-foreground" />
              <div className="text-center">
                <h3 className="font-semibold">No projects yet</h3>
                <p className="text-sm text-muted-foreground">
                  Create your first project to get started
                </p>
              </div>
              <CreateProjectDialog />
            </div>
          ) : (
            <>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {projects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>

              {pagination.totalPages > 1 && (
                <div className="mt-8 flex justify-center gap-2">
                  {Array.from({ length: pagination.totalPages }, (_, i) => (
                    <Button
                      key={i + 1}
                      variant={pagination.page === i + 1 ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => fetchProjects(i + 1)}
                    >
                      {i + 1}
                    </Button>
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
