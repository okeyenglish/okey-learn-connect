import { useState, useEffect, useCallback, memo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, ZoomIn, ZoomOut, RotateCw, Loader2, ChevronLeft, ChevronRight, CloudOff, Cloud, Share2, Copy, Check, Save, Crop } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useImageGalleryCache } from '@/hooks/useImageCache';
import { ImageCropOverlay } from './ImageCropOverlay';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
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

/** Calculate angle between two touch points (in degrees) */
const getAngle = (touch1: React.Touch, touch2: React.Touch): number => {
  const dx = touch2.clientX - touch1.clientX;
  const dy = touch2.clientY - touch1.clientY;
  return Math.atan2(dy, dx) * (180 / Math.PI);
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
  
  // Pinch-to-zoom and rotate state
  const [isPinching, setIsPinching] = useState(false);
  const initialPinchDistance = useRef<number | null>(null);
  const initialPinchScale = useRef<number>(1);
  const initialPinchAngle = useRef<number | null>(null);
  const initialPinchRotation = useRef<number>(0);
  
  // Pan state when zoomed
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isAnimatingSnapBack, setIsAnimatingSnapBack] = useState(false);
  const [isMomentumAnimating, setIsMomentumAnimating] = useState(false);
  const lastPanPosition = useRef<{ x: number; y: number } | null>(null);
  const rawPanOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 }); // Unclamped offset for rubber band
  const velocityRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastTouchTimeRef = useRef<number>(0);
  const momentumAnimationRef = useRef<number | null>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  
  // Zoom indicator state
  const [showZoomIndicator, setShowZoomIndicator] = useState(false);
  const zoomIndicatorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousScaleRef = useRef<number>(1);
  
  // Two-finger double tap state for reset
  const lastTwoFingerTapRef = useRef<number>(0);
  const [showResetIndicator, setShowResetIndicator] = useState(false);
  
  // Long press context menu state
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [showCopiedIndicator, setShowCopiedIndicator] = useState(false);
  const [showSavedIndicator, setShowSavedIndicator] = useState(false);
  const [isSavingWithTransforms, setIsSavingWithTransforms] = useState(false);
  const [showCropOverlay, setShowCropOverlay] = useState(false);
  const longPressStartRef = useRef<{ x: number; y: number } | null>(null);

  const currentImage = gallery[currentIndex];
  const hasMultipleImages = gallery.length > 1;
  const allCached = cachedCount === totalCount && totalCount > 0;
  const isZoomed = scale > 1;

  /**
   * Get pan bounds for image at current scale
   */
  const getPanBounds = useCallback((currentScale: number): { maxX: number; maxY: number } => {
    if (currentScale <= 1) return { maxX: 0, maxY: 0 };
    
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const imageWidth = Math.min(viewportWidth - 32, 800);
    const imageHeight = Math.min(viewportHeight - 128, 600);
    const scaledWidth = imageWidth * currentScale;
    const scaledHeight = imageHeight * currentScale;
    
    return {
      maxX: Math.max(0, (scaledWidth - viewportWidth) / 2),
      maxY: Math.max(0, (scaledHeight - viewportHeight) / 2),
    };
  }, []);

  /**
   * Clamp pan offset to keep image within screen bounds
   * Returns the constrained offset values
   */
  const clampPanOffset = useCallback((offsetX: number, offsetY: number, currentScale: number): { x: number; y: number } => {
    if (currentScale <= 1) return { x: 0, y: 0 };
    
    const { maxX, maxY } = getPanBounds(currentScale);
    
    return {
      x: Math.max(-maxX, Math.min(maxX, offsetX)),
      y: Math.max(-maxY, Math.min(maxY, offsetY)),
    };
  }, [getPanBounds]);

  /**
   * Apply rubber band effect - allows going beyond bounds with resistance
   * Returns position with rubber band applied
   */
  const applyRubberBand = useCallback((offsetX: number, offsetY: number, currentScale: number): { x: number; y: number } => {
    if (currentScale <= 1) return { x: 0, y: 0 };
    
    const { maxX, maxY } = getPanBounds(currentScale);
    const rubberBandFactor = 0.3; // How much resistance (lower = more resistance)
    
    let x = offsetX;
    let y = offsetY;
    
    // Apply rubber band effect when beyond bounds
    if (offsetX > maxX) {
      const overflow = offsetX - maxX;
      x = maxX + overflow * rubberBandFactor;
    } else if (offsetX < -maxX) {
      const overflow = -maxX - offsetX;
      x = -maxX - overflow * rubberBandFactor;
    }
    
    if (offsetY > maxY) {
      const overflow = offsetY - maxY;
      y = maxY + overflow * rubberBandFactor;
    } else if (offsetY < -maxY) {
      const overflow = -maxY - offsetY;
      y = -maxY - overflow * rubberBandFactor;
    }
    
    return { x, y };
  }, [getPanBounds]);

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
    rawPanOffsetRef.current = { x: 0, y: 0 };
    setIsMomentumAnimating(false);
    velocityRef.current = { x: 0, y: 0 };
    if (momentumAnimationRef.current) {
      cancelAnimationFrame(momentumAnimationRef.current);
      momentumAnimationRef.current = null;
    }
    initialPinchDistance.current = null;
    initialPinchScale.current = 1;
    initialPinchAngle.current = null;
    initialPinchRotation.current = 0;
  }, [currentIndex]);

  // Cleanup momentum animation on unmount
  useEffect(() => {
    return () => {
      if (momentumAnimationRef.current) {
        cancelAnimationFrame(momentumAnimationRef.current);
      }
      if (zoomIndicatorTimeoutRef.current) {
        clearTimeout(zoomIndicatorTimeoutRef.current);
      }
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  // Show zoom indicator when scale changes
  useEffect(() => {
    if (scale !== previousScaleRef.current) {
      previousScaleRef.current = scale;
      setShowZoomIndicator(true);
      
      // Clear existing timeout
      if (zoomIndicatorTimeoutRef.current) {
        clearTimeout(zoomIndicatorTimeoutRef.current);
      }
      
      // Hide indicator after 1.5 seconds
      zoomIndicatorTimeoutRef.current = setTimeout(() => {
        setShowZoomIndicator(false);
      }, 1500);
    }
  }, [scale]);

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

  // Long press handlers for context menu
  const cancelLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    longPressStartRef.current = null;
  }, []);

  const handleLongPressStart = useCallback((x: number, y: number) => {
    cancelLongPress();
    longPressStartRef.current = { x, y };
    
    longPressTimerRef.current = setTimeout(() => {
      // Trigger haptic feedback if available
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
      setContextMenuPosition({ x, y });
      setShowContextMenu(true);
      longPressTimerRef.current = null;
    }, 500); // 500ms long press threshold
  }, [cancelLongPress]);

  const handleLongPressMove = useCallback((x: number, y: number) => {
    if (longPressStartRef.current && longPressTimerRef.current) {
      const dx = Math.abs(x - longPressStartRef.current.x);
      const dy = Math.abs(y - longPressStartRef.current.y);
      // Cancel if moved more than 10px
      if (dx > 10 || dy > 10) {
        cancelLongPress();
      }
    }
  }, [cancelLongPress]);

  // Context menu actions
  const handleShare = useCallback(async () => {
    setShowContextMenu(false);
    if (!currentImage?.src) return;
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: currentImage.alt || 'Изображение',
          url: currentImage.src,
        });
      } else {
        // Fallback: copy link
        await navigator.clipboard.writeText(currentImage.src);
        setShowCopiedIndicator(true);
        setTimeout(() => setShowCopiedIndicator(false), 1500);
      }
    } catch (err) {
      console.log('Share cancelled or failed:', err);
    }
  }, [currentImage]);

  const handleCopyImage = useCallback(async () => {
    setShowContextMenu(false);
    if (!currentImage?.src) return;
    
    try {
      // Try to copy image to clipboard
      const response = await fetch(currentImage.src.replace(/^http:\/\//i, 'https://'), {
        mode: 'cors',
        credentials: 'omit',
      });
      const blob = await response.blob();
      
      if (navigator.clipboard && 'write' in navigator.clipboard) {
        await navigator.clipboard.write([
          new ClipboardItem({
            [blob.type]: blob,
          }),
        ]);
        setShowCopiedIndicator(true);
        setTimeout(() => setShowCopiedIndicator(false), 1500);
      } else {
        // Fallback: copy URL
        await navigator.clipboard.writeText(currentImage.src);
        setShowCopiedIndicator(true);
        setTimeout(() => setShowCopiedIndicator(false), 1500);
      }
    } catch (err) {
      console.log('Copy failed, trying URL fallback:', err);
      try {
        await navigator.clipboard.writeText(currentImage.src);
        setShowCopiedIndicator(true);
        setTimeout(() => setShowCopiedIndicator(false), 1500);
      } catch {
        console.log('Copy URL also failed');
      }
    }
  }, [currentImage]);

  const handleContextMenuDownload = useCallback(() => {
    setShowContextMenu(false);
    handleDownloadCurrent();
  }, [handleDownloadCurrent]);

  // Save image with current transformations (rotation, scale)
  const handleSaveWithTransformations = useCallback(async () => {
    setShowContextMenu(false);
    if (!currentImage?.src) return;
    
    setIsSavingWithTransforms(true);
    
    try {
      // Load the original image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = currentImage.src.replace(/^http:\/\//i, 'https://');
      });
      
      // Calculate output dimensions based on rotation
      const radians = (rotation * Math.PI) / 180;
      const sin = Math.abs(Math.sin(radians));
      const cos = Math.abs(Math.cos(radians));
      
      // Apply scale to dimensions
      const scaledWidth = img.width * scale;
      const scaledHeight = img.height * scale;
      
      // Calculate bounding box after rotation
      const outputWidth = Math.ceil(scaledWidth * cos + scaledHeight * sin);
      const outputHeight = Math.ceil(scaledWidth * sin + scaledHeight * cos);
      
      // Create canvas with calculated dimensions
      const canvas = document.createElement('canvas');
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');
      
      // Move to center, apply transformations, draw image
      ctx.translate(outputWidth / 2, outputHeight / 2);
      ctx.rotate(radians);
      ctx.scale(scale, scale);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      
      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (!blob) {
          console.error('Failed to create blob');
          setIsSavingWithTransforms(false);
          return;
        }
        
        // Create download link
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Generate filename with transformation info
        const originalName = currentImage.alt || 'image';
        const rotationSuffix = rotation !== 0 ? `_rot${Math.round(rotation)}` : '';
        const scaleSuffix = scale !== 1 ? `_${Math.round(scale * 100)}pct` : '';
        a.download = `${originalName}${rotationSuffix}${scaleSuffix}.png`;
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        setIsSavingWithTransforms(false);
        setShowSavedIndicator(true);
        setTimeout(() => setShowSavedIndicator(false), 1500);
      }, 'image/png');
      
    } catch (err) {
      console.error('Failed to save image with transformations:', err);
      setIsSavingWithTransforms(false);
      // Fallback to regular download
      handleDownloadCurrent();
    }
  }, [currentImage, rotation, scale, handleDownloadCurrent]);

  // Open crop overlay
  const handleOpenCrop = useCallback(() => {
    setShowContextMenu(false);
    setShowCropOverlay(true);
  }, []);

  // Handle cropped image completion
  const handleCropComplete = useCallback((croppedBlob: Blob) => {
    // Download the cropped image
    const url = URL.createObjectURL(croppedBlob);
    const a = document.createElement('a');
    a.href = url;
    
    const originalName = currentImage?.alt || 'image';
    a.download = `${originalName}_cropped.png`;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setShowCropOverlay(false);
    setShowSavedIndicator(true);
    setTimeout(() => setShowSavedIndicator(false), 1500);
  }, [currentImage]);

  // Cancel crop
  const handleCropCancel = useCallback(() => {
    setShowCropOverlay(false);
  }, []);
  const resetAllTransformations = useCallback(() => {
    setScale(1);
    setRotation(0);
    setPanOffset({ x: 0, y: 0 });
    rawPanOffsetRef.current = { x: 0, y: 0 };
    setShowResetIndicator(true);
    setTimeout(() => setShowResetIndicator(false), 1200);
  }, []);

  // Touch handlers for swipe and pinch gestures
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Two finger touch - check for double tap to reset, or start pinch
    if (e.touches.length === 2) {
      e.preventDefault();
      
      const now = Date.now();
      const timeSinceLastTwoFingerTap = now - lastTwoFingerTapRef.current;
      
      // Check for two-finger double tap (within 400ms)
      if (timeSinceLastTwoFingerTap < 400) {
        // Two-finger double tap detected - reset all transformations
        resetAllTransformations();
        lastTwoFingerTapRef.current = 0;
        return;
      }
      
      lastTwoFingerTapRef.current = now;
      
      const distance = getDistance(e.touches[0], e.touches[1]);
      const angle = getAngle(e.touches[0], e.touches[1]);
      initialPinchDistance.current = distance;
      initialPinchScale.current = scale;
      initialPinchAngle.current = angle;
      initialPinchRotation.current = rotation;
      setIsPinching(true);
      setIsDragging(false);
      return;
    }
    
    // Single finger touch
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      
      // Start long press detection
      handleLongPressStart(touch.clientX, touch.clientY);
      
      // If zoomed, start panning
      if (isZoomed) {
        lastPanPosition.current = { x: touch.clientX, y: touch.clientY };
        // Initialize raw offset from current clamped position
        rawPanOffsetRef.current = { ...panOffset };
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
  }, [scale, rotation, isZoomed, resetAllTransformations, handleLongPressStart, panOffset]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    // Handle pinch-to-zoom and rotate
    if (e.touches.length === 2 && isPinching && initialPinchDistance.current !== null && initialPinchAngle.current !== null) {
      e.preventDefault();
      cancelLongPress();
      
      // Calculate new scale
      const currentDistance = getDistance(e.touches[0], e.touches[1]);
      const scaleChange = currentDistance / initialPinchDistance.current;
      const newScale = Math.min(Math.max(initialPinchScale.current * scaleChange, 0.5), 4);
      setScale(newScale);
      
      // Calculate new rotation
      const currentAngle = getAngle(e.touches[0], e.touches[1]);
      let angleDelta = currentAngle - initialPinchAngle.current;
      
      // Normalize angle delta to avoid sudden jumps
      if (angleDelta > 180) angleDelta -= 360;
      if (angleDelta < -180) angleDelta += 360;
      
      const newRotation = initialPinchRotation.current + angleDelta;
      setRotation(newRotation);
      return;
    }
    
    // Handle panning when zoomed
    if (e.touches.length === 1 && isZoomed && lastPanPosition.current) {
      const touch = e.touches[0];
      const now = performance.now();
      const deltaX = touch.clientX - lastPanPosition.current.x;
      const deltaY = touch.clientY - lastPanPosition.current.y;
      const deltaTime = now - lastTouchTimeRef.current;
      
      // Cancel long press on movement
      handleLongPressMove(touch.clientX, touch.clientY);
      
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
      
      // Update raw offset (unclamped) and apply rubber band effect
      rawPanOffsetRef.current = {
        x: rawPanOffsetRef.current.x + deltaX,
        y: rawPanOffsetRef.current.y + deltaY,
      };
      
      // Apply rubber band effect for visual feedback
      const rubberBandOffset = applyRubberBand(rawPanOffsetRef.current.x, rawPanOffsetRef.current.y, scale);
      setPanOffset(rubberBandOffset);
      
      lastPanPosition.current = { x: touch.clientX, y: touch.clientY };
      return;
    }
    
    // Handle swipe gestures when not zoomed
    if (!touchStart || !isDragging || isZoomed) return;
    
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    
    // Cancel long press on movement
    handleLongPressMove(currentX, currentY);
    
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
  }, [touchStart, isDragging, dragDirection, hasMultipleImages, isPinching, isZoomed, scale, rotation, applyRubberBand, cancelLongPress, handleLongPressMove]);

  const handleTouchEnd = useCallback(() => {
    // Cancel long press on touch end
    cancelLongPress();
    
    // End pinch
    if (isPinching) {
      setIsPinching(false);
      initialPinchDistance.current = null;
      initialPinchAngle.current = null;
      
      // Reset pan offset if scale is back to 1, otherwise snap back with animation
      if (scale <= 1) {
        setIsAnimatingSnapBack(true);
        setPanOffset({ x: 0, y: 0 });
        rawPanOffsetRef.current = { x: 0, y: 0 };
        setScale(1);
        setTimeout(() => setIsAnimatingSnapBack(false), 300);
      } else {
        // Snap back to clamped position with smooth animation
        const clampedOffset = clampPanOffset(rawPanOffsetRef.current.x, rawPanOffsetRef.current.y, scale);
        rawPanOffsetRef.current = clampedOffset;
        
        const currentOffset = panOffset;
        if (clampedOffset.x !== currentOffset.x || clampedOffset.y !== currentOffset.y) {
          setIsAnimatingSnapBack(true);
          setPanOffset(clampedOffset);
          setTimeout(() => setIsAnimatingSnapBack(false), 300);
        }
      }
      return;
    }
    
    // End panning - apply momentum scrolling or snap back
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
        let rawOffset = { ...rawPanOffsetRef.current };
        const friction = 0.95;
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
            
            // Final snap-back to clamped position
            const clamped = clampPanOffset(rawOffset.x, rawOffset.y, scale);
            rawPanOffsetRef.current = clamped;
            
            setPanOffset(prev => {
              if (clamped.x !== prev.x || clamped.y !== prev.y) {
                setIsAnimatingSnapBack(true);
                setTimeout(() => setIsAnimatingSnapBack(false), 300);
              }
              return clamped;
            });
            return;
          }
          
          // Update raw position
          rawOffset.x += currentVelocity.x;
          rawOffset.y += currentVelocity.y;
          
          // Clamp for display
          const clamped = clampPanOffset(rawOffset.x, rawOffset.y, scale);
          
          // Reduce velocity when hitting bounds
          if (clamped.x !== rawOffset.x) {
            currentVelocity.x *= 0.3;
            rawOffset.x = clamped.x; // Reset to bounds
          }
          if (clamped.y !== rawOffset.y) {
            currentVelocity.y *= 0.3;
            rawOffset.y = clamped.y;
          }
          
          setPanOffset(clamped);
          rawPanOffsetRef.current = rawOffset;
          
          momentumAnimationRef.current = requestAnimationFrame(animate);
        };
        
        momentumAnimationRef.current = requestAnimationFrame(animate);
      } else {
        // No momentum - snap back from rubber band position
        const clampedOffset = clampPanOffset(rawPanOffsetRef.current.x, rawPanOffsetRef.current.y, scale);
        rawPanOffsetRef.current = clampedOffset;
        
        const currentOffset = panOffset;
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
  }, [isPinching, isZoomed, dragDirection, translateX, translateY, hasMultipleImages, currentIndex, gallery.length, goToPrevious, goToNext, onClose, scale, clampPanOffset, panOffset, cancelLongPress]);

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


  // Double tap handling with edge detection
  const [lastTap, setLastTap] = useState(0);
  const lastTapPositionRef = useRef<{ x: number; y: number } | null>(null);
  
  const handleDoubleTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const now = Date.now();
    
    // Get tap position
    let tapX: number, tapY: number;
    if ('touches' in e && e.touches.length > 0) {
      tapX = e.touches[0].clientX;
      tapY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      tapX = e.clientX;
      tapY = e.clientY;
    } else {
      return;
    }
    
    if (now - lastTap < 300) {
      // It's a double tap
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const edgeThreshold = viewportWidth * 0.25; // 25% from edges
      const topBottomThreshold = viewportHeight * 0.25;
      
      // If zoomed, check if tapping on edge to pan to that edge
      if (scale > 1) {
        const { maxX, maxY } = getPanBounds(scale);
        const isLeftEdge = tapX < edgeThreshold;
        const isRightEdge = tapX > viewportWidth - edgeThreshold;
        const isTopEdge = tapY < topBottomThreshold;
        const isBottomEdge = tapY > viewportHeight - topBottomThreshold;
        
        // If tapping on an edge, pan to that edge
        if (isLeftEdge || isRightEdge || isTopEdge || isBottomEdge) {
          let newX = panOffset.x;
          let newY = panOffset.y;
          
          if (isLeftEdge && maxX > 0) {
            newX = maxX; // Pan to show left edge of image
          } else if (isRightEdge && maxX > 0) {
            newX = -maxX; // Pan to show right edge of image
          }
          
          if (isTopEdge && maxY > 0) {
            newY = maxY; // Pan to show top edge of image
          } else if (isBottomEdge && maxY > 0) {
            newY = -maxY; // Pan to show bottom edge of image
          }
          
          // Animate to new position
          if (newX !== panOffset.x || newY !== panOffset.y) {
            setIsAnimatingSnapBack(true);
            setPanOffset({ x: newX, y: newY });
            rawPanOffsetRef.current = { x: newX, y: newY };
            setTimeout(() => setIsAnimatingSnapBack(false), 300);
            setLastTap(0);
            lastTapPositionRef.current = null;
            return;
          }
        }
        
        // If tapping in center while zoomed, reset zoom
        resetZoom();
      } else {
        // Not zoomed - zoom to 2x
        setScale(2);
      }
      
      setLastTap(0);
      lastTapPositionRef.current = null;
    } else {
      setLastTap(now);
      lastTapPositionRef.current = { x: tapX, y: tapY };
    }
  }, [lastTap, scale, resetZoom, getPanBounds, panOffset]);

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

      {/* Zoom level indicator */}
      <div
        className={cn(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20",
          "pointer-events-none transition-all duration-300 ease-out",
          showZoomIndicator 
            ? "opacity-100 scale-100" 
            : "opacity-0 scale-75"
        )}
      >
        <div className="bg-black/70 backdrop-blur-sm text-white px-5 py-3 rounded-2xl flex items-center gap-3 shadow-xl">
          <ZoomIn className="h-6 w-6" />
          <span className="text-2xl font-semibold tabular-nums">
            {Math.round(scale * 100)}%
          </span>
        </div>
      </div>

      {/* Reset transformations indicator */}
      <div
        className={cn(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20",
          "pointer-events-none transition-all duration-300 ease-out",
          showResetIndicator 
            ? "opacity-100 scale-100" 
            : "opacity-0 scale-75"
        )}
      >
        <div className="bg-black/70 backdrop-blur-sm text-white px-5 py-3 rounded-2xl flex items-center gap-3 shadow-xl">
          <RotateCw className="h-6 w-6" />
          <span className="text-lg font-medium">
            Сброс
          </span>
        </div>
      </div>

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

      {/* Context menu (long press) */}
      {showContextMenu && (
        <div 
          className="fixed inset-0 z-30"
          onClick={() => setShowContextMenu(false)}
          onTouchStart={() => setShowContextMenu(false)}
        >
          <div 
            className="absolute bg-popover border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200"
            style={{
              left: Math.min(contextMenuPosition.x, window.innerWidth - 200),
              top: Math.min(contextMenuPosition.y, window.innerHeight - 180),
            }}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <div className="py-1">
              {onDownload && (
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent transition-colors"
                  onClick={handleContextMenuDownload}
                >
                  <Download className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">Скачать</span>
                </button>
              )}
              {/* Show "Save with transformations" only if there are transformations */}
              {(rotation !== 0 || scale !== 1) && (
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent transition-colors"
                  onClick={handleSaveWithTransformations}
                  disabled={isSavingWithTransforms}
                >
                  {isSavingWithTransforms ? (
                    <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
                  ) : (
                    <Save className="h-5 w-5 text-muted-foreground" />
                  )}
                  <span className="text-sm font-medium">
                    {isSavingWithTransforms ? 'Сохранение...' : 'Сохранить с трансформацией'}
                  </span>
                </button>
              )}
              <button
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent transition-colors"
                onClick={handleShare}
              >
                <Share2 className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">Поделиться</span>
              </button>
              <button
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent transition-colors"
                onClick={handleCopyImage}
              >
                <Copy className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">Копировать</span>
              </button>
              <button
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent transition-colors"
                onClick={handleOpenCrop}
              >
                <Crop className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">Обрезать</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Copied indicator */}
      <div
        className={cn(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40",
          "pointer-events-none transition-all duration-300 ease-out",
          showCopiedIndicator 
            ? "opacity-100 scale-100" 
            : "opacity-0 scale-75"
        )}
      >
        <div className="bg-black/70 backdrop-blur-sm text-white px-5 py-3 rounded-2xl flex items-center gap-3 shadow-xl">
          <Check className="h-6 w-6 text-green-400" />
          <span className="text-lg font-medium">
            Скопировано
          </span>
        </div>
      </div>

      {/* Saved indicator */}
      <div
        className={cn(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40",
          "pointer-events-none transition-all duration-300 ease-out",
          showSavedIndicator 
            ? "opacity-100 scale-100" 
            : "opacity-0 scale-75"
        )}
      >
        <div className="bg-black/70 backdrop-blur-sm text-white px-5 py-3 rounded-2xl flex items-center gap-3 shadow-xl">
          <Save className="h-6 w-6 text-green-400" />
          <span className="text-lg font-medium">
            Сохранено
          </span>
        </div>
      </div>

      {/* Swipe hints for mobile */}
      <div className="absolute bottom-4 left-0 right-0 text-center text-white/50 text-xs pointer-events-none">
        {isZoomed || rotation !== 0
          ? "Долгий тап — меню • 2×тап 2 пальцами — сброс"
          : hasMultipleImages 
            ? "Долгий тап — меню • Свайп — листать • Вращение 2 пальцами — поворот"
            : "Долгий тап — меню • Щипок — зум • Вращение 2 пальцами — поворот"
        }
      </div>

      {/* Crop overlay */}
      {showCropOverlay && currentImage && (
        <ImageCropOverlay
          imageSrc={currentImage.src}
          imageAlt={currentImage.alt || 'image'}
          rotation={rotation}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}
    </div>
  );

  return createPortal(lightboxContent, document.body);
});

ImageLightbox.displayName = 'ImageLightbox';
