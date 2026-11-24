export type DimensionType = 'passport' | 'stamp' | 'square' | 'custom';

export type DimensionUnit = 'mm' | 'cm' | 'inch' | 'px';

export type PhotoOrientation = 'horizontal' | 'vertical' | 'auto';

export interface PhotoDimension {
  id: string;
  name: string;
  category: DimensionType;
  widthMm: number;
  heightMm: number;
  description?: string;
}

export interface CropSettings {
  x: number;
  y: number;
  width: number;
  height: number;
  zoom: number;
  rotation: number; // 0, 90, 180, 270
  brightness?: number; // -50 to +50, default 0
  contrast?: number; // -50 to +50, default 0
}

export interface PhotoItem {
  id: string;
  fileName: string;
  originalUrl: string;
  fileSize: number;
  croppedUrl: string;
  dimension: PhotoDimension;
  copies: number;
  orientation?: PhotoOrientation; // 'horizontal' | 'vertical' | 'auto'
  cropSettings?: CropSettings;
  aspectRatio: number; // width / height
}

export interface PlacedPhoto {
  sheetIndex: number;
  photoId: string;
  croppedUrl: string;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  itemNumber: number;
  totalCopiesOfThisPhoto: number;
  isRotated?: boolean; // True if rotated 90 deg for horizontal layout
}

export interface SheetLayout {
  sheetIndex: number;
  photos: PlacedPhoto[];
}

export interface LayoutConfig {
  paperWidthMm: number; // 210 for A4
  paperHeightMm: number; // 297 for A4
  marginMm: number; // minimum margin, default 5mm (fits 4 horizontal passport columns)
  spacingMm: number; // spacing between photos, default 2mm
  passportOrientation: PhotoOrientation; // default 'horizontal'
  autoOptimizeOrientation: boolean; // Automatically rotate (portrait vs landscape) to maximize copies
  distributeHorizontally: boolean; // Distribute horizontal extra space evenly between images for aligned cutting
  verticalAlignment: 'top' | 'distribute' | 'center'; // 'top': packs to top, leaving large unused paper at bottom for reuse!
  showCutLines: boolean; // 0.5pt subtle border
  showPhotoBorder?: boolean; // 1px photo cutting border for clean slicing (especially for white backgrounds)
  photoBorderColor?: 'gray' | 'black'; // 'gray' (#94a3b8) or 'black' (#000000)
  showCornerMarks: boolean; // corner tick marks
  showPaperReuseIndicator: boolean; // visual dashed line showing reusable unused paper area
  dpi: number; // 300 DPI
}
