import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  Upload,
  Sparkles,
  Layers,
  Plus,
  RefreshCw,
  Info,
  Printer,
  Sliders,
  Languages,
  Smartphone,
} from 'lucide-react';
import type { PhotoItem, PhotoDimension, SheetLayout, LayoutConfig, CropSettings, PhotoOrientation } from './types';
import {
  BANGLADESH_PRESETS,
  DEFAULT_DIMENSION,
} from './constants/dimensions';
import { packPhotosToSheets, DEFAULT_LAYOUT_CONFIG } from './utils/packingEngine';
import { PhotoCard } from './components/PhotoCard';
import { CropModal } from './components/CropModal';
import { SheetPreview } from './components/SheetPreview';
import { PrintContainer } from './components/PrintContainer';
import { ImageConverter } from './components/ImageConverter';
import { generateSamplePortrait } from './utils/sampleGenerator';
import { useLanguage } from './i18n/LanguageContext';

export const App: React.FC = () => {
  const { lang, toggleLang, t } = useLanguage();
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [sheets, setSheets] = useState<SheetLayout[]>([]);
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig>(DEFAULT_LAYOUT_CONFIG);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'print-sheet' | 'converter'>('print-sheet');

  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isAppInstalled, setIsAppInstalled] = useState<boolean>(false);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsAppInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert(
        lang === 'bn'
          ? 'ChobiPrint অফলাইনে চালানোর জন্য ব্রাউজারের অ্যাড্রেস বার থেকে "Install" আইকন চাপুন অথবা মেনু থেকে "Add to Home Screen / Install ChobiPrint" সিলেক্ট করুন।'
          : 'To install ChobiPrint for offline use, click the Install icon in your browser address bar or select "Install ChobiPrint" from the menu.'
      );
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsAppInstalled(true);
      setDeferredPrompt(null);
    }
  };

  // Active crop modal state
  const [activeCropPhoto, setActiveCropPhoto] = useState<PhotoItem | null>(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Transfer converted photo directly into the Passport Print Sheet queue
  const handleSendToPrintSheet = (imageUrl: string, fileName: string) => {
    const newPhoto: PhotoItem = {
      id: `photo-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      fileName,
      fileSize: 0,
      originalUrl: imageUrl,
      croppedUrl: imageUrl,
      dimension: DEFAULT_DIMENSION,
      orientation: 'horizontal',
      copies: 28,
      aspectRatio: DEFAULT_DIMENSION.widthMm / DEFAULT_DIMENSION.heightMm,
    };
    setPhotos((prev) => {
      const updated = [...prev, newPhoto];
      handleProcessPhotos(updated);
      return updated;
    });
    setActiveTab('print-sheet');
  };

  // Auto-pack on initial demo load or when user explicitly clicks Process
  const handleProcessPhotos = (currentPhotos: PhotoItem[] = photos) => {
    if (currentPhotos.length === 0) {
      setSheets([]);
      return;
    }
    setIsProcessing(true);
    setTimeout(() => {
      const generatedSheets = packPhotosToSheets(currentPhotos, layoutConfig);
      setSheets(generatedSheets);
      setIsProcessing(false);
    }, 200);
  };

  // When layoutConfig changes and we already have sheets, update packing
  const handleUpdateConfig = (newConfig: LayoutConfig) => {
    setLayoutConfig(newConfig);
    if (photos.length > 0) {
      const generated = packPhotosToSheets(photos, newConfig);
      setSheets(generated);
    }
  };

  // Upload handler for single or multiple files
  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file, index) => {
      if (!file.type.startsWith('image/')) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const url = e.target?.result as string;
        const newPhoto: PhotoItem = {
          id: `photo-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 6)}`,
          fileName: file.name,
          fileSize: file.size,
          originalUrl: url,
          croppedUrl: url,
          dimension: DEFAULT_DIMENSION, // Default: Passport (40x50 mm)
          orientation: 'horizontal', // Default passport photos set horizontally
          copies: 28, // Default standard 28 copies
          aspectRatio: DEFAULT_DIMENSION.widthMm / DEFAULT_DIMENSION.heightMm,
        };

        setPhotos((prev) => {
          const updated = [...prev, newPhoto];
          // Always open crop modal immediately on upload so user can crop according to dimension
          setActiveCropPhoto(newPhoto);
          setIsCropModalOpen(true);
          return updated;
        });
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Load Sample Demo Data (e.g. 1 Passport photo with 28 copies + 1 Stamp photo with 12 copies)
  const handleLoadDemo = () => {
    const demo1 = generateSamplePortrait('Applicant A (Passport)', ['#e0f2fe', '#bae6fd']);
    const demo2 = generateSamplePortrait('Applicant B (Stamp)', ['#fef3c7', '#fde68a']);

    const samplePhotos: PhotoItem[] = [
      {
        id: `demo-1-${Date.now()}`,
        fileName: 'passport_photo_bd.jpg',
        fileSize: 420000,
        originalUrl: demo1,
        croppedUrl: demo1,
        dimension: BANGLADESH_PRESETS[0], // Studio Passport 40x50mm
        orientation: 'horizontal', // Set horizontally: 4 columns x 7 rows = 28 copies on 1 A4 sheet!
        copies: 28, // 28 copies fits 1 sheet
        aspectRatio: 40 / 50,
      },
      {
        id: `demo-2-${Date.now()}`,
        fileName: 'stamp_photo_bd.jpg',
        fileSize: 280000,
        originalUrl: demo2,
        croppedUrl: demo2,
        dimension: BANGLADESH_PRESETS[3], // Stamp size 20x25mm
        orientation: 'vertical',
        copies: 16,
        aspectRatio: 20 / 25,
      },
    ];

    setPhotos(samplePhotos);
    handleProcessPhotos(samplePhotos);
  };

  // Clear all
  const handleClearAll = () => {
    setPhotos([]);
    setSheets([]);
  };

  // Photo queue operations
  const handleUpdateCopies = (id: string, copies: number) => {
    setPhotos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, copies: Math.max(1, copies) } : p))
    );
  };

  const handleUpdateOrientation = (id: string, orientation: PhotoOrientation) => {
    setPhotos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, orientation } : p))
    );
  };

  const handleChangeDimension = (id: string, dimension: PhotoDimension) => {
    setPhotos((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              dimension,
              aspectRatio: dimension.widthMm / dimension.heightMm,
            }
          : p
      )
    );
  };

  const handleDuplicatePhoto = (photo: PhotoItem) => {
    const copyItem: PhotoItem = {
      ...photo,
      id: `copy-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      fileName: `${photo.fileName.replace(/\.[^/.]+$/, '')}_copy`,
    };
    setPhotos((prev) => [...prev, copyItem]);
  };

  const handleDeletePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  // Open Crop Modal
  const handleOpenCrop = (photo: PhotoItem) => {
    setActiveCropPhoto(photo);
    setIsCropModalOpen(true);
  };

  // Confirm Crop from Modal
  const handleConfirmCrop = (
    croppedUrl: string,
    dimension: PhotoDimension,
    copies: number,
    settings: CropSettings
  ) => {
    if (!activeCropPhoto) return;

    const updatedPhoto: PhotoItem = {
      ...activeCropPhoto,
      croppedUrl,
      dimension,
      copies,
      cropSettings: settings,
      aspectRatio: dimension.widthMm / dimension.heightMm,
      orientation:
        dimension.category === 'passport'
          ? 'horizontal'
          : activeCropPhoto.orientation ?? 'auto',
    };

    const newPhotos = photos.map((p) =>
      p.id === activeCropPhoto.id ? updatedPhoto : p
    );

    setPhotos(newPhotos);
    setIsCropModalOpen(false);
    setActiveCropPhoto(null);

    // Immediately arrange onto A4 paper ready for print!
    handleProcessPhotos(newPhotos);
  };

  // Total summary statistics
  const totalCopies = useMemo(
    () => photos.reduce((sum, p) => sum + (p.copies || 0), 0),
    [photos]
  );

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-800">
      {/* Top Navbar */}
      <header className="no-print bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Subtitle */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-slate-900 text-lg tracking-tight">
                  {t('appName')}
                </h1>
                <span className="hidden sm:inline px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  300 DPI A4
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {t('tagline')}
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <nav className="hidden md:flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('print-sheet')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === 'print-sheet'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t('tabPassport')}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('converter')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === 'converter'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{t('tabConverter')}</span>
            </button>
          </nav>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2">
            {/* Language Switcher */}
            <button
              type="button"
              onClick={toggleLang}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-indigo-50 hover:border-indigo-200 text-slate-700 hover:text-indigo-700 text-xs font-bold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
              title="Switch Language / ভাষা পরিবর্তন করুন"
            >
              <Languages className="w-3.5 h-3.5 text-indigo-600" />
              <span>{lang === 'bn' ? 'English' : 'বাংলা'}</span>
            </button>

            {/* PWA Install Button */}
            <button
              type="button"
              onClick={handleInstallClick}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
              title={t('installApp')}
            >
              <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">{isAppInstalled ? t('appInstalled') : t('installApp')}</span>
            </button>

            {activeTab === 'print-sheet' && (
              <>
                <button
                  type="button"
                  onClick={handleLoadDemo}
                  className="px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  title="Load sample photos to test instantly"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t('loadDemo')}</span>
                </button>

                {photos.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-medium transition cursor-pointer"
                  >
                    {t('clearAll')}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Tab Switcher */}
      <div className="md:hidden no-print bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('print-sheet')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
            activeTab === 'print-sheet'
              ? 'bg-indigo-50 border border-indigo-200 text-indigo-700'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Printer className="w-3.5 h-3.5" />
          <span>{t('tabPassport')}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('converter')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
            activeTab === 'converter'
              ? 'bg-indigo-50 border border-indigo-200 text-indigo-700'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>{t('tabConverter')}</span>
        </button>
      </div>

      {/* Main App Workspace */}
      <main className="no-print flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'converter' ? (
          <ImageConverter onSendToPrintSheet={handleSendToPrintSheet} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Photo Upload, Queue & Processing Controls (lg:col-span-6) */}
          <div className="lg:col-span-6 space-y-5">
            {/* Upload Drop Zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFileUpload(e.dataTransfer.files);
              }}
              className="group border-2 border-dashed border-indigo-200 hover:border-indigo-500 bg-white hover:bg-indigo-50/30 rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center shadow-xs"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-full bg-indigo-50 group-hover:bg-indigo-100 text-indigo-600 flex items-center justify-center mb-3 transition">
                <Upload className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm mb-1">
                {t('uploadTitle')}
              </h3>
              <p className="text-xs text-slate-500 max-w-xs">
                {t('uploadSubtitle')}
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-1.5 text-[11px] font-mono text-slate-600">
                <span className="bg-slate-100 px-2 py-0.5 rounded">Passport (40×50 mm)</span>
                <span className="bg-slate-100 px-2 py-0.5 rounded">Stamp (20×25 mm)</span>
                <span className="bg-slate-100 px-2 py-0.5 rounded">Square 2×2"</span>
              </div>
            </div>

            {/* Photo Queue List */}
            {photos.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-800">{t('queueTitle')}</h2>
                    <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded-full text-xs font-mono font-semibold">
                      {photos.length}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t('addMore')}</span>
                  </button>
                </div>

                {/* Queue Cards */}
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {photos.map((photo, idx) => (
                    <PhotoCard
                      key={photo.id}
                      photo={photo}
                      index={idx}
                      config={layoutConfig}
                      onEditCrop={handleOpenCrop}
                      onUpdateCopies={handleUpdateCopies}
                      onChangeDimension={handleChangeDimension}
                      onUpdateOrientation={handleUpdateOrientation}
                      onDuplicate={handleDuplicatePhoto}
                      onDelete={handleDeletePhoto}
                    />
                  ))}
                </div>

                {/* Process Bar & Summary Box */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between text-xs text-slate-600 pb-3 border-b border-slate-100">
                    <div>
                      <span className="text-slate-400">Total Photos:</span>{' '}
                      <strong className="text-slate-800 font-bold">{photos.length}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Total Copies:</span>{' '}
                      <strong className="text-slate-800 font-bold">{totalCopies}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Paper:</span>{' '}
                      <strong className="text-slate-800 font-bold">A4 (210×297 mm)</strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleProcessPhotos()}
                    disabled={isProcessing}
                    className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-extrabold text-sm shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>{t('arranging')}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        <span>{t('processBtn')} ({totalCopies} {t('copies')})</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Studio Guidelines / Standard Dimensions Reference Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-xs text-slate-600 space-y-2">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-indigo-600" />
                {t('guideTitle')}
              </div>
              <ul className="space-y-1.5 text-slate-500 pl-5 list-disc">
                <li>
                  <strong className="text-slate-700">Passport Studio (40 × 50 mm):</strong> Standard size used by photo studios across BD for jobs, university forms, admit cards. Fits 20 to 28 copies per A4 sheet.
                </li>
                <li>
                  <strong className="text-slate-700">Stamp Size (20 × 25 mm):</strong> Admit cards, student IDs, registration papers. Fits up to 80 copies per A4 sheet!
                </li>
                <li>
                  <strong className="text-slate-700">Square 2 × 2" (50.8 × 50.8 mm):</strong> Standard US visa, international passports, and square portraits. Fits 15 copies per A4 sheet.
                </li>
              </ul>
            </div>
          </div>

          {/* Right Column: Live A4 Sheet Preview & Export Tools (lg:col-span-6) */}
          <div className="lg:col-span-6 sticky top-20">
            <SheetPreview
              sheets={sheets}
              config={layoutConfig}
              onUpdateConfig={handleUpdateConfig}
              isProcessing={isProcessing}
            />
          </div>
        </div>
        )}
      </main>

      {/* Interactive Crop & Resize Overlay Modal */}
      {activeCropPhoto && (
        <CropModal
          isOpen={isCropModalOpen}
          onClose={() => {
            setIsCropModalOpen(false);
            setActiveCropPhoto(null);
          }}
          imageUrl={activeCropPhoto.originalUrl}
          fileName={activeCropPhoto.fileName}
          initialDimension={activeCropPhoto.dimension}
          initialCopies={activeCropPhoto.copies}
          initialCropSettings={activeCropPhoto.cropSettings}
          onConfirm={handleConfirmCrop}
        />
      )}

      {/* Hidden Print Container (Only renders during @media print) */}
      <PrintContainer sheets={sheets} config={layoutConfig} />
    </div>
  );
};

export default App;
