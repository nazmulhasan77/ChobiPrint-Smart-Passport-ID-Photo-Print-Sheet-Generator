import type { PhotoItem, SheetLayout, LayoutConfig, PlacedPhoto, PhotoOrientation } from '../types';
import { A4_WIDTH_MM, A4_HEIGHT_MM } from '../constants/dimensions';

export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  paperWidthMm: A4_WIDTH_MM, // 210
  paperHeightMm: A4_HEIGHT_MM, // 297
  marginMm: 3, // 3mm safe margin
  spacingMm: 1.5, // 1.5mm clean cutting gutter
  passportOrientation: 'horizontal', // Passport photos set horizontally by default
  autoOptimizeOrientation: true,
  distributeHorizontally: true, // Distribute horizontal extra space evenly between images
  verticalAlignment: 'top', // Pack photos to top, leaving large empty space at bottom for reuse!
  showCutLines: true,
  showCornerMarks: true,
  showPaperReuseIndicator: true,
  dpi: 300,
};

interface EvaluatedOrientation {
  widthMm: number;
  heightMm: number;
  isRotated: boolean;
  cols: number;
  rows: number;
  capacity: number;
}

/**
 * Calculates max columns that strictly fit within paper width.
 * For 50mm horizontal passport: 4 columns * 50mm = 200mm <= 210mm.
 */
export function computeMaxCols(
  itemWidthMm: number,
  paperWidthMm: number = A4_WIDTH_MM
): number {
  const availW = paperWidthMm - 4; // allow 2mm margin per side
  let cols = Math.max(1, Math.floor((availW + 0.5) / itemWidthMm));

  while (cols > 1 && cols * itemWidthMm + (cols - 1) * 0.5 > paperWidthMm) {
    cols--;
  }
  return cols;
}

/**
 * Calculates max rows that strictly fit within paper height.
 * For 40mm horizontal passport: 7 rows * 40mm = 280mm <= 297mm.
 */
export function computeMaxRows(
  itemHeightMm: number,
  paperHeightMm: number = A4_HEIGHT_MM
): number {
  const availH = paperHeightMm - 6; // allow 3mm margin per side
  let rows = Math.max(1, Math.floor((availH + 0.5) / itemHeightMm));

  while (rows > 1 && rows * itemHeightMm + (rows - 1) * 0.5 > paperHeightMm) {
    rows--;
  }
  return rows;
}

/**
 * Resolves orientation for a specific photo based on item settings and global config.
 */
export function resolvePhotoOrientation(
  photo: PhotoItem,
  config: LayoutConfig = DEFAULT_LAYOUT_CONFIG
): EvaluatedOrientation {
  const origW = photo.dimension.widthMm;
  const origH = photo.dimension.heightMm;

  let mode: PhotoOrientation = photo.orientation ?? 'auto';

  if (!photo.orientation && photo.dimension.category === 'passport') {
    mode = config.passportOrientation ?? 'horizontal';
  }

  // 1. Force Horizontal (Landscape on paper: width is longer side)
  // For 40x50 mm passport: width on paper = 50mm, height = 40mm (4 cols x 7 rows = 28 copies!)
  if (mode === 'horizontal') {
    const isPortrait = origH > origW;
    const finalW = isPortrait ? origH : origW;
    const finalH = isPortrait ? origW : origH;
    const isRotated = isPortrait;

    const cols = computeMaxCols(finalW, config.paperWidthMm);
    const rows = computeMaxRows(finalH, config.paperHeightMm);

    return {
      widthMm: finalW,
      heightMm: finalH,
      isRotated,
      cols,
      rows,
      capacity: cols * rows,
    };
  }

  // 2. Force Vertical (Portrait on paper: height is longer side)
  if (mode === 'vertical') {
    const isLandscape = origW > origH;
    const finalW = isLandscape ? origH : origW;
    const finalH = isLandscape ? origW : origH;
    const isRotated = isLandscape;

    const cols = computeMaxCols(finalW, config.paperWidthMm);
    const rows = computeMaxRows(finalH, config.paperHeightMm);

    return {
      widthMm: finalW,
      heightMm: finalH,
      isRotated,
      cols,
      rows,
      capacity: cols * rows,
    };
  }

  // 3. Auto-Optimize for maximum capacity
  const colsUpright = computeMaxCols(origW, config.paperWidthMm);
  const rowsUpright = computeMaxRows(origH, config.paperHeightMm);
  const capUpright = colsUpright * rowsUpright;

  const colsRotated = computeMaxCols(origH, config.paperWidthMm);
  const rowsRotated = computeMaxRows(origW, config.paperHeightMm);
  const capRotated = colsRotated * rowsRotated;

  if (capRotated > capUpright) {
    return {
      widthMm: origH,
      heightMm: origW,
      isRotated: true,
      cols: colsRotated,
      rows: rowsRotated,
      capacity: capRotated,
    };
  }

  return {
    widthMm: origW,
    heightMm: origH,
    isRotated: false,
    cols: colsUpright,
    rows: rowsUpright,
    capacity: capUpright,
  };
}

