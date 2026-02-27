'use client';

import { create } from 'zustand';
import { Project, Clip } from '@/types';
import { projectsApi, videoApi } from '@/lib/api';

interface ProjectsState {
  projects: Project[];
  currentProject: Project | null;
  currentClip: Clip | null;
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  
  // Actions
  fetchProjects: (page?: number, limit?: number) => Promise<void>;
  fetchProject: (id: string) => Promise<void>;
  createProject: (data: { title: string; description?: string; sourceType?: string; sourceUrl?: string }) => Promise<Project>;
  uploadVideo: (projectId: string, file: File) => Promise<void>;
  importYouTube: (projectId: string, url: string) => Promise<void>;
  setCurrentClip: (clip: Clip | null) => void;
  refreshProjectStatus: (id: string) => Promise<void>;
}

export const useProjectsStore = create<ProjectsState>()((set, get) => ({
  projects: [],
  currentProject: null,
  currentClip: null,
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  },

  fetchProjects: async (page = 1, limit = 10) => {
    set({ isLoading: true, error: null });
    try {
      const response = await projectsApi.getAll(page, limit);
      set({
        projects: response.data.projects,
        pagination: response.data.pagination,
        isLoading: false,
      });
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to fetch projects', isLoading: false });
    }
  },

  fetchProject: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await projectsApi.getOne(id);
      set({ currentProject: response.data, isLoading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to fetch project', isLoading: false });
    }
  },

  createProject: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await projectsApi.create(data);
      const newProject = response.data;
      set((state) => ({
        projects: [newProject, ...state.projects],
        isLoading: false,
      }));
      return newProject;
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to create project', isLoading: false });
      throw error;
    }
  },

  uploadVideo: async (projectId: string, file: File) => {
    set({ isLoading: true, error: null });
    try {
      await videoApi.upload(projectId, file);
      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to upload video', isLoading: false });
      throw error;
    }
  },

  importYouTube: async (projectId: string, url: string) => {
    set({ isLoading: true, error: null });
    try {
      await videoApi.importYouTube(projectId, url);
      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to import video', isLoading: false });
      throw error;
    }
  },

  setCurrentClip: (clip: Clip | null) => {
    set({ currentClip: clip });
  },

  refreshProjectStatus: async (id: string) => {
    try {
      const response = await projectsApi.getStatus(id);
      const status = response.data;
      
      set((state) => ({
        currentProject: state.currentProject?.id === id
          ? { ...state.currentProject, status: status.status, processingJob: status }
          : state.currentProject,
      }));
    } catch (error) {
      console.error('Failed to refresh project status', error);
    }
  },
}));
