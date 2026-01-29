import { useState, useEffect, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, ZoomIn, ZoomOut, RotateCw, Loader2, ChevronLeft, ChevronRight, CloudOff, Cloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useImageGalleryCache } from '@/hooks/useImageCache';

export interface GalleryImage {
  src: string;
  alt: string;
}

interface ImageLightboxProps {
  /** Single image source (legacy support) */
  src?: string;
  /** Single image alt (legacy support) */
  alt?: string;
  /** Array of images for gallery mode */
  images?: GalleryImage[];
  /** Initial image index in gallery mode */
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  onDownload?: (src: string) => void;
  downloadLoading?: boolean;
}

/**
 * Mobile-friendly fullscreen image lightbox with gallery support
 * - Uses portal to render at document root
 * - Touch-friendly with pinch-to-zoom support
 * - Swipe left/right to navigate between images
 * - Swipe down to close
 * - Proper handling for iOS Safari
 */
export const ImageLightbox = memo(({
  src,
  alt,
  images,
  initialIndex = 0,
  isOpen,
  onClose,
  onDownload,
  downloadLoading = false,
}: ImageLightboxProps) => {
  // Convert single image to gallery format
  const gallery: GalleryImage[] = images || (src ? [{ src, alt: alt || '' }] : []);
  
  // Image caching for offline viewing
  const galleryUrls = gallery.map(img => img.src).filter(Boolean);
  const { 
    cachedCount, 
    totalCount, 
    isPreloading, 
    preloadAll, 
    getCachedUrl 
  } = useImageGalleryCache(galleryUrls);
  
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  
  // Touch state for gestures
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragDirection, setDragDirection] = useState<'horizontal' | 'vertical' | null>(null);

  const currentImage = gallery[currentIndex];
  const hasMultipleImages = gallery.length > 1;
  const allCached = cachedCount === totalCount && totalCount > 0;

  // Reset state when opening or changing image
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setIsLoaded(false);
      setHasError(false);
      setScale(1);
      setRotation(0);
      setTranslateX(0);
      setTranslateY(0);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, initialIndex]);

  // Reset loading state when changing images
  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
    setScale(1);
    setRotation(0);
  }, [currentIndex]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          if (hasMultipleImages && currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
          }
          break;
        case 'ArrowRight':
          if (hasMultipleImages && currentIndex < gallery.length - 1) {
            setCurrentIndex(prev => prev + 1);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, hasMultipleImages, currentIndex, gallery.length]);

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  const goToNext = useCallback(() => {
    if (currentIndex < gallery.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, gallery.length]);

  const handleZoomIn = useCallback(() => {
    setScale(prev => Math.min(prev + 0.5, 4));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale(prev => Math.max(prev - 0.5, 0.5));
  }, []);

  const handleRotate = useCallback(() => {
    setRotation(prev => (prev + 90) % 360);
  }, []);

  const handleDownloadCurrent = useCallback(() => {
    if (onDownload && currentImage) {
      onDownload(currentImage.src);
    }
  }, [onDownload, currentImage]);

  // Touch handlers for swipe gestures
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (scale !== 1) return; // Disable swipe when zoomed
    
    setTouchStart({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    });
    setIsDragging(true);
    setDragDirection(null);
  }, [scale]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStart || !isDragging || scale !== 1) return;
    
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - touchStart.x;
    const diffY = currentY - touchStart.y;

    // Determine drag direction on first significant movement
    if (!dragDirection) {
      if (Math.abs(diffX) > 10 || Math.abs(diffY) > 10) {
        setDragDirection(Math.abs(diffX) > Math.abs(diffY) ? 'horizontal' : 'vertical');
      }
      return;
    }

    if (dragDirection === 'horizontal' && hasMultipleImages) {
      // Horizontal swipe for gallery navigation
      setTranslateX(diffX);
    } else if (dragDirection === 'vertical' && diffY > 0) {
      // Vertical swipe down to close
      setTranslateY(diffY);
    }
  }, [touchStart, isDragging, scale, dragDirection, hasMultipleImages]);

  const handleTouchEnd = useCallback(() => {
    const threshold = 80;

    if (dragDirection === 'horizontal' && hasMultipleImages) {
      if (translateX > threshold && currentIndex > 0) {
        goToPrevious();
      } else if (translateX < -threshold && currentIndex < gallery.length - 1) {
        goToNext();
      }
    } else if (dragDirection === 'vertical' && translateY > 100) {
      onClose();
    }

    setTouchStart(null);
    setTranslateX(0);
    setTranslateY(0);
    setIsDragging(false);
    setDragDirection(null);
  }, [dragDirection, translateX, translateY, hasMultipleImages, currentIndex, gallery.length, goToPrevious, goToNext, onClose]);

  // Handle backdrop click
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  const handleImageLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);

  const handleImageError = useCallback(() => {
    setHasError(true);
    setIsLoaded(true);
  }, []);

  // Double tap to zoom
  const [lastTap, setLastTap] = useState(0);
  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTap < 300) {
      setScale(prev => prev === 1 ? 2 : 1);
    }
    setLastTap(now);
  }, [lastTap]);

  if (!isOpen || gallery.length === 0) return null;

  const opacity = Math.max(0, 1 - translateY / 200);
  const originalSrc = currentImage?.src?.replace(/^http:\/\//i, 'https://') || '';
  // Use cached URL if available
  const normalizedSrc = getCachedUrl(originalSrc) || originalSrc;

  const lightboxContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ backgroundColor: `rgba(0, 0, 0, ${opacity * 0.95})` }}
      onClick={handleBackdropClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top toolbar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-3 bg-gradient-to-b from-black/50 to-transparent">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-white hover:bg-white/20"
            onClick={handleZoomOut}
            disabled={scale <= 0.5}
          >
            <ZoomOut className="h-5 w-5" />
          </Button>
          <span className="text-white text-sm font-medium min-w-[3rem] text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-white hover:bg-white/20"
            onClick={handleZoomIn}
            disabled={scale >= 4}
          >
            <ZoomIn className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-white hover:bg-white/20"
            onClick={handleRotate}
          >
            <RotateCw className="h-5 w-5" />
          </Button>
        </div>

        {/* Image counter */}
        {hasMultipleImages && (
          <div className="absolute left-1/2 -translate-x-1/2 text-white text-sm font-medium bg-black/30 px-3 py-1 rounded-full">
            {currentIndex + 1} / {gallery.length}
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* Cache button */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-10 w-10 text-white hover:bg-white/20 relative",
              allCached && "text-green-400"
            )}
            onClick={preloadAll}
            disabled={isPreloading || allCached}
            title={allCached ? "Все изображения сохранены" : "Сохранить для офлайн"}
          >
            {isPreloading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : allCached ? (
              <Cloud className="h-5 w-5" />
            ) : (
              <CloudOff className="h-5 w-5" />
            )}
            {totalCount > 1 && !allCached && (
              <span className="absolute -bottom-1 -right-1 text-[10px] bg-white/20 rounded-full px-1">
                {cachedCount}/{totalCount}
              </span>
            )}
          </Button>
          
          {onDownload && (
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 text-white hover:bg-white/20"
              onClick={handleDownloadCurrent}
              disabled={downloadLoading}
            >
              {downloadLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Download className="h-5 w-5" />
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-white hover:bg-white/20"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Navigation arrows (desktop & tablet) */}
      {hasMultipleImages && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "absolute left-2 top-1/2 -translate-y-1/2 z-10 h-12 w-12 text-white hover:bg-white/20 transition-opacity",
              "hidden sm:flex",
              currentIndex === 0 && "opacity-30 cursor-not-allowed"
            )}
            onClick={goToPrevious}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="h-8 w-8" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2 z-10 h-12 w-12 text-white hover:bg-white/20 transition-opacity",
              "hidden sm:flex",
              currentIndex === gallery.length - 1 && "opacity-30 cursor-not-allowed"
            )}
            onClick={goToNext}
            disabled={currentIndex === gallery.length - 1}
          >
            <ChevronRight className="h-8 w-8" />
          </Button>
        </>
      )}

      {/* Image container */}
      <div
        className={cn(
          "relative max-w-full max-h-full flex items-center justify-center p-4",
          isDragging ? "transition-none" : "transition-transform duration-200"
        )}
        style={{
          transform: `translateX(${translateX}px) translateY(${translateY}px) scale(${scale}) rotate(${rotation}deg)`,
        }}
        onClick={handleDoubleTap}
      >
        {/* Loading spinner */}
        {!isLoaded && !hasError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-10 w-10 text-white animate-spin" />
          </div>
        )}

        {/* Error state */}
        {hasError && (
          <div className="text-white text-center p-4">
            <p className="text-lg mb-2">Не удалось загрузить изображение</p>
            <p className="text-sm text-white/70">{currentImage?.alt}</p>
          </div>
        )}

        {/* Image */}
        <img
          src={normalizedSrc}
          alt={currentImage?.alt || ''}
          className={cn(
            "max-w-full max-h-[calc(100vh-8rem)] object-contain select-none",
            "touch-manipulation",
            isLoaded ? "opacity-100" : "opacity-0"
          )}
          style={{
            transition: isDragging ? 'none' : 'opacity 0.3s ease-in-out',
          }}
          onLoad={handleImageLoad}
          onError={handleImageError}
          draggable={false}
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
      </div>

      {/* Thumbnail strip for gallery */}
      {hasMultipleImages && (
        <div className="absolute bottom-16 left-0 right-0 flex justify-center gap-2 px-4 overflow-x-auto">
          {gallery.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={cn(
                "w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all",
                idx === currentIndex 
                  ? "border-white opacity-100 scale-110" 
                  : "border-transparent opacity-50 hover:opacity-75"
              )}
            >
              <img
                src={img.src?.replace(/^http:\/\//i, 'https://') || ''}
                alt={img.alt}
                className="w-full h-full object-cover"
                crossOrigin="anonymous"
                referrerPolicy="no-referrer"
              />
            </button>
          ))}
        </div>
      )}

      {/* Swipe hints for mobile */}
      <div className="absolute bottom-4 left-0 right-0 text-center text-white/50 text-xs pointer-events-none">
        {hasMultipleImages 
          ? "Свайп влево/вправо — листать • Вниз — закрыть"
          : "Проведите вниз чтобы закрыть"
        }
      </div>
    </div>
  );

  return createPortal(lightboxContent, document.body);
});

ImageLightbox.displayName = 'ImageLightbox';
