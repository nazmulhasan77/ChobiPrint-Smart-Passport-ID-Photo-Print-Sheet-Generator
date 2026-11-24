import React from 'react';
import type { SheetLayout, LayoutConfig } from '../types';
import { A4_WIDTH_MM, A4_HEIGHT_MM } from '../constants/dimensions';

interface PrintContainerProps {
  sheets: SheetLayout[];
  config: LayoutConfig;
}

export const PrintContainer: React.FC<PrintContainerProps> = ({ sheets, config }) => {
  if (!sheets || sheets.length === 0) return null;

  return (
    <div className="hidden print:block">
      {sheets.map((sheet, sheetIdx) => (
        <div
          key={`print-page-${sheetIdx}`}
          className="a4-print-page relative bg-white"
          style={{
            width: '210mm',
            height: '297mm',
            pageBreakAfter: sheetIdx < sheets.length - 1 ? 'always' : 'avoid',
            breakAfter: sheetIdx < sheets.length - 1 ? 'page' : 'avoid',
          }}
        >
          {sheet.photos.map((item, pIdx) => {
            const widthPct = (item.widthMm / A4_WIDTH_MM) * 100;
            const heightPct = (item.heightMm / A4_HEIGHT_MM) * 100;
            const leftPct = Math.min(100 - widthPct, Math.max(0, (item.xMm / A4_WIDTH_MM) * 100));
            const topPct = Math.min(100 - heightPct, Math.max(0, (item.yMm / A4_HEIGHT_MM) * 100));

            return (
              <div
                key={`print-item-${sheetIdx}-${pIdx}`}
                className="absolute overflow-hidden"
                style={{
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                  width: `${widthPct}%`,
                  height: `${heightPct}%`,
                }}
              >
                {item.isRotated ? (
                  <div className="w-full h-full flex items-center justify-center overflow-hidden">
                    <img
                      src={item.croppedUrl}
                      alt="Print copy"
                      className="block object-cover"
                      style={{
                        width: `${(item.heightMm / item.widthMm) * 100}%`,
                        height: `${(item.widthMm / item.heightMm) * 100}%`,
                        transform: 'rotate(90deg)',
                        outline: config.showCutLines ? '0.5pt solid #d1d5db' : 'none',
                      }}
                    />
                  </div>
                ) : (
                  <img
                    src={item.croppedUrl}
                    alt="Print copy"
                    className="w-full h-full object-cover block"
                    style={{
                      outline: config.showCutLines ? '0.5pt solid #d1d5db' : 'none',
                    }}
                  />
                )}

                {config.showCornerMarks && (
                  <>
                    <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-slate-400 pointer-events-none" />
                    <div className="absolute top-0 right-0 w-1.5 h-1.5 border-t border-r border-slate-400 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-1.5 h-1.5 border-b border-l border-slate-400 pointer-events-none" />
                    <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-slate-400 pointer-events-none" />
                  </>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};
