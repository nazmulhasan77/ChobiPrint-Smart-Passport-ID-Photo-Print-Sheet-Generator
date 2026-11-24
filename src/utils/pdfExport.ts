import jsPDF from 'jspdf';
import type { SheetLayout, LayoutConfig } from '../types';
import { A4_WIDTH_MM, A4_HEIGHT_MM, PRINT_DPI } from '../constants/dimensions';
import { getRotatedDataUrl } from './imageUtils';

/**
 * Generates and downloads a multi-page A4 printable PDF at true physical scale.
 */
export async function exportToPdf(
  sheets: SheetLayout[],
  config: LayoutConfig,
  fileName: string = 'BD_PhotoSheet_A4.pdf'
): Promise<void> {
  if (!sheets || sheets.length === 0) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  for (let index = 0; index < sheets.length; index++) {
    const sheet = sheets[index];

    if (index > 0) {
      doc.addPage('a4', 'portrait');
    }

    for (const photo of sheet.photos) {
      try {
        const imageUrl = photo.isRotated
          ? await getRotatedDataUrl(photo.croppedUrl)
          : photo.croppedUrl;

        doc.addImage(
          imageUrl,
          'JPEG',
          photo.xMm,
          photo.yMm,
          photo.widthMm,
          photo.heightMm,
          undefined,
          'FAST'
        );
      } catch (err) {
        console.error('Error adding image to PDF:', err);
      }

      // Draw photo cutting border if enabled (essential for white backgrounds on white photo paper)
      if (config.showPhotoBorder !== false || config.showCutLines) {
        if (config.photoBorderColor === 'black') {
          doc.setDrawColor(0, 0, 0); // Solid black
          doc.setLineWidth(0.2); // ~0.5 pt
        } else {
          doc.setDrawColor(180, 185, 195); // Subtle cutting gray
          doc.setLineWidth(0.18);
        }
        doc.rect(photo.xMm, photo.yMm, photo.widthMm, photo.heightMm, 'S');
      }

      // Draw corner tick marks if enabled
      if (config.showCornerMarks) {
        doc.setDrawColor(180, 185, 190);
        doc.setLineWidth(0.2);
        const tick = 1.5; // 1.5mm tick

        // Top-Left corner
        doc.line(photo.xMm - tick, photo.yMm, photo.xMm, photo.yMm);
        doc.line(photo.xMm, photo.yMm - tick, photo.xMm, photo.yMm);

        // Top-Right corner
        doc.line(photo.xMm + photo.widthMm, photo.yMm, photo.xMm + photo.widthMm + tick, photo.yMm);
        doc.line(photo.xMm + photo.widthMm, photo.yMm - tick, photo.xMm + photo.widthMm, photo.yMm);

        // Bottom-Left corner
        doc.line(photo.xMm - tick, photo.yMm + photo.heightMm, photo.xMm, photo.yMm + photo.heightMm);
        doc.line(photo.xMm, photo.yMm + photo.heightMm, photo.xMm, photo.yMm + photo.heightMm + tick);

        // Bottom-Right corner
        doc.line(photo.xMm + photo.widthMm, photo.yMm + photo.heightMm, photo.xMm + photo.widthMm + tick, photo.yMm + photo.heightMm);
        doc.line(photo.xMm + photo.widthMm, photo.yMm + photo.heightMm, photo.xMm + photo.widthMm, photo.yMm + photo.heightMm + tick);
      }
    }
  }

  doc.save(fileName);
}

/**
 * Renders a full 300 DPI A4 canvas (2480 x 3508 px) and triggers image download.
 */
export async function downloadSheetAsImage(
  sheet: SheetLayout,
  _totalSheets: number | undefined,
  config: LayoutConfig,
  fileName: string = `BD_PhotoSheet_Page_${sheet.sheetIndex + 1}.png`
): Promise<void> {
  const scale = PRINT_DPI / 25.4; // ~11.811 pixels per mm
  const canvasW = Math.round(A4_WIDTH_MM * scale); // 2480
  const canvasH = Math.round(A4_HEIGHT_MM * scale); // 3508

  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Fill crisp white background for photo paper
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasW, canvasH);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const loadImg = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  };

  for (const photo of sheet.photos) {
    try {
      const targetUrl = photo.isRotated
        ? await getRotatedDataUrl(photo.croppedUrl)
        : photo.croppedUrl;

      const img = await loadImg(targetUrl);
      const pxX = Math.round(photo.xMm * scale);
      const pxY = Math.round(photo.yMm * scale);
      const pxW = Math.round(photo.widthMm * scale);
      const pxH = Math.round(photo.heightMm * scale);

      ctx.drawImage(img, pxX, pxY, pxW, pxH);

      // Photo cutting border
      if (config.showPhotoBorder !== false || config.showCutLines) {
        ctx.strokeStyle = config.photoBorderColor === 'black' ? '#000000' : '#cbd5e1';
        ctx.lineWidth = config.photoBorderColor === 'black' ? 2 : 1.5;
        ctx.strokeRect(pxX, pxY, pxW, pxH);
      }

      // Corner tick marks
      if (config.showCornerMarks) {
        ctx.strokeStyle = '#9ca3af';
        ctx.lineWidth = 2;
        const tickPx = Math.round(1.5 * scale);

        ctx.beginPath();
        // TL
        ctx.moveTo(pxX - tickPx, pxY);
        ctx.lineTo(pxX, pxY);
        ctx.lineTo(pxX, pxY - tickPx);
        // TR
        ctx.moveTo(pxW + pxX, pxY - tickPx);
        ctx.lineTo(pxW + pxX, pxY);
        ctx.lineTo(pxW + pxX + tickPx, pxY);
        // BL
        ctx.moveTo(pxX - tickPx, pxY + pxH);
        ctx.lineTo(pxX, pxY + pxH);
        ctx.lineTo(pxX, pxY + pxH + tickPx);
        // BR
        ctx.moveTo(pxW + pxX + tickPx, pxY + pxH);
        ctx.lineTo(pxW + pxX, pxY + pxH);
        ctx.lineTo(pxW + pxX, pxY + pxH + tickPx);
        ctx.stroke();
      }
    } catch (e) {
      console.error('Failed to draw photo on canvas:', e);
    }
  }

  const dataUrl = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
