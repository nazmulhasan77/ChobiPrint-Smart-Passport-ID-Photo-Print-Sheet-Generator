import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Upload,
  Download,
  Trash2,
  RefreshCw,
  Sliders,
  Archive,
  Lock,
  Unlock,
  Printer,
  Sparkles,
  Zap,
} from 'lucide-react';
import type {
  ConvertedImageResult,
  OutputFormat,
  BatchSettings,
} from '../types/converter';
import {
  formatBytes,
  processImageConversion,
  downloadBlob,
  createZipArchive,
  getOutputFileName,
  loadImageDimensions,
} from '../utils/imageConverter';
import { generateSamplePortrait } from '../utils/sampleGenerator';
import { useLanguage } from '../i18n/LanguageContext';

interface ImageConverterProps {
  onSendToPrintSheet?: (imageUrl: string, fileName: string) => void;
}

export const ImageConverter: React.FC<ImageConverterProps> = ({ onSendToPrintSheet }) => {
  const { t } = useLanguage();
  const [items, setItems] = useState<ConvertedImageResult[]>([]);
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const [isZipping, setIsZipping] = useState(false);

  // Global settings
  const [settings, setSettings] = useState<BatchSettings>({
    format: 'webp',
    quality: 85,
    resizeMode: 'original',
    width: 0,
    height: 0,
    percentage: 100,
    maintainAspectRatio: true,
    unit: 'px',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Re-process items when settings change (debounced)
  const processAllItems = useCallback(async (currentItems: ConvertedImageResult[], currentSettings: BatchSettings) => {
    if (currentItems.length === 0) return;
    setIsProcessingAll(true);

    const updated = await Promise.all(
      currentItems.map(async (item) => {
        try {
          const res = await processImageConversion(item, currentSettings);
          return { ...item, ...res, isProcessing: false };
        } catch {
          return { ...item, isProcessing: false, error: 'Conversion failed' };
        }
      })
    );

    setItems(updated);
    setIsProcessingAll(false);
  }, []);

  // Debounced auto-reprocess when settings change
  useEffect(() => {
    if (items.length === 0) return;
    const timer = setTimeout(() => {
      processAllItems(items, settings);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.format, settings.quality, settings.resizeMode, settings.percentage, settings.width, settings.height, settings.unit]);

  // Handle files upload
  const handleUploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newEntries: ConvertedImageResult[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;

      const originalUrl = URL.createObjectURL(file);
      try {
        const { width, height } = await loadImageDimensions(originalUrl);
        const item: ConvertedImageResult = {
          id: `conv-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
          originalFile: file,
          originalWidth: width,
          originalHeight: height,
          originalSize: file.size,
          originalUrl,
          convertedBlob: null,
          convertedUrl: null,
          convertedSize: 0,
          convertedWidth: width,
          convertedHeight: height,
          format: settings.format,
          quality: settings.quality,
          isProcessing: true,
        };
        newEntries.push(item);
      } catch {
        URL.revokeObjectURL(originalUrl);
      }
    }

    if (newEntries.length === 0) return;

    const merged = [...items, ...newEntries];
    setItems(merged);
    processAllItems(merged, settings);
  };

  // Quick load demo photo
  const handleLoadDemo = async () => {
    const demoUrl = generateSamplePortrait('MD. RAHIM AHMED', ['#38bdf8', '#0284c7']);
    const res = await fetch(demoUrl);
    const blob = await res.blob();
    const demoFile = new File([blob], 'demo-portrait.jpg', { type: 'image/jpeg' });

    const dt = new DataTransfer();
    dt.items.add(demoFile);
    handleUploadFiles(dt.files);
  };

  // Remove single item
  const handleRemove = (id: string) => {
    setItems((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target?.convertedUrl) URL.revokeObjectURL(target.convertedUrl);
      if (target?.originalUrl) URL.revokeObjectURL(target.originalUrl);
      return prev.filter((i) => i.id !== id);
    });
  };

  // Clear all items
  const handleClearAll = () => {
    items.forEach((item) => {
      if (item.convertedUrl) URL.revokeObjectURL(item.convertedUrl);
      if (item.originalUrl) URL.revokeObjectURL(item.originalUrl);
    });
    setItems([]);
  };

  // Single download
  const handleDownloadSingle = (item: ConvertedImageResult) => {
    if (!item.convertedBlob) return;
    const fileName = getOutputFileName(item.originalFile.name, item.format);
    downloadBlob(item.convertedBlob, fileName);
  };

  // Batch ZIP download
  const handleDownloadZip = async () => {
    if (items.length === 0) return;
    setIsZipping(true);
    try {
      const zipBlob = await createZipArchive(items);
      downloadBlob(zipBlob, `ChobiPrint_Converted_${Date.now()}.zip`);
    } catch {
      alert('Failed to generate ZIP archive.');
    } finally {
      setIsZipping(false);
    }
  };

  // Calculate total original and converted size stats
  const totalOriginalSize = items.reduce((acc, curr) => acc + curr.originalSize, 0);
  const totalConvertedSize = items.reduce((acc, curr) => acc + curr.convertedSize, 0);
  const totalSavings = totalOriginalSize > 0 && totalConvertedSize > 0 
    ? Math.round(((totalOriginalSize - totalConvertedSize) / totalOriginalSize) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">
              {t('convTitle')}
            </h1>
            <p className="text-xs text-slate-500">
              {t('convSubtitle')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleLoadDemo}
            className="px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('loadDemo')}</span>
          </button>

          {items.length > 0 && (
            <>
              <button
                type="button"
                onClick={handleDownloadZip}
                disabled={isZipping || isProcessingAll}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isZipping ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Archive className="w-3.5 h-3.5" />
                )}
                <span>{t('downloadAllZip')}</span>
              </button>

              <button
                type="button"
                onClick={handleClearAll}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-medium transition cursor-pointer"
              >
                {t('clearAll')}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Settings & Upload (lg:col-span-5) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Upload Drop Zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleUploadFiles(e.dataTransfer.files);
            }}
            className="group border-2 border-dashed border-indigo-200 hover:border-indigo-500 bg-white hover:bg-indigo-50/30 rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center shadow-xs"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => handleUploadFiles(e.target.files)}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-full bg-indigo-50 group-hover:bg-indigo-100 text-indigo-600 flex items-center justify-center mb-3 transition">
              <Upload className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm mb-1">
              Select or Drop Images to Convert
            </h3>
            <p className="text-xs text-slate-500 max-w-xs">
              Supports any image format (JPG, PNG, WEBP, AVIF, BMP). Batch processing ready.
            </p>
          </div>

          {/* Conversion Settings Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                Conversion Settings
              </h2>
              {isProcessingAll && (
                <span className="flex items-center gap-1.5 text-xs text-indigo-600 font-medium">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Updating...
                </span>
              )}
            </div>

            {/* Target Output Format */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 block">
                {t('targetFormat')}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['jpeg', 'png', 'webp'] as OutputFormat[]).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setSettings((s) => ({ ...s, format: fmt }))}
                    className={`py-2 px-3 rounded-xl text-xs font-bold uppercase transition flex flex-col items-center justify-center border cursor-pointer ${
                      settings.format === fmt
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>{fmt === 'jpeg' ? 'JPG' : fmt}</span>
                    <span className="text-[10px] font-normal normal-case opacity-75">
                      {fmt === 'png' ? 'Lossless' : fmt === 'webp' ? 'Modern / Compact' : 'Universal'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quality Slider (JPG / WEBP) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">
                  {t('imageQuality')}
                </label>
                <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                  {settings.format === 'png' ? '100% (Lossless)' : `${settings.quality}%`}
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="100"
                step="1"
                disabled={settings.format === 'png'}
                value={settings.quality}
                onChange={(e) => setSettings((s) => ({ ...s, quality: Number(e.target.value) }))}
                className="w-full accent-indigo-600 h-2 bg-slate-200 rounded-lg cursor-pointer disabled:opacity-40"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                <span>Smallest File (Low)</span>
                <span>Balanced (80-90%)</span>
                <span>Maximum Quality (100%)</span>
              </div>
            </div>

            {/* Resizer Mode Selection */}
            <div className="space-y-3 border-t border-slate-100 pt-3">
              <label className="text-xs font-semibold text-slate-700 block">
                {t('resizeOptions')}
              </label>

              <div className="flex gap-2">
                {[
                  { id: 'original', label: t('originalSize') },
                  { id: 'percentage', label: t('scalePct') },
                  { id: 'dimensions', label: t('customDim') },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setSettings((s) => ({ ...s, resizeMode: mode.id as any }))}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium border transition cursor-pointer ${
                      settings.resizeMode === mode.id
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-semibold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>

              {/* Scale Percentage Controls */}
              {settings.resizeMode === 'percentage' && (
                <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600 font-medium">Scale Multiplier</span>
                    <span className="text-xs font-mono font-bold text-indigo-600">{settings.percentage}%</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[25, 50, 75, 100, 150, 200].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setSettings((s) => ({ ...s, percentage: pct }))}
                        className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                          settings.percentage === pct
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Dimensions Controls */}
              {settings.resizeMode === 'dimensions' && (
                <div className="space-y-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600 font-medium">Unit:</span>
                    <div className="flex rounded-md border border-slate-200 bg-white p-0.5">
                      <button
                        type="button"
                        onClick={() => setSettings((s) => ({ ...s, unit: 'px' }))}
                        className={`px-2 py-0.5 text-[11px] rounded font-semibold ${
                          settings.unit === 'px' ? 'bg-indigo-600 text-white' : 'text-slate-600'
                        }`}
                      >
                        Pixels (px)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSettings((s) => ({ ...s, unit: 'mm' }))}
                        className={`px-2 py-0.5 text-[11px] rounded font-semibold ${
                          settings.unit === 'mm' ? 'bg-indigo-600 text-white' : 'text-slate-600'
                        }`}
                      >
                        Millimeters (mm @ 300 DPI)
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 items-center">
                    <div>
                      <label className="text-[11px] text-slate-500 font-medium block mb-1">
                        Width ({settings.unit})
                      </label>
                      <input
                        type="number"
                        min="1"
                        placeholder="Auto"
                        value={settings.width || ''}
                        onChange={(e) => setSettings((s) => ({ ...s, width: Number(e.target.value) || 0 }))}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-mono focus:border-indigo-500 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500 font-medium block mb-1">
                        Height ({settings.unit})
                      </label>
                      <input
                        type="number"
                        min="1"
                        placeholder="Auto"
                        value={settings.height || ''}
                        onChange={(e) => setSettings((s) => ({ ...s, height: Number(e.target.value) || 0 }))}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-mono focus:border-indigo-500 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  {/* Aspect Ratio Lock Toggle */}
                  <button
                    type="button"
                    onClick={() => setSettings((s) => ({ ...s, maintainAspectRatio: !s.maintainAspectRatio }))}
                    className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded border transition w-full justify-center ${
                      settings.maintainAspectRatio
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                        : 'bg-white border-slate-200 text-slate-500'
                    }`}
                  >
                    {settings.maintainAspectRatio ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    <span>{settings.maintainAspectRatio ? 'Aspect Ratio Locked (Proportional)' : 'Freeform Ratio'}</span>
                  </button>

                  {/* Studio Quick Presets */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                      Quick Studio Presets
                    </span>
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={() => setSettings((s) => ({ ...s, unit: 'mm', width: 40, height: 50 }))}
                        className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-700 hover:bg-slate-100 font-medium"
                      >
                        Passport 40×50 mm
                      </button>
                      <button
                        type="button"
                        onClick={() => setSettings((s) => ({ ...s, unit: 'mm', width: 20, height: 25 }))}
                        className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-700 hover:bg-slate-100 font-medium"
                      >
                        Stamp 20×25 mm
                      </button>
                      <button
                        type="button"
                        onClick={() => setSettings((s) => ({ ...s, unit: 'px', width: 1920, height: 1080 }))}
                        className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-700 hover:bg-slate-100 font-medium"
                      >
                        1080p FHD
                      </button>
                      <button
                        type="button"
                        onClick={() => setSettings((s) => ({ ...s, unit: 'px', width: 500, height: 500 }))}
                        className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-700 hover:bg-slate-100 font-medium"
                      >
                        Square 500px
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Converted Results & Queue (lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Summary Stats Header when items exist */}
          {items.length > 0 && (
            <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-[11px] text-slate-400 block font-medium">{t('totalImages')}</span>
                  <span className="text-base font-bold font-mono">{items.length}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block font-medium">{t('originalTotal')}</span>
                  <span className="text-base font-bold font-mono">{formatBytes(totalOriginalSize)}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block font-medium">{t('convertedTotal')}</span>
                  <span className="text-base font-bold font-mono text-emerald-400">
                    {formatBytes(totalConvertedSize)}
                  </span>
                </div>
              </div>

              {totalSavings > 0 && (
                <div className="bg-emerald-500/20 border border-emerald-500/30 px-3 py-1.5 rounded-xl text-right">
                  <span className="text-[10px] text-emerald-300 block font-bold uppercase tracking-wider">
                    {t('totalSaved')}
                  </span>
                  <span className="text-sm font-extrabold text-emerald-400 font-mono">
                    🔻 {totalSavings}% {t('smaller')}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {items.length === 0 ? (
            <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 mb-4">
                <Sliders className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-slate-700 text-base mb-1">
                {t('noImagesYet')}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mb-5">
                {t('dropToConvert')}
              </p>
              <button
                type="button"
                onClick={handleLoadDemo}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-2 transition shadow-xs cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>{t('testSample')}</span>
              </button>
            </div>
          ) : (
            /* Items List */
            <div className="space-y-3">
              {items.map((item, idx) => {
                const diff = item.originalSize - item.convertedSize;
                const savingsPct = item.originalSize > 0 
                  ? Math.round((diff / item.originalSize) * 100) 
                  : 0;

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition flex flex-col sm:flex-row items-center gap-4"
                  >
                    {/* Thumbnail */}
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 relative flex items-center justify-center">
                      <img
                        src={item.convertedUrl || item.originalUrl}
                        alt={item.originalFile.name}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] font-mono font-bold px-1 rounded uppercase">
                        {item.format}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0 text-center sm:text-left">
                      <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                        <span className="text-xs font-bold text-slate-800 truncate max-w-xs">
                          {item.originalFile.name}
                        </span>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-mono">
                          #{idx + 1}
                        </span>
                      </div>

                      {/* Dimensions & Sizes comparison */}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-500 font-mono mt-2">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-sans">Original:</span>
                          <span>{item.originalWidth}×{item.originalHeight} px</span>
                          <span className="text-slate-400 ml-1.5">({formatBytes(item.originalSize)})</span>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400 block font-sans">Converted:</span>
                          <span className="font-semibold text-slate-700">
                            {item.convertedWidth}×{item.convertedHeight} px
                          </span>
                          <span className="text-indigo-600 font-bold ml-1.5">
                            ({formatBytes(item.convertedSize)})
                          </span>
                        </div>
                      </div>

                      {/* Savings tag */}
                      {savingsPct > 0 && (
                        <div className="mt-2 flex items-center justify-center sm:justify-start">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            🔻 {savingsPct}% Smaller ({formatBytes(diff)} saved)
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex sm:flex-col gap-2 shrink-0 w-full sm:w-auto justify-end">
                      <button
                        type="button"
                        onClick={() => handleDownloadSingle(item)}
                        disabled={!item.convertedBlob}
                        className="flex-1 sm:flex-none px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-xs disabled:opacity-50 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{t('download')}</span>
                      </button>

                      {onSendToPrintSheet && (
                        <button
                          type="button"
                          onClick={() => onSendToPrintSheet(item.convertedUrl || item.originalUrl, item.originalFile.name)}
                          className="flex-1 sm:flex-none px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                          title="Open photo in Passport Print Sheet"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>{t('sendToPrint')}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleRemove(item.id)}
                        className="p-1.5 rounded-xl border border-slate-200 hover:bg-rose-50 hover:border-rose-200 text-slate-400 hover:text-rose-600 transition flex items-center justify-center"
                        title="Remove photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