interface PhotoInstance {
  photo: PhotoItem;
  itemNumber: number;
  widthMm: number;
  heightMm: number;
  isRotated: boolean;
}

interface LayoutRow {
  items: PhotoInstance[];
  rowHeight: number;
  maxCols: number;
  cellWidth: number;
}

interface SheetBlock {
  rows: LayoutRow[];
}

/**
 * Packs photos on A4 paper with mathematical guarantee that NO photo ever goes outside page boundaries.
 */
export function packPhotosToSheets(
  photoItems: PhotoItem[],
  config: LayoutConfig = DEFAULT_LAYOUT_CONFIG
): SheetLayout[] {
  if (!photoItems || photoItems.length === 0) {
    return [];
  }

  const paperW = config.paperWidthMm;
  const paperH = config.paperHeightMm;
  const minMargin = Math.max(2, config.marginMm);

  // Flatten all requested copies into individual instances with resolved orientation
  const instances: PhotoInstance[] = [];

  photoItems.forEach((photo) => {
    const copyCount = Math.max(1, Math.floor(photo.copies || 1));
    const orientation = resolvePhotoOrientation(photo, config);

    for (let c = 1; c <= copyCount; c++) {
      instances.push({
        photo,
        itemNumber: c,
        widthMm: orientation.widthMm,
        heightMm: orientation.heightMm,
        isRotated: orientation.isRotated,
      });
    }
  });

  // Group instances into sheets and rows
  const sheets: SheetBlock[] = [];
  let currentSheet: SheetBlock = { rows: [] };
  let currentRow: LayoutRow | null = null;

  // Helper to test if a row fits vertically on current sheet
  const canRowFitOnSheet = (sheet: SheetBlock, rowHeight: number): boolean => {
    if (sheet.rows.length === 0) {
      return minMargin + rowHeight + minMargin <= paperH;
    }
    const currentTotalH = sheet.rows.reduce(
      (sum, r, idx) => sum + r.rowHeight + (idx > 0 ? config.spacingMm : 0),
      0
    );
    const newTotalH = currentTotalH + config.spacingMm + rowHeight;
    return minMargin + newTotalH + minMargin <= paperH + 0.5;
  };

  for (let i = 0; i < instances.length; i++) {
    const item = instances[i];
    const maxCols = computeMaxCols(item.widthMm, paperW);

    // Can we add this item to currentRow?
    const canAddToRow =
      currentRow !== null &&
      currentRow.items.length < currentRow.maxCols &&
      Math.abs(currentRow.cellWidth - item.widthMm) < 0.1 &&
      Math.abs(currentRow.rowHeight - item.heightMm) < 0.1;

    if (canAddToRow && currentRow) {
      currentRow.items.push(item);
    } else {
      // Need a new row.
      // Finalize previous row into current sheet if it exists
      if (currentRow && currentRow.items.length > 0) {
        if (canRowFitOnSheet(currentSheet, currentRow.rowHeight)) {
          currentSheet.rows.push(currentRow);
        } else {
          sheets.push(currentSheet);
          currentSheet = { rows: [currentRow] };
        }
      }

      // Check if new row can fit on current sheet
      if (!canRowFitOnSheet(currentSheet, item.heightMm) && currentSheet.rows.length > 0) {
        sheets.push(currentSheet);
        currentSheet = { rows: [] };
      }

      // Start new row
      currentRow = {
        items: [item],
        rowHeight: item.heightMm,
        maxCols,
        cellWidth: item.widthMm,
      };
    }
  }

  // Push remaining row and sheet
  if (currentRow && currentRow.items.length > 0) {
    if (canRowFitOnSheet(currentSheet, currentRow.rowHeight)) {
      currentSheet.rows.push(currentRow);
    } else {
      sheets.push(currentSheet);
      currentSheet = { rows: [currentRow] };
    }
  }

  if (currentSheet.rows.length > 0) {
    sheets.push(currentSheet);
  }

  // Now calculate coordinates strictly within [0, paperW] and [0, paperH]
  const result: SheetLayout[] = [];

  sheets.forEach((sheet, sheetIdx) => {
    const placedPhotos: PlacedPhoto[] = [];
    const numRows = sheet.rows.length;
    if (numRows === 0) return;

    // 1. Vertical coordinates
    const totalPhotosHeight = sheet.rows.reduce((sum, r) => sum + r.rowHeight, 0);
    const leftoverH = paperH - totalPhotosHeight;

    let marginY = minMargin;
    let gutterY = config.spacingMm;

    if (config.verticalAlignment === 'top') {
      marginY = minMargin;
      gutterY = config.spacingMm;
    } else if (config.verticalAlignment === 'distribute') {
      const idealGutterY = leftoverH / (numRows + 1);
      if (idealGutterY >= minMargin) {
        marginY = idealGutterY;
        gutterY = idealGutterY;
      } else {
        marginY = minMargin;
        gutterY = numRows > 1 ? Math.max(1.0, (leftoverH - 2 * minMargin) / (numRows - 1)) : 0;
      }
    } else if (config.verticalAlignment === 'center') {
      const totalUsedH = totalPhotosHeight + (numRows - 1) * config.spacingMm;
      marginY = Math.max(minMargin, (paperH - totalUsedH) / 2);
      gutterY = config.spacingMm;
    }

    let currentY = marginY;

    // 2. Horizontal coordinates for each row
    sheet.rows.forEach((row) => {
      const actualCols = row.maxCols;
      const totalPhotosWidth = actualCols * row.cellWidth;
      const leftoverW = paperW - totalPhotosWidth;

      let marginX = minMargin;
      let gutterX = config.spacingMm;

      if (config.distributeHorizontally) {
        const idealGutterX = leftoverW / (actualCols + 1);
        if (idealGutterX >= 1.0) {
          marginX = idealGutterX;
          gutterX = idealGutterX;
        } else {
          gutterX = actualCols > 1 ? Math.max(0.5, (leftoverW - 4) / (actualCols - 1)) : 0;
          marginX = Math.max(2, (leftoverW - (actualCols - 1) * gutterX) / 2);
        }
      } else {
        const totalUsedW = totalPhotosWidth + (actualCols - 1) * config.spacingMm;
        marginX = Math.max(minMargin, (paperW - totalUsedW) / 2);
        gutterX = config.spacingMm;
      }

      // Guarantee mathematically that rightmost edge does not exceed paperW
      const maxRightEdge = marginX + (actualCols - 1) * (row.cellWidth + gutterX) + row.cellWidth;
      if (maxRightEdge > paperW) {
        const excess = maxRightEdge - paperW;
        marginX = Math.max(1.5, marginX - excess / 2);
        if (actualCols > 1) {
          gutterX = Math.max(0.5, (paperW - marginX * 2 - actualCols * row.cellWidth) / (actualCols - 1));
        }
      }

      // Place each item in the row
      row.items.forEach((item, colIdx) => {
        let xMm = marginX + colIdx * (row.cellWidth + gutterX);
        let yMm = currentY;

        // Hard clamping safety guarantee
        xMm = Math.max(0.5, Math.min(paperW - item.widthMm - 0.5, xMm));
        yMm = Math.max(0.5, Math.min(paperH - item.heightMm - 0.5, yMm));

        placedPhotos.push({
          sheetIndex: sheetIdx,
          photoId: item.photo.id,
          croppedUrl: item.photo.croppedUrl,
          xMm: Math.round(xMm * 100) / 100,
          yMm: Math.round(yMm * 100) / 100,
          widthMm: item.widthMm,
          heightMm: item.heightMm,
          itemNumber: item.itemNumber,
          totalCopiesOfThisPhoto: item.photo.copies,
          isRotated: item.isRotated,
        });
      });

      currentY += row.rowHeight + gutterY;
    });

    result.push({
      sheetIndex: sheetIdx,
      photos: placedPhotos,
    });
  });

  return result;
}

/**
 * Calculates how many photos of a given dimension can fit on a single A4 sheet.
 */
export function estimateCopiesPerSheet(
  photo: { dimension: { widthMm: number; heightMm: number; category: string }; orientation?: PhotoOrientation },
  config: LayoutConfig = DEFAULT_LAYOUT_CONFIG
): { columns: number; rows: number; total: number; isRotated: boolean } {
  const dummyItem: PhotoItem = {
    id: '',
    fileName: '',
    fileSize: 0,
    originalUrl: '',
    croppedUrl: '',
    dimension: photo.dimension as any,
    copies: 1,
    orientation: photo.orientation,
    aspectRatio: photo.dimension.widthMm / photo.dimension.heightMm,
  };
  const opt = resolvePhotoOrientation(dummyItem, config);
  return {
    columns: opt.cols,
    rows: opt.rows,
    total: opt.capacity,
    isRotated: opt.isRotated,
  };
}
