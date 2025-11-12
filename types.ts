
export type ProcessingStatus = 'waiting' | 'processing' | 'completed' | 'error';

export interface MetadataResult {
  title: string;
  keywords: string;
  categoryCode: number;
  categoryName: string;
  description: string;
}

export interface ImageFile {
  id: string;
  file: File;
  base64: string;
  status: ProcessingStatus;
  result?: MetadataResult;
  error?: string;
}

export const TARGET_EXTENSION_OPTIONS = [
    "Original (no change)", ".jpg", ".jpeg", ".png", ".eps", ".ai", ".svg"
] as const;

export type TargetExtension = typeof TARGET_EXTENSION_OPTIONS[number];
