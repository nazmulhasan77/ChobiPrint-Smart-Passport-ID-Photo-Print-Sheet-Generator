import JSZip from 'jszip';
import type { ConvertedImageResult, OutputFormat, BatchSettings } from '../types/converter';

/**
 * Format bytes to readable string (e.g. 1.25 MB, 450 KB)
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Convert millimeters to pixels at 300 DPI
 */
export function mmToPixels(mm: number, dpi: number = 300): number {
  return Math.round((mm / 25.4) * dpi);
}

/**
 * Convert pixels to millimeters at 300 DPI
 */
export function pixelsToMm(px: number, dpi: number = 300): number {
  return parseFloat(((px * 25.4) / dpi).toFixed(1));
}

/**
 * Load an image from URL or File and get dimensions
 */
export function loadImageDimensions(url: string): Promise<{ width: number; height: number; img: HTMLImageElement }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      resolve({
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
        img,
      });
    };
    img.onerror = (err) => reject(err);
    img.src = url;
  });
}

/**
 * Calculate target width and height based on user settings
 */
export function calculateTargetDimensions(
  origWidth: number,
  origHeight: number,
  settings: BatchSettings
): { width: number; height: number } {
  if (settings.resizeMode === 'original') {
    return { width: origWidth, height: origHeight };
  }

  if (settings.resizeMode === 'percentage') {
    const scale = Math.max(1, settings.percentage) / 100;
    return {
      width: Math.max(1, Math.round(origWidth * scale)),
      height: Math.max(1, Math.round(origHeight * scale)),
    };
  }

  // Dimension mode
  let targetW = settings.width;
  let targetH = settings.height;

  if (settings.unit === 'mm') {
    targetW = mmToPixels(settings.width, 300);
    targetH = mmToPixels(settings.height, 300);
  }

  if (settings.maintainAspectRatio) {
    const ratio = origWidth / origHeight;
    if (targetW > 0 && targetH === 0) {
      targetH = Math.round(targetW / ratio);
    } else if (targetH > 0 && targetW === 0) {
      targetW = Math.round(targetH * ratio);
    }
  }

  return {
    width: Math.max(1, targetW || origWidth),
    height: Math.max(1, targetH || origHeight),
  };
}

/**
 * Process single image conversion & resizing
 */
export async function processImageConversion(
  item: ConvertedImageResult,
  settings: BatchSettings
): Promise<Partial<ConvertedImageResult>> {
  const { img, width: origW, height: origH } = await loadImageDimensions(item.originalUrl);

  const { width: targetW, height: targetH } = calculateTargetDimensions(origW, origH, settings);

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas 2D context not supported');
  }

  // Better image smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // For JPEG output, draw white background first to avoid black artifacts for transparent PNG inputs
  if (settings.format === 'jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetW, targetH);
  }

  ctx.drawImage(img, 0, 0, targetW, targetH);

  const mimeType = settings.format === 'jpeg' ? 'image/jpeg' : settings.format === 'webp' ? 'image/webp' : 'image/png';
  const qualityParam = settings.format === 'png' ? undefined : Math.min(1, Math.max(0.01, settings.quality / 100));

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to create image blob'));
          return;
        }

        if (item.convertedUrl) {
          URL.revokeObjectURL(item.convertedUrl);
        }

        const convertedUrl = URL.createObjectURL(blob);
        resolve({
          convertedBlob: blob,
          convertedUrl,
          convertedSize: blob.size,
          convertedWidth: targetW,
          convertedHeight: targetH,
          format: settings.format,
          quality: settings.quality,
          isProcessing: false,
        });
      },
      mimeType,
      qualityParam
    );
  });
}

/**
 * Generate output filename based on original name and target format
 */
export function getOutputFileName(originalName: string, format: OutputFormat): string {
  const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
  const ext = format === 'jpeg' ? 'jpg' : format;
  return `${nameWithoutExt}.${ext}`;
}

/**
 * Download a single blob directly in browser
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Package all converted images into a single zip file
 */
export async function createZipArchive(
  items: ConvertedImageResult[]
): Promise<Blob> {
  const zip = new JSZip();

  items.forEach((item, index) => {
    if (item.convertedBlob) {
      const fileName = getOutputFileName(item.originalFile.name || `image-${index + 1}`, item.format);
      zip.file(fileName, item.convertedBlob);
    }
  });

  return await zip.generateAsync({ type: 'blob' });
}
