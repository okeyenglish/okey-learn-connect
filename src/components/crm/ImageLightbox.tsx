import { useState, useEffect, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, ZoomIn, ZoomOut, RotateCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ImageLightboxProps {
  src: string;
  alt: string;
  isOpen: boolean;
  onClose: () => void;
  onDownload?: () => void;
  downloadLoading?: boolean;
}

/**
 * Mobile-friendly fullscreen image lightbox
 * - Uses portal to render at document root
 * - Touch-friendly with pinch-to-zoom support
 * - Swipe down to close
 * - Proper handling for iOS Safari
 */
export const ImageLightbox = memo(({
  src,
  alt,
  isOpen,
  onClose,
  onDownload,
  downloadLoading = false,
}: ImageLightboxProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [startY, setStartY] = useState<number | null>(null);
  const [translateY, setTranslateY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setIsLoaded(false);
      setHasError(false);
      setScale(1);
      setRotation(0);
      setTranslateY(0);
      // Prevent body scroll when lightbox is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleZoomIn = useCallback(() => {
    setScale(prev => Math.min(prev + 0.5, 4));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale(prev => Math.max(prev - 0.5, 0.5));
  }, []);

  const handleRotate = useCallback(() => {
    setRotation(prev => (prev + 90) % 360);
  }, []);

  // Touch handlers for swipe-to-close
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (scale === 1) {
      setStartY(e.touches[0].clientY);
      setIsDragging(true);
    }
  }, [scale]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (startY !== null && isDragging && scale === 1) {
      const currentY = e.touches[0].clientY;
      const diff = currentY - startY;
      // Only allow dragging down
      if (diff > 0) {
        setTranslateY(diff);
      }
    }
  }, [startY, isDragging, scale]);

  const handleTouchEnd = useCallback(() => {
    if (translateY > 100) {
      // Close if dragged more than 100px
      onClose();
    }
    setStartY(null);
    setTranslateY(0);
    setIsDragging(false);
  }, [translateY, onClose]);

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

  if (!isOpen) return null;

  const opacity = Math.max(0, 1 - translateY / 200);

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

        <div className="flex items-center gap-2">
          {onDownload && (
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 text-white hover:bg-white/20"
              onClick={onDownload}
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

      {/* Image container */}
      <div
        className={cn(
          "relative max-w-full max-h-full flex items-center justify-center p-4",
          isDragging ? "transition-none" : "transition-transform duration-200"
        )}
        style={{
          transform: `translateY(${translateY}px) scale(${scale}) rotate(${rotation}deg)`,
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
            <p className="text-sm text-white/70">{alt}</p>
          </div>
        )}

        {/* Image */}
        <img
          src={src?.replace(/^http:\/\//i, 'https://') || ''}
          alt={alt}
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

      {/* Swipe hint for mobile */}
      <div className="absolute bottom-6 left-0 right-0 text-center text-white/50 text-xs pointer-events-none">
        Проведите вниз чтобы закрыть
      </div>
    </div>
  );

  // Render portal at document body to avoid z-index issues
  return createPortal(lightboxContent, document.body);
});

ImageLightbox.displayName = 'ImageLightbox';
