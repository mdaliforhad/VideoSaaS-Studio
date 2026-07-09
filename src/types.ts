/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface VideoScene {
  scene_number: number;
  voiceover_text: string;
  subtitle: string;
  search_keywords: string;
  video_url?: string;
  image_url?: string;
}

export interface VideoScript {
  id?: string;
  video_title: string;
  language: string;
  aspectRatio?: "9:16" | "16:9";
  tone?: string;
  scenes: VideoScene[];
  createdAt?: string;
  isFallback?: boolean;
  useClonedVoice?: boolean;
  clonedVoicePath?: string;
}

export interface WorkspaceSettings {
  topic: string;
  aspectRatio: "9:16" | "16:9";
  language: string;
  sceneCount: number;
  tone: string;
  pexelsApiKey: string;
  useClonedVoice?: boolean;
  clonedVoicePath?: string;
}
