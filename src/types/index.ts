export interface Project {
  id: string;
  name: string;
  type: 'image' | 'video' | 'audio';
  status: 'pending' | 'complete' | 'failed';
  inputParams: Record<string, unknown>;
  outputUrl?: string;
  provider?: string;
  model?: string;
  createdAt: string;
}

export interface CanvasElement {
  id: string;
  type: 'image' | 'video' | 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  content: string;
  opacity: number;
}

export interface CanvasProject {
  id: string;
  name: string;
  elements: CanvasElement[];
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  model: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

export interface ImageGenerationParams {
  prompt: string;
  model: string;
  style: string;
  resolution: string;
  steps: number;
  cfgScale: number;
  seed: number | null;
}

export interface VideoGenerationParams {
  prompt: string;
  resolution: string;
  duration: number;
  style: string;
}

export interface AudioGenerationParams {
  text: string;
  voice: string;
  language: string;
}

export interface MusicGenerationParams {
  genre: string;
  mood: string;
  duration: number;
}

export interface ImageModel {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface StylePreset {
  id: string;
  name: string;
  thumbnail: string;
}

export interface VoiceOption {
  id: string;
  name: string;
  language: string;
}
