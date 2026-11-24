export type OutputFormat = 'jpeg' | 'png' | 'webp';

export type ResizeUnit = 'px' | 'mm' | 'percent';

export interface ImageResizeConfig {
  mode: 'dimensions' | 'percentage';
  width: number;
  height: number;
  percentage: number;
  maintainAspectRatio: boolean;
  unit: ResizeUnit;
}

export interface ConvertedImageResult {
  id: string;
  originalFile: File;
  originalWidth: number;
  originalHeight: number;
  originalSize: number;
  originalUrl: string;
  convertedBlob: Blob | null;
  convertedUrl: string | null;
  convertedSize: number;
  convertedWidth: number;
  convertedHeight: number;
  format: OutputFormat;
  quality: number; // 1 - 100
  isProcessing: boolean;
  error?: string;
}

export interface BatchSettings {
  format: OutputFormat;
  quality: number;
  resizeMode: 'original' | 'dimensions' | 'percentage';
  width: number;
  height: number;
  percentage: number;
  maintainAspectRatio: boolean;
  unit: ResizeUnit;
}
