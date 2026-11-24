import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  RotateCw,
  RotateCcw,
  Check,
  User,
  FlipHorizontal,
  Grid,
  Lock,
  Unlock,
  Sun,
  Sparkles,
} from 'lucide-react';
import type { PhotoDimension, CropSettings, DimensionType, DimensionUnit } from '../types';
import {
  BANGLADESH_PRESETS,
  convertToMm,
  convertFromMm,
} from '../constants/dimensions';
import { estimateCopiesPerSheet } from '../utils/packingEngine';
import { useLanguage } from '../i18n/LanguageContext';

interface CropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  fileName: string;
  initialDimension: PhotoDimension;
  initialCopies: number;
  initialCropSettings?: CropSettings;
  onConfirm: (croppedUrl: string, dimension: PhotoDimension, copies: number, settings: CropSettings) => void;
}

type DragHandle =
  | 'move'
  | 'nw'
  | 'ne'
  | 'sw'
  | 'se'
  | 'n'
  | 's'
  | 'w'
  | 'e'
  | null;

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const CropModal: React.FC<CropModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  fileName,
  initialDimension,
  initialCopies,
  initialCropSettings,
  onConfirm,
}) => {
  const { t } = useLanguage();
  const [selectedDimension, setSelectedDimension] = useState<PhotoDimension>(initialDimension);
  const [selectedCategory, setSelectedCategory] = useState<DimensionType>(initialDimension.category);
  const [copies, setCopies] = useState<number>(initialCopies || 28);
  const [lockAspect, setLockAspect] = useState<boolean>(true);

  // Custom dimension states
  const [customUnit, setCustomUnit] = useState<DimensionUnit>('mm');
  const [customWidth, setCustomWidth] = useState<number>(initialDimension.widthMm);
  const [customHeight, setCustomHeight] = useState<number>(initialDimension.heightMm);

  // Transform controls
  const [rotation, setRotation] = useState<number>(initialCropSettings?.rotation || 0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [showFaceGuide, setShowFaceGuide] = useState<boolean>(true);
  const [showGridGuide, setShowGridGuide] = useState<boolean>(true);

  // Studio lighting & touchup
  const [brightness, setBrightness] = useState<number>(initialCropSettings?.brightness || 0);
  const [contrast, setContrast] = useState<number>(initialCropSettings?.contrast || 0);

  // Viewport and Crop Rect state (in pixels relative to displayed image container)
  const [imgLayout, setImgLayout] = useState<{ x: number; y: number; w: number; h: number }>({
    x: 0,
    y: 0,
    w: 0,
    h: 0,
  });
  const [cropRect, setCropRect] = useState<Rect>({ x: 0, y: 0, w: 0, h: 0 });

  const viewportRef = useRef<HTMLDivElement>(null);
  const imageElementRef = useRef<HTMLImageElement | null>(null);

  // Dragging state
  const activeHandleRef = useRef<DragHandle>(null);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; rect: Rect }>({
    mouseX: 0,
    mouseY: 0,
    rect: { x: 0, y: 0, w: 0, h: 0 },
  });

  const targetAspect = selectedDimension.widthMm / selectedDimension.heightMm;

  // Initialize crop rect centered on the image
  const initCropRect = useCallback(
    (imgW: number, imgH: number, aspect: number, keepLock: boolean) => {
      if (imgW <= 0 || imgH <= 0) return;

      let w = imgW * 0.85;
      let h = keepLock ? w / aspect : imgH * 0.85;

      if (h > imgH * 0.95) {
        h = imgH * 0.95;
        w = keepLock ? h * aspect : w;
      }
      if (w > imgW * 0.95) {
        w = imgW * 0.95;
        h = keepLock ? w / aspect : h;
      }

      const x = (imgW - w) / 2;
      const y = (imgH - h) / 2;
      setCropRect({ x, y, w, h });
    },
    []
  );

  // Measure and layout image inside viewport
  const updateImageLayout = useCallback(() => {
    if (!viewportRef.current || !imageElementRef.current) return;
    const vp = viewportRef.current.getBoundingClientRect();
    const img = imageElementRef.current;
    if (!img.naturalWidth || !img.naturalHeight) return;

    const isRot90 = rotation % 180 !== 0;
    const naturalW = isRot90 ? img.naturalHeight : img.naturalWidth;
    const naturalH = isRot90 ? img.naturalWidth : img.naturalHeight;

    const pad = 30; // padding around viewport
    const maxW = Math.max(100, vp.width - pad * 2);
    const maxH = Math.max(100, vp.height - pad * 2);

    let displayW = maxW;
    let displayH = (naturalH / naturalW) * displayW;

    if (displayH > maxH) {
      displayH = maxH;
      displayW = (naturalW / naturalH) * displayH;
    }

    const x = (vp.width - displayW) / 2;
    const y = (vp.height - displayH) / 2;

    setImgLayout({ x, y, w: displayW, h: displayH });
    initCropRect(displayW, displayH, targetAspect, lockAspect);
  }, [rotation, targetAspect, lockAspect, initCropRect]);

  // Load image & handle resize
  useEffect(() => {
    if (!isOpen || !imageUrl) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    img.onload = () => {
      imageElementRef.current = img;
      updateImageLayout();
    };

    window.addEventListener('resize', updateImageLayout);
    return () => window.removeEventListener('resize', updateImageLayout);
  }, [isOpen, imageUrl, updateImageLayout]);

  // Sync initial dimension when opened
  useEffect(() => {
    if (isOpen) {
      setSelectedDimension(initialDimension);
      setSelectedCategory(initialDimension.category);
      setCopies(initialCopies || 28);
      if (initialDimension.category === 'custom') {
        setCustomWidth(initialDimension.widthMm);
        setCustomHeight(initialDimension.heightMm);
      }
    }
  }, [isOpen, initialDimension, initialCopies]);

  // Re-fit crop box when dimension changes
  useEffect(() => {
    if (imgLayout.w > 0 && imgLayout.h > 0) {
      initCropRect(imgLayout.w, imgLayout.h, targetAspect, lockAspect);
    }
  }, [selectedDimension, targetAspect, lockAspect, imgLayout.w, imgLayout.h, initCropRect]);

  // Handle Preset Selection
  const handleSelectPreset = (preset: PhotoDimension) => {
    setSelectedDimension(preset);
    setSelectedCategory(preset.category);
    if (preset.category === 'passport') {
      setCopies(28); // Standard 28 copies for passport size on A4
    }
  };

  // Handle Custom Input changes
  const handleCustomChange = (w: number, h: number, unit: DimensionUnit) => {
    setCustomWidth(w);
    setCustomHeight(h);
    setCustomUnit(unit);
    const wMm = convertToMm(w, unit);
    const hMm = convertToMm(h, unit);

    if (wMm > 0 && hMm > 0) {
      const customDim: PhotoDimension = {
        id: `custom-${Date.now()}`,
        name: `Custom (${w} × ${h} ${unit})`,
        category: 'custom',
        widthMm: wMm,
        heightMm: hMm,
        description: `Custom size: ${wMm.toFixed(1)} × ${hMm.toFixed(1)} mm`,
      };
      setSelectedDimension(customDim);
    }
  };

  // Drag Start (mouse or touch)
  const onDragStart = (e: React.MouseEvent | React.TouchEvent, handle: DragHandle) => {
    e.stopPropagation();
    e.preventDefault();
    activeHandleRef.current = handle;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    dragStartRef.current = {
      mouseX: clientX,
      mouseY: clientY,
      rect: { ...cropRect },
    };
  };

  // Drag Move
  const onDragMove = useCallback(
    (clientX: number, clientY: number) => {
      const handle = activeHandleRef.current;
      if (!handle || imgLayout.w <= 0 || imgLayout.h <= 0) return;

      const dx = clientX - dragStartRef.current.mouseX;
      const dy = clientY - dragStartRef.current.mouseY;
      const start = dragStartRef.current.rect;

      const minSize = 40; // minimum 40px crop box
      const maxW = imgLayout.w;
      const maxH = imgLayout.h;

      let newX = start.x;
      let newY = start.y;
      let newW = start.w;
      let newH = start.h;

      // 1. Moving the entire crop box
      if (handle === 'move') {
        newX = Math.max(0, Math.min(maxW - start.w, start.x + dx));
        newY = Math.max(0, Math.min(maxH - start.h, start.y + dy));
        setCropRect({ x: newX, y: newY, w: start.w, h: start.h });
        return;
      }

      // 2. Resizing from corners & edges
      if (handle === 'se') {
        newW = Math.max(minSize, Math.min(maxW - start.x, start.w + dx));
        newH = lockAspect ? newW / targetAspect : Math.max(minSize, Math.min(maxH - start.y, start.h + dy));
        if (lockAspect && start.y + newH > maxH) {
          newH = maxH - start.y;
          newW = newH * targetAspect;
        }
      } else if (handle === 'sw') {
        const candidateW = Math.max(minSize, start.w - dx);
        const actualW = Math.min(candidateW, start.x + start.w);
        newW = actualW;
        newX = start.x + (start.w - newW);
        newH = lockAspect ? newW / targetAspect : Math.max(minSize, Math.min(maxH - start.y, start.h + dy));
        if (lockAspect && start.y + newH > maxH) {
          newH = maxH - start.y;
          newW = newH * targetAspect;
          newX = start.x + (start.w - newW);
        }
      } else if (handle === 'ne') {
        newW = Math.max(minSize, Math.min(maxW - start.x, start.w + dx));
        newH = lockAspect ? newW / targetAspect : Math.max(minSize, start.h - dy);
        newY = start.y + (start.h - newH);
        if (newY < 0) {
          newY = 0;
          newH = start.y + start.h;
          if (lockAspect) newW = newH * targetAspect;
        }
      } else if (handle === 'nw') {
        const candidateW = Math.max(minSize, start.w - dx);
        const actualW = Math.min(candidateW, start.x + start.w);
        newW = actualW;
        newX = start.x + (start.w - newW);
        newH = lockAspect ? newW / targetAspect : Math.max(minSize, start.h - dy);
        newY = start.y + (start.h - newH);
        if (newY < 0) {
          newY = 0;
          newH = start.y + start.h;
          if (lockAspect) {
            newW = newH * targetAspect;
            newX = start.x + (start.w - newW);
          }
        }
      } else if (handle === 'e') {
        newW = Math.max(minSize, Math.min(maxW - start.x, start.w + dx));
        if (lockAspect) {
          newH = newW / targetAspect;
          if (start.y + newH > maxH) {
            newH = maxH - start.y;
            newW = newH * targetAspect;
          }
        }
      } else if (handle === 'w') {
        const candidateW = Math.max(minSize, start.w - dx);
        newW = Math.min(candidateW, start.x + start.w);
        newX = start.x + (start.w - newW);
        if (lockAspect) {
          newH = newW / targetAspect;
          if (start.y + newH > maxH) {
            newH = maxH - start.y;
            newW = newH * targetAspect;
            newX = start.x + (start.w - newW);
          }
        }
      } else if (handle === 's') {
        newH = Math.max(minSize, Math.min(maxH - start.y, start.h + dy));
        if (lockAspect) {
          newW = newH * targetAspect;
          if (start.x + newW > maxW) {
            newW = maxW - start.x;
            newH = newW / targetAspect;
          }
        }
      } else if (handle === 'n') {
        const candidateH = Math.max(minSize, start.h - dy);
        newH = Math.min(candidateH, start.y + start.h);
        newY = start.y + (start.h - newH);
        if (lockAspect) {
          newW = newH * targetAspect;
          if (start.x + newW > maxW) {
            newW = maxW - start.x;
            newH = newW / targetAspect;
            newY = start.y + (start.h - newH);
          }
        }
      }

      setCropRect({
        x: Math.round(newX),
        y: Math.round(newY),
        w: Math.round(newW),
        h: Math.round(newH),
      });
    },
    [imgLayout.w, imgLayout.h, lockAspect, targetAspect]
  );

  const onDragEnd = useCallback(() => {
    activeHandleRef.current = null;
  }, []);

  // Global mouse & touch listeners
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (activeHandleRef.current) onDragMove(e.clientX, e.clientY);
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (activeHandleRef.current && e.touches.length > 0) {
        onDragMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const handleMouseUp = () => onDragEnd();
    const handleTouchEnd = () => onDragEnd();

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onDragMove, onDragEnd]);

  // Generate cropped high-res image
  const handleApply = () => {
    const img = imageElementRef.current;
    if (!img || imgLayout.w <= 0 || imgLayout.h <= 0) return;

    // Output dimensions at 300 DPI: (mm / 25.4) * 300
    const outW = Math.max(200, Math.round((selectedDimension.widthMm / 25.4) * 300));
    const outH = Math.max(200, Math.round((selectedDimension.heightMm / 25.4) * 300));

    // First, draw the source image with rotation/flip to an intermediate canvas
    const isRot90 = rotation % 180 !== 0;
    const transformedW = isRot90 ? img.naturalHeight : img.naturalWidth;
    const transformedH = isRot90 ? img.naturalWidth : img.naturalHeight;

    const tCanvas = document.createElement('canvas');
    tCanvas.width = transformedW;
    tCanvas.height = transformedH;
    const tCtx = tCanvas.getContext('2d');
    if (!tCtx) return;

    tCtx.save();
    tCtx.translate(transformedW / 2, transformedH / 2);
    tCtx.scale(isFlipped ? -1 : 1, 1);
    tCtx.rotate((rotation * Math.PI) / 180);
    tCtx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    tCtx.restore();

    // Calculate crop rectangle on the transformed natural image
    const normX = cropRect.x / imgLayout.w;
    const normY = cropRect.y / imgLayout.h;
    const normW = cropRect.w / imgLayout.w;
    const normH = cropRect.h / imgLayout.h;

    const sourceX = Math.round(normX * transformedW);
    const sourceY = Math.round(normY * transformedH);
    const sourceW = Math.round(normW * transformedW);
    const sourceH = Math.round(normH * transformedH);

    // Final high-res crop canvas
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = outW;
    finalCanvas.height = outH;
    const fCtx = finalCanvas.getContext('2d');
    if (!fCtx) return;

    fCtx.imageSmoothingEnabled = true;
    fCtx.imageSmoothingQuality = 'high';

    // Apply brightness and contrast filters
    if (brightness !== 0 || contrast !== 0) {
      const brightVal = 100 + brightness;
      const contrastVal = 100 + contrast;
      fCtx.filter = `brightness(${brightVal}%) contrast(${contrastVal}%)`;
    }

    fCtx.drawImage(tCanvas, sourceX, sourceY, sourceW, sourceH, 0, 0, outW, outH);

    const croppedDataUrl = finalCanvas.toDataURL('image/jpeg', 0.95);

    const cropSettings: CropSettings = {
      x: sourceX,
      y: sourceY,
      width: sourceW,
      height: sourceH,
      zoom: 1,
      rotation,
      brightness,
      contrast,
    };

    onConfirm(croppedDataUrl, selectedDimension, copies, cropSettings);
    onClose();
  };

  if (!isOpen) return null;

  const copiesPerA4 = estimateCopiesPerSheet({
    dimension: selectedDimension,
    orientation: selectedDimension.category === 'passport' ? 'horizontal' : 'auto',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 bg-slate-50">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span>Drag to Crop Photo (ফোন বা ফটোশপের মতো ক্রপ করুন)</span>
            </h2>
            <p className="text-xs text-slate-500 truncate max-w-md">
              {fileName} • Drag corners or edges to cut from any side • Drag center to move
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
          {/* Left Canvas Preview Area */}
          <div className="flex-1 flex flex-col bg-slate-950 select-none p-3 sm:p-4 relative min-h-[380px] lg:min-h-[500px]">
            {/* Viewport Area */}
            <div
              ref={viewportRef}
              className="relative flex-1 w-full h-full overflow-hidden flex items-center justify-center"
            >
              {imgLayout.w > 0 && imgLayout.h > 0 && (
                <div
                  className="relative select-none"
                  style={{
                    width: `${imgLayout.w}px`,
                    height: `${imgLayout.h}px`,
                  }}
                >
                  {/* Base Image Display */}
                  <div
                    className="absolute inset-0 flex items-center justify-center overflow-hidden"
                    style={{
                      transform: `rotate(${rotation}deg) scaleX(${isFlipped ? -1 : 1})`,
                      filter: `brightness(${100 + brightness}%) contrast(${100 + contrast}%)`,
                    }}
                  >
                    <img
                      src={imageUrl}
                      alt="Crop target"
                      className="w-full h-full object-contain pointer-events-none select-none block"
                    />
                  </div>

                  {/* Dark Dimmed Outer Mask (SVG with cutout rect) */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                    <defs>
                      <mask id="cropMask">
                        <rect width="100%" height="100%" fill="white" />
                        <rect
                          x={cropRect.x}
                          y={cropRect.y}
                          width={cropRect.w}
                          height={cropRect.h}
                          fill="black"
                        />
                      </mask>
                    </defs>
                    <rect
                      width="100%"
                      height="100%"
                      fill="rgba(15, 23, 42, 0.75)"
                      mask="url(#cropMask)"
                    />
                  </svg>

                  {/* Interactive Crop Box Overlay */}
                  <div
                    style={{
                      left: `${cropRect.x}px`,
                      top: `${cropRect.y}px`,
                      width: `${cropRect.w}px`,
                      height: `${cropRect.h}px`,
                    }}
                    className="absolute z-20 cursor-move border border-white/90 shadow-[0_0_8px_rgba(0,0,0,0.5)]"
                    onMouseDown={(e) => onDragStart(e, 'move')}
                    onTouchStart={(e) => onDragStart(e, 'move')}
                  >
                    {/* Rule of Thirds Grid */}
                    {showGridGuide && (
                      <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                        <div className="border-r border-b border-white/30" />
                        <div className="border-r border-b border-white/30" />
                        <div className="border-b border-white/30" />
                        <div className="border-r border-b border-white/30" />
                        <div className="border-r border-b border-white/30" />
                        <div className="border-b border-white/30" />
                        <div className="border-r border-b border-white/30" />
                        <div className="border-r border-b border-white/30" />
                        <div />
                      </div>
                    )}

                    {/* Biometric Face Guide Overlay */}
                    {showFaceGuide && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <div className="w-[54%] h-[68%] border-2 border-dashed border-emerald-400/80 rounded-[50%_50%_45%_45%] mb-3 flex flex-col items-center justify-center">
                          <div className="w-full border-t border-emerald-400/50 relative top-[-10%]" />
                          <div className="w-2/3 border-b border-emerald-400/50 relative bottom-[-32%]" />
                        </div>
                        <span className="absolute bottom-1.5 text-[9px] bg-slate-900/85 text-emerald-300 px-2 py-0.5 rounded-full font-mono">
                          Face Oval Guide
                        </span>
                      </div>
                    )}

                    {/* Fresh Minimalist Clean 4 Corner Handles (No background rectangles) */}
                    {/* Top-Left (NW) */}
                    <div
                      onMouseDown={(e) => onDragStart(e, 'nw')}
                      onTouchStart={(e) => onDragStart(e, 'nw')}
                      className="absolute -top-1.5 -left-1.5 w-6 h-6 cursor-nwse-resize z-30"
                    >
                      <div className="w-4 h-4 border-t-2 border-l-2 border-white shadow-xs" />
                    </div>

                    {/* Top-Right (NE) */}
                    <div
                      onMouseDown={(e) => onDragStart(e, 'ne')}
                      onTouchStart={(e) => onDragStart(e, 'ne')}
                      className="absolute -top-1.5 -right-1.5 w-6 h-6 cursor-nesw-resize z-30 flex justify-end"
                    >
                      <div className="w-4 h-4 border-t-2 border-r-2 border-white shadow-xs" />
                    </div>

                    {/* Bottom-Left (SW) */}
                    <div
                      onMouseDown={(e) => onDragStart(e, 'sw')}
                      onTouchStart={(e) => onDragStart(e, 'sw')}
                      className="absolute -bottom-1.5 -left-1.5 w-6 h-6 cursor-nesw-resize z-30 flex items-end"
                    >
                      <div className="w-4 h-4 border-b-2 border-l-2 border-white shadow-xs" />
                    </div>

                    {/* Bottom-Right (SE) */}
                    <div
                      onMouseDown={(e) => onDragStart(e, 'se')}
                      onTouchStart={(e) => onDragStart(e, 'se')}
                      className="absolute -bottom-1.5 -right-1.5 w-6 h-6 cursor-nwse-resize z-30 flex items-end justify-end"
                    >
                      <div className="w-4 h-4 border-b-2 border-r-2 border-white shadow-xs" />
                    </div>

                    {/* 4 Clean Minimalist Edge Grab Handles */}
                    {/* Top Edge (N) */}
                    <div
                      onMouseDown={(e) => onDragStart(e, 'n')}
                      onTouchStart={(e) => onDragStart(e, 'n')}
                      className="absolute -top-2 left-1/2 -translate-x-1/2 w-10 h-4 cursor-ns-resize z-30 flex items-center justify-center"
                    >
                      <div className="w-6 h-0.5 bg-white/90 shadow-xs" />
                    </div>

                    {/* Bottom Edge (S) */}
                    <div
                      onMouseDown={(e) => onDragStart(e, 's')}
                      onTouchStart={(e) => onDragStart(e, 's')}
                      className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-10 h-4 cursor-ns-resize z-30 flex items-center justify-center"
                    >
                      <div className="w-6 h-0.5 bg-white/90 shadow-xs" />
                    </div>

                    {/* Left Edge (W) */}
                    <div
                      onMouseDown={(e) => onDragStart(e, 'w')}
                      onTouchStart={(e) => onDragStart(e, 'w')}
                      className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-10 cursor-ew-resize z-30 flex items-center justify-center"
                    >
                      <div className="w-0.5 h-6 bg-white/90 shadow-xs" />
                    </div>

                    {/* Right Edge (E) */}
                    <div
                      onMouseDown={(e) => onDragStart(e, 'e')}
                      onTouchStart={(e) => onDragStart(e, 'e')}
                      className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-10 cursor-ew-resize z-30 flex items-center justify-center"
                    >
                      <div className="w-0.5 h-6 bg-white/90 shadow-xs" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Canvas Controls Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800 text-slate-300 text-xs">
              {/* Rotate & Flip */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r - 90 + 360) % 360)}
                  className="px-2 py-1 bg-slate-900 hover:bg-slate-800 rounded text-slate-300 hover:text-white flex items-center gap-1 border border-slate-800 cursor-pointer"
                  title="Rotate Left 90°"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>-90°</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="px-2 py-1 bg-slate-900 hover:bg-slate-800 rounded text-slate-300 hover:text-white flex items-center gap-1 border border-slate-800 cursor-pointer"
                  title="Rotate Right 90°"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>+90°</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsFlipped((f) => !f)}
                  className={`px-2 py-1 rounded flex items-center gap-1 border cursor-pointer ${
                    isFlipped
                      ? 'bg-indigo-600 text-white border-indigo-500'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                  }`}
                  title="Flip Horizontal"
                >
                  <FlipHorizontal className="w-3.5 h-3.5" />
                  <span>Flip</span>
                </button>
                <button
                  type="button"
                  onClick={() => initCropRect(imgLayout.w, imgLayout.h, targetAspect, lockAspect)}
                  className="px-2 py-1 bg-slate-900 hover:bg-slate-800 rounded text-slate-300 hover:text-white border border-slate-800 cursor-pointer"
                  title="Reset Crop to Full Box"
                >
                  Reset
                </button>
              </div>

              {/* Guide Toggles & Lock */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setLockAspect((l) => !l)}
                  className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition cursor-pointer border ${
                    lockAspect
                      ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                  title={lockAspect ? 'Aspect ratio locked' : 'Freeform crop from any side'}
                >
                  {lockAspect ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                  <span>{lockAspect ? t('ratioLocked') : t('freeCrop')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowFaceGuide((v) => !v)}
                  className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition cursor-pointer border ${
                    showFaceGuide
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                  title="Toggle Passport Face Oval Guide"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>{t('faceGuide')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowGridGuide((v) => !v)}
                  className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition cursor-pointer border ${
                    showGridGuide
                      ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                  title="Toggle Grid Guide"
                >
                  <Grid className="w-3.5 h-3.5" />
                  <span>{t('gridGuide')}</span>
                </button>
              </div>
            </div>

            {/* Studio Lighting & Touchup Controls */}
            <div className="mt-2.5 p-2.5 bg-slate-900/95 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-bold text-slate-200">
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t('studioTouchup')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBrightness(15);
                      setContrast(10);
                    }}
                    className="px-2 py-0.5 rounded bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 text-[10px] font-semibold flex items-center gap-1 transition cursor-pointer"
                    title="Auto studio lighting enhance for mobile portraits"
                  >
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    <span>{t('autoEnhance')}</span>
                  </button>
                  {(brightness !== 0 || contrast !== 0) && (
                    <button
                      type="button"
                      onClick={() => {
                        setBrightness(0);
                        setContrast(0);
                      }}
                      className="text-[10px] text-slate-400 hover:text-slate-200 underline cursor-pointer"
                    >
                      {t('reset')}
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs text-slate-300">
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400">{t('brightness')}</span>
                    <span className="font-mono text-amber-400 font-bold">
                      {brightness > 0 ? `+${brightness}` : brightness}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-40"
                    max="40"
                    step="2"
                    value={brightness}
                    onChange={(e) => setBrightness(Number(e.target.value))}
                    className="w-full accent-amber-400 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400">{t('contrast')}</span>
                    <span className="font-mono text-indigo-400 font-bold">
                      {contrast > 0 ? `+${contrast}` : contrast}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-40"
                    max="40"
                    step="2"
                    value={contrast}
                    onChange={(e) => setContrast(Number(e.target.value))}
                    className="w-full accent-indigo-400 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Configuration Sidebar */}
          <div className="w-full lg:w-96 p-5 flex flex-col bg-white border-t lg:border-t-0 lg:border-l border-slate-200 overflow-y-auto">
            {/* Step 1: Select Dimension Category */}
            <div className="mb-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                {t('stepDimension')}
              </label>

              {/* Category Pills */}
              <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-lg mb-3">
                {(['passport', 'stamp', 'square', 'custom'] as DimensionType[]).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat);
                      if (cat !== 'custom') {
                        const firstMatch = BANGLADESH_PRESETS.find((p) => p.category === cat);
                        if (firstMatch) handleSelectPreset(firstMatch);
                      } else {
                        handleCustomChange(customWidth, customHeight, customUnit);
                      }
                    }}
                    className={`py-1.5 px-2 rounded-md text-xs font-semibold capitalize transition cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Presets List or Custom Dimension Controls */}
              {selectedCategory !== 'custom' ? (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {BANGLADESH_PRESETS.filter((p) => p.category === selectedCategory).map((preset) => {
                    const isSelected = selectedDimension.id === preset.id;
                    return (
                      <div
                        key={preset.id}
                        onClick={() => handleSelectPreset(preset)}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition flex items-center justify-between ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-slate-800 text-sm">{preset.name}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{preset.description}</div>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center text-white shrink-0 ml-2">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Custom Dimensions Form */
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">Custom Dimensions</span>
                    <div className="flex bg-slate-200 rounded-md p-0.5 text-xs font-medium">
                      {(['mm', 'cm', 'inch', 'px'] as DimensionUnit[]).map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => {
                            const newW = convertFromMm(selectedDimension.widthMm, u);
                            const newH = convertFromMm(selectedDimension.heightMm, u);
                            handleCustomChange(newW, newH, u);
                          }}
                          className={`px-2 py-0.5 rounded cursor-pointer ${
                            customUnit === u ? 'bg-white text-indigo-700 shadow-sm font-bold' : 'text-slate-600'
                          }`}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">
                        Width ({customUnit})
                      </label>
                      <input
                        type="number"
                        min="5"
                        step={customUnit === 'px' ? '1' : '0.1'}
                        value={customWidth}
                        onChange={(e) =>
                          handleCustomChange(parseFloat(e.target.value) || 1, customHeight, customUnit)
                        }
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">
                        Height ({customUnit})
                      </label>
                      <input
                        type="number"
                        min="5"
                        step={customUnit === 'px' ? '1' : '0.1'}
                        value={customHeight}
                        onChange={(e) =>
                          handleCustomChange(customWidth, parseFloat(e.target.value) || 1, customUnit)
                        }
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 font-mono">
                    Converted: {selectedDimension.widthMm.toFixed(1)} mm × {selectedDimension.heightMm.toFixed(1)} mm
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Number of Copies */}
            <div className="mb-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                {t('stepCopies')}
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCopies((c) => Math.max(1, c - 1))}
                  className="w-9 h-9 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-lg transition cursor-pointer"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={copies}
                  onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                  className="flex-1 text-center py-2 px-3 border border-slate-300 rounded-lg font-bold text-slate-800 text-base focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setCopies((c) => c + 1)}
                  className="w-9 h-9 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-lg transition cursor-pointer"
                >
                  +
                </button>
              </div>

              {/* Quick Fill Preset Buttons */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className="text-[11px] text-slate-400 self-center mr-1">Quick:</span>
                {Array.from(new Set([1, 4, 8, 12, copiesPerA4.total, 28, 50]))
                  .sort((a, b) => a - b)
                  .map((num) => {
                    const isCurrent = copies === num;
                    return (
                      <button
                        key={`preset-${num}`}
                        type="button"
                        onClick={() => setCopies(num)}
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition cursor-pointer ${
                          isCurrent
                            ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {num === copiesPerA4.total ? `${num} (1 Full A4)` : num}
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* A4 Sheet Utilization Estimate Badge */}
            <div className="mt-auto p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs text-indigo-900 mb-4">
              <div className="font-semibold flex items-center justify-between">
                <span>A4 Sheet Capacity</span>
                <span className="font-mono bg-white px-2 py-0.5 rounded border border-indigo-200 text-indigo-700">
                  {copiesPerA4.total} per sheet
                </span>
              </div>
              <p className="mt-1 text-[11px] text-indigo-700 leading-relaxed">
                {copies} {t('copies')} will take approximately{' '}
                <strong className="font-bold">
                  {Math.ceil(copies / copiesPerA4.total)} A4 sheet
                  {Math.ceil(copies / copiesPerA4.total) > 1 ? 's' : ''}
                </strong>{' '}
                ({copiesPerA4.columns} cols × {copiesPerA4.rows} rows layout).
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="w-1/3 py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 transition text-sm cursor-pointer"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="w-2/3 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-600/20 transition flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>{t('applyCrop')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
