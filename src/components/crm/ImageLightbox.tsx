import { useState, useEffect, useCallback, memo, useRef } from 'react';
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

/** Calculate distance between two touch points */
const getDistance = (touch1: React.Touch, touch2: React.Touch): number => {
  const dx = touch1.clientX - touch2.clientX;
  const dy = touch1.clientY - touch2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
};

/** Calculate center point between two touches */
const getCenter = (touch1: React.Touch, touch2: React.Touch): { x: number; y: number } => ({
  x: (touch1.clientX + touch2.clientX) / 2,
  y: (touch1.clientY + touch2.clientY) / 2,
});

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
  
  // Pinch-to-zoom state
  const [isPinching, setIsPinching] = useState(false);
  const initialPinchDistance = useRef<number | null>(null);
  const initialPinchScale = useRef<number>(1);
  
  // Pan state when zoomed
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isAnimatingSnapBack, setIsAnimatingSnapBack] = useState(false);
  const [isMomentumAnimating, setIsMomentumAnimating] = useState(false);
  const lastPanPosition = useRef<{ x: number; y: number } | null>(null);
  const velocityRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastTouchTimeRef = useRef<number>(0);
  const momentumAnimationRef = useRef<number | null>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const currentImage = gallery[currentIndex];
  const hasMultipleImages = gallery.length > 1;
  const allCached = cachedCount === totalCount && totalCount > 0;
  const isZoomed = scale > 1;

  /**
   * Clamp pan offset to keep image within screen bounds
   * Returns the constrained offset values
   */
  const clampPanOffset = useCallback((offsetX: number, offsetY: number, currentScale: number): { x: number; y: number } => {
    if (currentScale <= 1) return { x: 0, y: 0 };
    
    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Estimate image dimensions (use container or default)
    const imageWidth = Math.min(viewportWidth - 32, 800); // accounting for padding
    const imageHeight = Math.min(viewportHeight - 128, 600); // accounting for toolbars
    
    // Calculate how much the image extends beyond viewport when scaled
    const scaledWidth = imageWidth * currentScale;
    const scaledHeight = imageHeight * currentScale;
    
    // Maximum pan distance is half the overflow on each side
    const maxPanX = Math.max(0, (scaledWidth - viewportWidth) / 2);
    const maxPanY = Math.max(0, (scaledHeight - viewportHeight) / 2);
    
    return {
      x: Math.max(-maxPanX, Math.min(maxPanX, offsetX)),
      y: Math.max(-maxPanY, Math.min(maxPanY, offsetY)),
    };
  }, []);

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
    setPanOffset({ x: 0, y: 0 });
    setIsMomentumAnimating(false);
    velocityRef.current = { x: 0, y: 0 };
    if (momentumAnimationRef.current) {
      cancelAnimationFrame(momentumAnimationRef.current);
      momentumAnimationRef.current = null;
    }
    initialPinchDistance.current = null;
    initialPinchScale.current = 1;
  }, [currentIndex]);

  // Cleanup momentum animation on unmount
  useEffect(() => {
    return () => {
      if (momentumAnimationRef.current) {
        cancelAnimationFrame(momentumAnimationRef.current);
      }
    };
  }, []);

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

  // Touch handlers for swipe and pinch gestures
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Pinch-to-zoom: two finger touch
    if (e.touches.length === 2) {
      e.preventDefault();
      const distance = getDistance(e.touches[0], e.touches[1]);
      initialPinchDistance.current = distance;
      initialPinchScale.current = scale;
      setIsPinching(true);
      setIsDragging(false);
      return;
    }
    
    // Single finger touch
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      
      // If zoomed, start panning
      if (isZoomed) {
        lastPanPosition.current = { x: touch.clientX, y: touch.clientY };
        return;
      }
      
      // Otherwise, start drag for swipe gestures
      setTouchStart({
        x: touch.clientX,
        y: touch.clientY
      });
      setIsDragging(true);
      setDragDirection(null);
    }
  }, [scale, isZoomed]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    // Handle pinch-to-zoom
    if (e.touches.length === 2 && isPinching && initialPinchDistance.current) {
      e.preventDefault();
      const currentDistance = getDistance(e.touches[0], e.touches[1]);
      const scaleChange = currentDistance / initialPinchDistance.current;
      const newScale = Math.min(Math.max(initialPinchScale.current * scaleChange, 0.5), 4);
      setScale(newScale);
      return;
    }
    
    // Handle panning when zoomed
    if (e.touches.length === 1 && isZoomed && lastPanPosition.current) {
      const touch = e.touches[0];
      const now = performance.now();
      const deltaX = touch.clientX - lastPanPosition.current.x;
      const deltaY = touch.clientY - lastPanPosition.current.y;
      const deltaTime = now - lastTouchTimeRef.current;
      
      // Calculate velocity for momentum
      if (deltaTime > 0) {
        const velocityX = deltaX / deltaTime * 16; // normalize to ~60fps
        const velocityY = deltaY / deltaTime * 16;
        // Smooth velocity with exponential moving average
        velocityRef.current = {
          x: velocityX * 0.6 + velocityRef.current.x * 0.4,
          y: velocityY * 0.6 + velocityRef.current.y * 0.4,
        };
      }
      lastTouchTimeRef.current = now;
      
      setPanOffset(prev => {
        const newX = prev.x + deltaX;
        const newY = prev.y + deltaY;
        // Apply clamping to keep image in bounds
        return clampPanOffset(newX, newY, scale);
      });
      
      lastPanPosition.current = { x: touch.clientX, y: touch.clientY };
      return;
    }
    
    // Handle swipe gestures when not zoomed
    if (!touchStart || !isDragging || isZoomed) return;
    
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
  }, [touchStart, isDragging, dragDirection, hasMultipleImages, isPinching, isZoomed, scale, clampPanOffset]);

  const handleTouchEnd = useCallback(() => {
    // End pinch
    if (isPinching) {
      setIsPinching(false);
      initialPinchDistance.current = null;
      
      // Reset pan offset if scale is back to 1, otherwise clamp to bounds with animation
      if (scale <= 1) {
        setIsAnimatingSnapBack(true);
        setPanOffset({ x: 0, y: 0 });
        setScale(1);
        setTimeout(() => setIsAnimatingSnapBack(false), 300);
      } else {
        // Clamp pan offset after pinch ends with smooth animation
        const currentOffset = panOffset;
        const clampedOffset = clampPanOffset(currentOffset.x, currentOffset.y, scale);
        
        // Only animate if position changed (was out of bounds)
        if (clampedOffset.x !== currentOffset.x || clampedOffset.y !== currentOffset.y) {
          setIsAnimatingSnapBack(true);
          setPanOffset(clampedOffset);
          setTimeout(() => setIsAnimatingSnapBack(false), 300);
        }
      }
      return;
    }
    
    // End panning - apply momentum scrolling
    if (isZoomed) {
      lastPanPosition.current = null;
      
      const velocity = velocityRef.current;
      const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
      
      // Only apply momentum if speed is significant
      if (speed > 0.5) {
        setIsMomentumAnimating(true);
        
        // Cancel any existing animation
        if (momentumAnimationRef.current) {
          cancelAnimationFrame(momentumAnimationRef.current);
        }
        
        let currentVelocity = { ...velocity };
        const friction = 0.95; // Deceleration factor
        const minVelocity = 0.1;
        
        const animate = () => {
          // Apply friction
          currentVelocity.x *= friction;
          currentVelocity.y *= friction;
          
          // Stop when velocity is negligible
          const currentSpeed = Math.sqrt(currentVelocity.x ** 2 + currentVelocity.y ** 2);
          if (currentSpeed < minVelocity) {
            setIsMomentumAnimating(false);
            velocityRef.current = { x: 0, y: 0 };
            
            // Final snap-back check
            setPanOffset(prev => {
              const clamped = clampPanOffset(prev.x, prev.y, scale);
              if (clamped.x !== prev.x || clamped.y !== prev.y) {
                setIsAnimatingSnapBack(true);
                setTimeout(() => setIsAnimatingSnapBack(false), 300);
              }
              return clamped;
            });
            return;
          }
          
          // Update position
          setPanOffset(prev => {
            const newX = prev.x + currentVelocity.x;
            const newY = prev.y + currentVelocity.y;
            const clamped = clampPanOffset(newX, newY, scale);
            
            // Reduce velocity if hitting bounds
            if (clamped.x !== newX) currentVelocity.x *= 0.3;
            if (clamped.y !== newY) currentVelocity.y *= 0.3;
            
            return clamped;
          });
          
          momentumAnimationRef.current = requestAnimationFrame(animate);
        };
        
        momentumAnimationRef.current = requestAnimationFrame(animate);
      } else {
        // No momentum - just snap back if needed
        const currentOffset = panOffset;
        const clampedOffset = clampPanOffset(currentOffset.x, currentOffset.y, scale);
        
        if (clampedOffset.x !== currentOffset.x || clampedOffset.y !== currentOffset.y) {
          setIsAnimatingSnapBack(true);
          setPanOffset(clampedOffset);
          setTimeout(() => setIsAnimatingSnapBack(false), 300);
        }
      }
      
      velocityRef.current = { x: 0, y: 0 };
      return;
    }
    
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
  }, [isPinching, isZoomed, dragDirection, translateX, translateY, hasMultipleImages, currentIndex, gallery.length, goToPrevious, goToNext, onClose, scale, clampPanOffset, panOffset]);

  // Reset zoom on double tap or button
  const resetZoom = useCallback(() => {
    setScale(1);
    setPanOffset({ x: 0, y: 0 });
  }, []);

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
      if (scale > 1) {
        resetZoom();
      } else {
        setScale(2);
      }
    }
    setLastTap(now);
  }, [lastTap, scale, resetZoom]);

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
          (isDragging || isPinching || isMomentumAnimating) && !isAnimatingSnapBack 
            ? "transition-none" 
            : "transition-transform duration-200 ease-out"
        )}
        style={{
          transform: `translateX(${translateX + panOffset.x}px) translateY(${translateY + panOffset.y}px) scale(${scale}) rotate(${rotation}deg)`,
          transition: isAnimatingSnapBack ? 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : undefined,
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
        {isZoomed 
          ? "Двойной тап — сбросить зум • Щипок — масштаб"
          : hasMultipleImages 
            ? "Свайп влево/вправо — листать • Щипок — зум"
            : "Щипок — зум • Свайп вниз — закрыть"
        }
      </div>
    </div>
  );

  return createPortal(lightboxContent, document.body);
});

ImageLightbox.displayName = 'ImageLightbox';
