import React, { useState } from 'react';
import {
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  FileText,
  Image as ImageIcon,
  Settings2,
  AlignJustify,
  Scissors,
  BookmarkCheck,
} from 'lucide-react';
import type { SheetLayout, LayoutConfig } from '../types';
import { exportToPdf, downloadSheetAsImage } from '../utils/pdfExport';
import { A4_WIDTH_MM, A4_HEIGHT_MM } from '../constants/dimensions';

interface SheetPreviewProps {
  sheets: SheetLayout[];
  config: LayoutConfig;
  onUpdateConfig: (newConfig: LayoutConfig) => void;
  isProcessing?: boolean;
}

export const SheetPreview: React.FC<SheetPreviewProps> = ({
  sheets,
  config,
  onUpdateConfig,
}) => {
  const [currentSheetIdx, setCurrentSheetIdx] = useState<number>(0);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [showConfigDrawer, setShowConfigDrawer] = useState<boolean>(false);

  if (!sheets || sheets.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-white rounded-2xl border border-dashed border-slate-300 text-slate-400 min-h-[460px]">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4 text-slate-400">
          <FileText className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-700 mb-1">A4 Sheet Preview</h3>
        <p className="text-sm text-slate-500 max-w-sm">
          Add one or more photos on the left, configure their copies and dimensions, then click{' '}
          <span className="font-semibold text-indigo-600">"Process & Arrange Photos"</span> to generate your printable A4 sheets.
        </p>
      </div>
    );
  }

  const activeSheet = sheets[Math.min(currentSheetIdx, sheets.length - 1)];

  // Calculate lowest Y coordinate of placed photos on active sheet
  const maxYCoord = activeSheet.photos.reduce(
    (max, p) => Math.max(max, p.yMm + p.heightMm),
    0
  );
  const unusedHeightMm = Math.max(0, A4_HEIGHT_MM - maxYCoord - config.marginMm);

  // PDF Export
  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      await exportToPdf(sheets, config);
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  // Image Export
  const handleExportImage = async () => {
    setIsExporting(true);
    try {
      await downloadSheetAsImage(activeSheet, sheets.length, config);
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  // Browser Print
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Preview Header & Controls */}
      <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-800 text-sm">Sheet Preview</span>
          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-md text-xs font-mono font-semibold">
            {sheets.length} A4 {sheets.length === 1 ? 'Sheet' : 'Sheets'}
          </span>
          <span className="text-xs text-slate-500">
            ({activeSheet.photos.length} photos on this page)
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Options toggle */}
          <button
            type="button"
            onClick={() => setShowConfigDrawer(!showConfigDrawer)}
            className={`p-2 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${
              showConfigDrawer
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
            title="Sheet Layout Settings (Margins, Spacing, Cut lines)"
          >
            <Settings2 className="w-4 h-4" />
            <span className="hidden sm:inline">Settings</span>
          </button>

          {/* Download Image Button */}
          <button
            type="button"
            onClick={handleExportImage}
            disabled={isExporting}
            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            title="Download Current Sheet as 300 DPI PNG"
          >
            <ImageIcon className="w-4 h-4 text-slate-500" />
            <span className="hidden md:inline">PNG Image</span>
          </button>

          {/* Download PDF Button */}
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isExporting}
            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-indigo-600/30 transition cursor-pointer"
            title="Download Multi-page High-Resolution Printable PDF"
          >
            <Download className="w-4 h-4" />
            <span>PDF (All Pages)</span>
          </button>

          {/* Browser Print Button */}
          <button
            type="button"
            onClick={handlePrint}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 transition cursor-pointer"
            title="Print directly to physical photo printer"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Print</span>
          </button>
        </div>
      </div>

      {/* Layout Settings Drawer */}
      {showConfigDrawer && (
        <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          {/* Vertical Packing (Save unused paper) */}
          <div className="flex flex-col justify-between">
            <span className="text-slate-700 font-semibold mb-1 flex items-center gap-1">
              <BookmarkCheck className="w-3.5 h-3.5 text-indigo-600" />
              Vertical Alignment
            </span>
            <div className="bg-white p-1 rounded-lg border border-slate-200 flex flex-col gap-1">
              <label className="flex items-center gap-2 p-1 rounded hover:bg-slate-50 cursor-pointer">
                <input
                  type="radio"
                  name="verticalAlignment"
                  value="top"
                  checked={config.verticalAlignment === 'top'}
                  onChange={() => onUpdateConfig({ ...config, verticalAlignment: 'top' })}
                  className="accent-indigo-600 w-3.5 h-3.5 cursor-pointer"
                />
                <span className="text-[11px] font-medium text-slate-700">
                  Top (Save bottom paper)
                </span>
              </label>
              <label className="flex items-center gap-2 p-1 rounded hover:bg-slate-50 cursor-pointer">
                <input
                  type="radio"
                  name="verticalAlignment"
                  value="distribute"
                  checked={config.verticalAlignment === 'distribute'}
                  onChange={() => onUpdateConfig({ ...config, verticalAlignment: 'distribute' })}
                  className="accent-indigo-600 w-3.5 h-3.5 cursor-pointer"
                />
                <span className="text-[11px] text-slate-600">Distribute vertically</span>
              </label>
              <label className="flex items-center gap-2 p-1 rounded hover:bg-slate-50 cursor-pointer">
                <input
                  type="radio"
                  name="verticalAlignment"
                  value="center"
                  checked={config.verticalAlignment === 'center'}
                  onChange={() => onUpdateConfig({ ...config, verticalAlignment: 'center' })}
                  className="accent-indigo-600 w-3.5 h-3.5 cursor-pointer"
                />
                <span className="text-[11px] text-slate-600">Center on sheet</span>
              </label>
            </div>
          </div>

          {/* Horizontal Spacing & Orientation */}
          <div className="flex flex-col justify-between">
            <span className="text-slate-700 font-semibold mb-1 flex items-center gap-1">
              <AlignJustify className="w-3.5 h-3.5 text-indigo-600" />
              Horizontal & Orientation
            </span>
            <div className="bg-white p-2 rounded-lg border border-slate-200 flex flex-col gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.distributeHorizontally}
                  onChange={(e) =>
                    onUpdateConfig({ ...config, distributeHorizontally: e.target.checked })
                  }
                  className="rounded accent-indigo-600 w-3.5 h-3.5 cursor-pointer"
                />
                <span className="text-[11px] text-slate-700">Even column gutters</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.autoOptimizeOrientation}
                  onChange={(e) =>
                    onUpdateConfig({ ...config, autoOptimizeOrientation: e.target.checked })
                  }
                  className="rounded accent-indigo-600 w-3.5 h-3.5 cursor-pointer"
                />
                <span className="text-[11px] text-slate-700">Auto-rotate for density</span>
              </label>
            </div>
          </div>

          {/* Cutting Guides */}
          <div className="flex flex-col justify-between">
            <span className="text-slate-700 font-semibold mb-1 flex items-center gap-1">
              <Scissors className="w-3.5 h-3.5 text-indigo-600" />
              Cutting Guides
            </span>
            <div className="bg-white p-2 rounded-lg border border-slate-200 flex flex-col gap-1.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.showCutLines}
                  onChange={(e) =>
                    onUpdateConfig({ ...config, showCutLines: e.target.checked })
                  }
                  className="rounded accent-indigo-600 w-3.5 h-3.5 cursor-pointer"
                />
                <span className="text-[11px] text-slate-600">Subtle border stroke</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.showCornerMarks}
                  onChange={(e) =>
                    onUpdateConfig({ ...config, showCornerMarks: e.target.checked })
                  }
                  className="rounded accent-indigo-600 w-3.5 h-3.5 cursor-pointer"
                />
                <span className="text-[11px] text-slate-600">Corner tick marks</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.showPaperReuseIndicator}
                  onChange={(e) =>
                    onUpdateConfig({ ...config, showPaperReuseIndicator: e.target.checked })
                  }
                  className="rounded accent-indigo-600 w-3.5 h-3.5 cursor-pointer"
                />
                <span className="text-[11px] text-slate-600">Show reuse paper line</span>
              </label>
            </div>
          </div>

          {/* Margins & Spacing Sliders */}
          <div className="flex flex-col justify-between space-y-2">
            <div>
              <div className="flex justify-between text-[11px] text-slate-600 mb-0.5">
                <span>Page Margin:</span>
                <span className="font-mono">{config.marginMm} mm</span>
              </div>
              <input
                type="range"
                min="4"
                max="18"
                step="1"
                value={config.marginMm}
                onChange={(e) =>
                  onUpdateConfig({ ...config, marginMm: parseFloat(e.target.value) })
                }
                className="w-full accent-indigo-600 cursor-pointer h-1.5"
              />
            </div>
            <div>
              <div className="flex justify-between text-[11px] text-slate-600 mb-0.5">
                <span>Row Spacing:</span>
                <span className="font-mono">{config.spacingMm} mm</span>
              </div>
              <input
                type="range"
                min="1"
                max="8"
                step="0.5"
                value={config.spacingMm}
                onChange={(e) =>
                  onUpdateConfig({ ...config, spacingMm: parseFloat(e.target.value) })
                }
                className="w-full accent-indigo-600 cursor-pointer h-1.5"
              />
            </div>
          </div>
        </div>
      )}

      {/* Sheet Preview Workspace */}
      <div className="flex-1 bg-slate-200/70 p-4 sm:p-6 flex flex-col items-center justify-center overflow-auto">
        {/* Realistic A4 Paper Container */}
        <div
          className="relative bg-white shadow-xl shadow-slate-400/30 border border-slate-300 rounded-sm select-none transition-all duration-200 overflow-hidden"
          style={{
            width: '100%',
            maxWidth: '460px',
            aspectRatio: `${A4_WIDTH_MM} / ${A4_HEIGHT_MM}`, // 210 / 297 = ~0.707
          }}
        >
          {/* Render Placed Photos */}
          {activeSheet.photos.map((item, idx) => {
            const widthPct = (item.widthMm / A4_WIDTH_MM) * 100;
            const heightPct = (item.heightMm / A4_HEIGHT_MM) * 100;
            const leftPct = Math.min(100 - widthPct, Math.max(0, (item.xMm / A4_WIDTH_MM) * 100));
            const topPct = Math.min(100 - heightPct, Math.max(0, (item.yMm / A4_HEIGHT_MM) * 100));

            return (
              <div
                key={`${item.photoId}-${item.itemNumber}-${idx}`}
                className="absolute group overflow-hidden"
                style={{
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                  width: `${widthPct}%`,
                  height: `${heightPct}%`,
                }}
              >
                {/* Photo Image (with 90deg orientation support) */}
                {item.isRotated ? (
                  <div className="w-full h-full flex items-center justify-center overflow-hidden">
                    <img
                      src={item.croppedUrl}
                      alt={`Photo copy ${item.itemNumber}`}
                      className="pointer-events-none block object-cover"
                      style={{
                        width: `${(item.heightMm / item.widthMm) * 100}%`,
                        height: `${(item.widthMm / item.heightMm) * 100}%`,
                        transform: 'rotate(90deg)',
                        outline: config.showCutLines ? '1px solid #d1d5db' : 'none',
                      }}
                    />
                  </div>
                ) : (
                  <img
                    src={item.croppedUrl}
                    alt={`Photo copy ${item.itemNumber}`}
                    className="w-full h-full object-cover block pointer-events-none"
                    style={{
                      outline: config.showCutLines ? '1px solid #d1d5db' : 'none',
                    }}
                  />
                )}

                {/* Corner Cutting Marks */}
                {config.showCornerMarks && (
                  <>
                    <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-slate-400/80 pointer-events-none" />
                    <div className="absolute top-0 right-0 w-1.5 h-1.5 border-t border-r border-slate-400/80 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-1.5 h-1.5 border-b border-l border-slate-400/80 pointer-events-none" />
                    <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-slate-400/80 pointer-events-none" />
                  </>
                )}

                {/* Hover Tooltip */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute inset-0 bg-indigo-900/60 flex items-center justify-center text-white text-[9px] font-mono p-0.5 text-center pointer-events-none">
                  {item.widthMm}×{item.heightMm}mm (#{item.itemNumber}) {item.isRotated ? '↻ 90°' : ''}
                </div>
              </div>
            );
          })}

          {/* Reusable Paper Indicator (Clean unused paper below cut line) */}
          {config.showPaperReuseIndicator &&
            config.verticalAlignment === 'top' &&
            unusedHeightMm > 35 && (
              <div
                className="absolute left-0 right-0 border-t-2 border-dashed border-emerald-500/70 pointer-events-none flex flex-col items-center justify-center bg-emerald-50/30"
                style={{
                  top: `${((maxYCoord + 4) / A4_HEIGHT_MM) * 100}%`,
                  bottom: 0,
                }}
              >
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/95 border border-emerald-300 text-[9px] font-medium text-emerald-800 shadow-xs mb-1">
                  <Scissors className="w-3 h-3 text-emerald-600" />
                  <span>Cut Here to Save Unused Paper</span>
                </div>
                <span className="text-[8px] text-emerald-700/80 font-mono">
                  {Math.round(unusedHeightMm)} mm clean photo paper remaining for later use
                </span>
              </div>
            )}
        </div>
      </div>

      {/* Pagination Bar for Multiple Sheets */}
      {sheets.length > 1 && (
        <div className="px-5 py-3 bg-white border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            disabled={currentSheetIdx === 0}
            onClick={() => setCurrentSheetIdx((i) => Math.max(0, i - 1))}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold flex items-center gap-1 hover:bg-slate-50 transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous Sheet
          </button>

          <div className="flex items-center gap-1.5">
            {sheets.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrentSheetIdx(i)}
                className={`w-7 h-7 rounded-md text-xs font-mono font-bold transition cursor-pointer ${
                  currentSheetIdx === i
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <button
            type="button"
            disabled={currentSheetIdx === sheets.length - 1}
            onClick={() => setCurrentSheetIdx((i) => Math.min(sheets.length - 1, i + 1))}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold flex items-center gap-1 hover:bg-slate-50 transition cursor-pointer"
          >
            Next Sheet
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
