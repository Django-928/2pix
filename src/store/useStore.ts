import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Project, CanvasProject, Conversation, Message, CanvasElement } from '@/types';
import api from '@/utils/api';

interface AppStore {
  projects: Project[];
  canvasProjects: CanvasProject[];
  conversations: Conversation[];
  currentConversationId: string | null;
  canvasElements: CanvasElement[];
  loadProjects: () => Promise<void>;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => Promise<void>;
  addCanvasProject: (project: CanvasProject) => void;
  updateCanvasProject: (id: string, updates: Partial<CanvasProject>) => void;
  deleteCanvasProject: (id: string) => void;
  setCanvasElements: (elements: CanvasElement[]) => void;
  addCanvasElement: (element: CanvasElement) => void;
  updateCanvasElement: (id: string, updates: Partial<CanvasElement>) => void;
  deleteCanvasElement: (id: string) => void;
  loadConversations: () => Promise<void>;
  createConversation: (title: string, model: string) => Promise<Conversation>;
  selectConversation: (id: string | null) => void;
  addMessage: (conversationId: string, message: Message) => Promise<void>;
  clearCanvas: () => void;
}

export const useStore = create<AppStore>()(
  persist(
    (set) => ({
      projects: [],
      canvasProjects: [],
      conversations: [],
      currentConversationId: null,
      canvasElements: [],

      loadProjects: async () => {
        const projects = await api.get<Project[]>('/works?pageSize=80');
        set({ projects });
      },

      addProject: (project) => set((state) => ({
        projects: [project, ...state.projects.filter((item) => item.id !== project.id)],
      })),

      updateProject: (id, updates) => set((state) => ({
        projects: state.projects.map((p) => (p.id === id ? { ...p, ...updates } : p)),
      })),

      deleteProject: async (id) => {
        await api.delete(`/works/${id}`);
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
        }));
      },

      addCanvasProject: (project) => set((state) => ({
        canvasProjects: [project, ...state.canvasProjects],
      })),

      updateCanvasProject: (id, updates) => set((state) => ({
        canvasProjects: state.canvasProjects.map((p) => (p.id === id ? { ...p, ...updates } : p)),
      })),

      deleteCanvasProject: (id) => set((state) => ({
        canvasProjects: state.canvasProjects.filter((p) => p.id !== id),
      })),

      setCanvasElements: (elements) => set({ canvasElements: elements }),

      addCanvasElement: (element) => set((state) => ({
        canvasElements: [...state.canvasElements, element],
      })),

      updateCanvasElement: (id, updates) => set((state) => ({
        canvasElements: state.canvasElements.map((e) => (e.id === id ? { ...e, ...updates } : e)),
      })),

      deleteCanvasElement: (id) => set((state) => ({
        canvasElements: state.canvasElements.filter((e) => e.id !== id),
      })),

      loadConversations: async () => {
        try {
          const data = await api.get<Array<{
            id: string;
            title: string;
            model: string;
            createdAt: string;
            updatedAt: string;
            messages: Array<{ id: string; role: string; content: string; createdAt: string }>;
          }>>('/chat/conversations');
          const conversations: Conversation[] = data.map((conv) => ({
            ...conv,
            messages: conv.messages.map((m) => ({
              ...m,
              role: m.role as 'user' | 'assistant',
            })),
          }));
          set({ conversations });
        } catch {
          // 静默失败，使用空列表
        }
      },

      createConversation: async (title, model) => {
        const data = await api.post<{
          id: string;
          title: string;
          model: string;
          createdAt: string;
          updatedAt: string;
          messages: [];
        }>('/chat/conversations', { title, model });
        const newConv: Conversation = {
          id: String(data.id),
          title: data.title,
          model: data.model,
          messages: [],
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
        set((state) => ({
          conversations: [newConv, ...state.conversations],
          currentConversationId: newConv.id,
        }));
        return newConv;
      },

      selectConversation: (id) => set({ currentConversationId: id }),

      addMessage: async (conversationId, message) => {
        // 先本地乐观更新
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId
              ? {
                  ...conv,
                  title: conv.title === '新对话' && message.role === 'user'
                    ? message.content.slice(0, 18)
                    : conv.title,
                  messages: [...conv.messages, message],
                  updatedAt: new Date().toISOString(),
                }
              : conv
          ),
        }));
        // 异步持久化到后端
        try {
          await api.post(`/chat/conversations/${conversationId}/messages`, {
            role: message.role,
            content: message.content,
          });
        } catch {
          // 静默失败
        }
      },

      clearCanvas: () => set({ canvasElements: [] }),
    }),
    {
      name: '2pix-demo-workspace',
      partialize: (state) => ({
        projects: state.projects,
        canvasProjects: state.canvasProjects,
        // 不再持久化 conversations 到 localStorage
        currentConversationId: null,
        canvasElements: state.canvasElements,
      }),
    },
  ),
);
