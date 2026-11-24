import React from 'react';
import {
  Crop,
  Copy,
  Trash2,
  ChevronDown,
} from 'lucide-react';
import type { PhotoItem, PhotoDimension, PhotoOrientation, LayoutConfig } from '../types';
import { BANGLADESH_PRESETS } from '../constants/dimensions';
import { estimateCopiesPerSheet } from '../utils/packingEngine';

interface PhotoCardProps {
  photo: PhotoItem;
  index: number;
  config?: LayoutConfig;
  onEditCrop: (photo: PhotoItem) => void;
  onUpdateCopies: (id: string, copies: number) => void;
  onChangeDimension: (id: string, dimension: PhotoDimension) => void;
  onUpdateOrientation: (id: string, orientation: PhotoOrientation) => void;
  onDuplicate: (photo: PhotoItem) => void;
  onDelete: (id: string) => void;
}

export const PhotoCard: React.FC<PhotoCardProps> = ({
  photo,
  index,
  config,
  onEditCrop,
  onUpdateCopies,
  onChangeDimension,
  onUpdateOrientation,
  onDuplicate,
  onDelete,
}) => {
  const currentOrientation: PhotoOrientation =
    photo.orientation ??
    (photo.dimension.category === 'passport' ? 'horizontal' : 'vertical');

  const capacity = estimateCopiesPerSheet(
    { dimension: photo.dimension, orientation: currentOrientation },
    config
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 relative group">
      {/* Thumbnail with aspect ratio container */}
      <div className="relative shrink-0 w-20 h-24 sm:w-24 sm:h-28 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center">
        {currentOrientation === 'horizontal' ? (
          <div className="w-full h-full flex items-center justify-center overflow-hidden">
            <img
              src={photo.croppedUrl || photo.originalUrl}
              alt={photo.fileName}
              className="max-w-none block object-cover"
              style={{
                width: '125%',
                height: '80%',
                transform: 'rotate(90deg)',
              }}
            />
          </div>
        ) : (
          <img
            src={photo.croppedUrl || photo.originalUrl}
            alt={photo.fileName}
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
          <button
            type="button"
            onClick={() => onEditCrop(photo)}
            className="p-1.5 bg-white text-slate-800 rounded-full shadow hover:bg-slate-100 transition cursor-pointer"
            title="Crop / Resize"
          >
            <Crop className="w-4 h-4" />
          </button>
        </div>
        <span className="absolute bottom-1 right-1 bg-slate-900/80 text-white text-[9px] font-mono px-1 rounded">
          #{index + 1}
        </span>
      </div>

      {/* Details & Controls */}
      <div className="flex-1 w-full space-y-2">
        {/* Top: File name & Dimension selector */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="font-bold text-slate-800 text-sm truncate max-w-[200px] sm:max-w-[260px]">
              {photo.fileName}
            </h4>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] font-mono text-slate-500">
                {currentOrientation === 'horizontal'
                  ? `${Math.max(photo.dimension.widthMm, photo.dimension.heightMm)} × ${Math.min(
                      photo.dimension.widthMm,
                      photo.dimension.heightMm
                    )} mm (Horizontal)`
                  : `${photo.dimension.widthMm} × ${photo.dimension.heightMm} mm`}
              </span>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium capitalize">
                {photo.dimension.category}
              </span>
            </div>
          </div>

          {/* Dimension quick dropdown & Orientation Toggle */}
          <div className="flex items-center gap-2">
            {/* Orientation Toggle Button */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-[11px] font-medium border border-slate-200">
              <button
                type="button"
                onClick={() => onUpdateOrientation(photo.id, 'horizontal')}
                className={`px-2 py-0.5 rounded transition cursor-pointer ${
                  currentOrientation === 'horizontal'
                    ? 'bg-white text-indigo-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Set Horizontally (Landscape)"
              >
                ⬌ Horizontal
              </button>
              <button
                type="button"
                onClick={() => onUpdateOrientation(photo.id, 'vertical')}
                className={`px-2 py-0.5 rounded transition cursor-pointer ${
                  currentOrientation === 'vertical'
                    ? 'bg-white text-indigo-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Set Vertically (Portrait)"
              >
                ⬍ Vertical
              </button>
            </div>

            {/* Dimension Select */}
            <div className="relative">
              <select
                value={photo.dimension.id}
                onChange={(e) => {
                  const found = BANGLADESH_PRESETS.find((p) => p.id === e.target.value);
                  if (found) {
                    onChangeDimension(photo.id, found);
                  }
                }}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg py-1.5 pl-2.5 pr-7 font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer appearance-none"
              >
                <optgroup label="Passport Dimensions">
                  {BANGLADESH_PRESETS.filter((p) => p.category === 'passport').map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Stamp Dimensions">
                  {BANGLADESH_PRESETS.filter((p) => p.category === 'stamp').map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Square Dimensions">
                  {BANGLADESH_PRESETS.filter((p) => p.category === 'square').map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
                {photo.dimension.category === 'custom' && (
                  <option value={photo.dimension.id}>{photo.dimension.name}</option>
                )}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Copies Counter & Quick Presets */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Copies:</span>
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => onUpdateCopies(photo.id, Math.max(1, photo.copies - 1))}
                className="w-7 h-7 rounded-l-md border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-sm flex items-center justify-center transition cursor-pointer"
              >
                -
              </button>
              <input
                type="number"
                min="1"
                max="500"
                value={photo.copies}
                onChange={(e) => onUpdateCopies(photo.id, Math.max(1, parseInt(e.target.value) || 1))}
                className="w-12 h-7 text-center border-t border-b border-slate-300 font-bold text-xs text-slate-800 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => onUpdateCopies(photo.id, photo.copies + 1)}
                className="w-7 h-7 rounded-r-md border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-sm flex items-center justify-center transition cursor-pointer"
              >
                +
              </button>
            </div>

            {/* Quick buttons */}
            <div className="hidden sm:flex items-center gap-1 ml-1">
              {[4, 8, capacity.total].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => onUpdateCopies(photo.id, n)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
                    photo.copies === n
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  title={n === capacity.total ? 'Fill 1 Full A4 Sheet' : undefined}
                >
                  {n === capacity.total ? `${n} (Full Sheet)` : n}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons: Crop, Duplicate, Delete */}
          <div className="flex items-center gap-1.5 ml-auto">
            <button
              type="button"
              onClick={() => onEditCrop(photo)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-indigo-300 bg-white hover:bg-indigo-50/50 text-indigo-600 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
              title="Crop & Resize Modal"
            >
              <Crop className="w-3.5 h-3.5" />
              <span>Crop</span>
            </button>
            <button
              type="button"
              onClick={() => onDuplicate(photo)}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition cursor-pointer"
              title="Duplicate Photo"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(photo.id)}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 hover:border-rose-200 text-slate-400 hover:text-rose-600 transition cursor-pointer"
              title="Remove Photo"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
