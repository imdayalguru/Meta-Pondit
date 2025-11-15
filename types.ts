export type ProcessingStatus = 'waiting' | 'processing' | 'completed' | 'error';

export interface MetadataResult {
  title: string;
  keywords: string[];
  categoryCode: number;
  categoryName: string;
  description: string;
}

export interface PromptResult {
  prompt: string;
}

export interface ImageFile {
  id: string;
  file: File;
  base64: string;
  status: ProcessingStatus;
  result?: MetadataResult;
  promptResult?: PromptResult;
  error?: string;
}

export const TARGET_EXTENSION_OPTIONS = [
    "Original (no change)", ".jpg", ".jpeg", ".png", ".eps", ".ai", ".svg"
] as const;

export type TargetExtension = typeof TARGET_EXTENSION_OPTIONS[number];

export type WritingTone = 'Professional' | 'Casual' | 'Creative' | 'Technical';
export type Marketplace = 'Adobe Stock';
export type PromptPlatform = 'Midjourney' | 'Stable Diffusion' | 'DALL-E 3';

export interface GenerationSettings {
  mode: 'metadata' | 'prompt';
  marketplace: Marketplace;
  titleLength: number; // 0 for auto
  keywordCount: number; // 0 for auto
  descriptionLength: number; // 0 for auto
  includeDescription: boolean;
  includeCategory: boolean;
  writingTone: WritingTone;
  promptPlatform: PromptPlatform;
}
