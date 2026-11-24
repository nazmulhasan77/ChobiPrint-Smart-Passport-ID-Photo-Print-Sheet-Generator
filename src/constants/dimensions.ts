import type { PhotoDimension, DimensionUnit } from '../types';

export const BANGLADESH_PRESETS: PhotoDimension[] = [
  {
    id: 'bd-passport-studio',
    name: 'Passport (পাসপোর্ট - 40 × 50 mm)',
    category: 'passport',
    widthMm: 40,
    heightMm: 50,
    description: '40 × 50 mm (1.57 × 1.97 in / 4 × 5 cm) • Universal studio standard in Bangladesh (Job, College, BCS, CV)',
  },
  {
    id: 'bd-passport-official',
    name: 'Passport (অফিসিয়াল MRP - 45 × 55 mm)',
    category: 'passport',
    widthMm: 45,
    heightMm: 55,
    description: '45 × 55 mm (1.77 × 2.17 in / 4.5 × 5.5 cm) • Official Bangladesh physical passport applications',
  },
  {
    id: 'bd-passport-35x45',
    name: 'Passport / Visa (ভিসা / আইডি - 35 × 45 mm)',
    category: 'passport',
    widthMm: 35,
    heightMm: 45,
    description: '35 × 45 mm (1.38 × 1.77 in / 3.5 × 4.5 cm) • Bangladesh visa & international standard ID format',
  },
  {
    id: 'bd-stamp',
    name: 'Stamp Size (স্ট্যাম্প সাইজ - 20 × 25 mm)',
    category: 'stamp',
    widthMm: 20,
    heightMm: 25,
    description: '20 × 25 mm (0.79 × 0.98 in / 2.0 × 2.5 cm) • Admit cards, student IDs, registration & stamp duty papers',
  },
  {
    id: 'bd-square-2x2',
    name: 'Square (স্কয়ার / US Visa - 2 × 2")',
    category: 'square',
    widthMm: 50.8,
    heightMm: 50.8,
    description: '50.8 × 50.8 mm (2.0 × 2.0 in) • Standard US Visa, DV Lottery, embassy applications & square studio portraits',
  },
  {
    id: 'bd-square-1.5x1.5',
    name: 'Square (স্কয়ার আইডি - 1.5 × 1.5")',
    category: 'square',
    widthMm: 38.1,
    heightMm: 38.1,
    description: '38.1 × 38.1 mm (1.5 × 1.5 in) • Institutional identity cards & square profile prints',
  },
  {
    id: 'bd-square-1x1',
    name: 'Square (ক্ষুদ্র স্ট্যাম্প স্কয়ার - 1 × 1")',
    category: 'square',
    widthMm: 25.4,
    heightMm: 25.4,
    description: '25.4 × 25.4 mm (1.0 × 1.0 in / 2.5 × 2.5 cm) • Micro square stamp prints',
  },
];

export const DEFAULT_DIMENSION: PhotoDimension = BANGLADESH_PRESETS[0];

export const MM_PER_INCH = 25.4;
export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;
export const PRINT_DPI = 300;

export function convertToMm(value: number, unit: DimensionUnit): number {
  switch (unit) {
    case 'mm':
      return value;
    case 'cm':
      return value * 10;
    case 'inch':
      return value * MM_PER_INCH;
    case 'px':
      return (value / PRINT_DPI) * MM_PER_INCH;
  }
}

export function convertFromMm(valueMm: number, unit: DimensionUnit): number {
  switch (unit) {
    case 'mm':
      return Math.round(valueMm * 10) / 10;
    case 'cm':
      return Math.round((valueMm / 10) * 100) / 100;
    case 'inch':
      return Math.round((valueMm / MM_PER_INCH) * 100) / 100;
    case 'px':
      return Math.round((valueMm / MM_PER_INCH) * PRINT_DPI);
  }
}

export function mmToPixelsAtDpi(mm: number, dpi: number = PRINT_DPI): number {
  return Math.round((mm / MM_PER_INCH) * dpi);
}
