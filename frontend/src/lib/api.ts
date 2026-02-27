import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  register: (data: { email: string; password: string; name?: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
};

// Projects API
export const projectsApi = {
  getAll: (page = 1, limit = 10) =>
    api.get(`/projects?page=${page}&limit=${limit}`),
  getOne: (id: string) => api.get(`/projects/${id}`),
  create: (data: { title: string; description?: string; sourceType?: string; sourceUrl?: string }) =>
    api.post('/projects', data),
  update: (id: string, data: { title?: string; description?: string }) =>
    api.patch(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
  getStatus: (id: string) => api.get(`/projects/${id}/status`),
};

// Video API
export const videoApi = {
  upload: (projectId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/video/${projectId}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  importYouTube: (projectId: string, url: string) =>
    api.post(`/video/${projectId}/import-youtube`, { url }),
  getStreamUrl: (projectId: string, clipId?: string) => {
    const params = clipId ? `?clipId=${clipId}` : '';
    return `${API_BASE_URL}/video/${projectId}/stream${params}`;
  },
};

// Processing API
export const processingApi = {
  regenerateHook: (clipId: string) =>
    api.post(`/processing/${clipId}/regenerate-hook`),
  generateABTest: (clipId: string) =>
    api.post(`/processing/${clipId}/ab-test`),
  updateHook: (clipId: string, hookText: string) =>
    api.patch(`/processing/${clipId}/hook`, { hookText }),
  updateTitles: (clipId: string, titles: string[]) =>
    api.patch(`/processing/${clipId}/titles`, { titles }),
};

export default api;
