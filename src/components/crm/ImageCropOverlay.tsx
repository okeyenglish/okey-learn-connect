import { useState, useCallback, useRef, useEffect, memo } from 'react';
import { X, Check, Move, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ImageCropOverlayProps {
  imageSrc: string;
  imageAlt: string;
  rotation: number;
  onCropComplete: (croppedImageBlob: Blob) => void;
  onCancel: () => void;
}

type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w';

export const ImageCropOverlay = memo(({
  imageSrc,
  imageAlt,
  rotation,
  onCropComplete,
  onCancel,
}: ImageCropOverlayProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  
  // Crop area state (relative to displayed image)
  const [cropArea, setCropArea] = useState<CropArea>({ x: 0, y: 0, width: 0, height: 0 });
  const [cropHistory, setCropHistory] = useState<CropArea[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const dragStartRef = useRef<{ x: number; y: number; cropX: number; cropY: number } | null>(null);
  const resizeStartRef = useRef<{ 
    x: number; 
    y: number; 
    crop: CropArea;
  } | null>(null);
  const pendingHistoryRef = useRef<CropArea | null>(null);

  // Initialize crop area when image loads
  useEffect(() => {
    if (imageLoaded && imageRef.current && containerRef.current) {
      const img = imageRef.current;
      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      const imgRect = img.getBoundingClientRect();
      
      // Calculate displayed image dimensions and position
      const displayedWidth = imgRect.width;
      const displayedHeight = imgRect.height;
      const offsetX = imgRect.left - containerRect.left;
      const offsetY = imgRect.top - containerRect.top;
      
      setImageDimensions({ width: displayedWidth, height: displayedHeight });
      setImagePosition({ x: offsetX, y: offsetY });
      
      // Initialize crop area to center 80% of image
      const margin = 0.1;
      setCropArea({
        x: displayedWidth * margin,
        y: displayedHeight * margin,
        width: displayedWidth * (1 - 2 * margin),
        height: displayedHeight * (1 - 2 * margin),
      });
    }
  }, [imageLoaded]);

  // Handle mouse/touch move
  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (isDragging && dragStartRef.current) {
      const deltaX = clientX - dragStartRef.current.x;
      const deltaY = clientY - dragStartRef.current.y;
      
      let newX = dragStartRef.current.cropX + deltaX;
      let newY = dragStartRef.current.cropY + deltaY;
      
      // Clamp to image bounds
      newX = Math.max(0, Math.min(imageDimensions.width - cropArea.width, newX));
      newY = Math.max(0, Math.min(imageDimensions.height - cropArea.height, newY));
      
      setCropArea(prev => ({ ...prev, x: newX, y: newY }));
    }
    
    if (isResizing && resizeStartRef.current && resizeHandle) {
      const deltaX = clientX - resizeStartRef.current.x;
      const deltaY = clientY - resizeStartRef.current.y;
      const startCrop = resizeStartRef.current.crop;
      
      let newCrop = { ...startCrop };
      const minSize = 50;
      
      // Handle resize based on which handle is being dragged
      switch (resizeHandle) {
        case 'nw':
          newCrop.x = Math.max(0, Math.min(startCrop.x + startCrop.width - minSize, startCrop.x + deltaX));
          newCrop.y = Math.max(0, Math.min(startCrop.y + startCrop.height - minSize, startCrop.y + deltaY));
          newCrop.width = startCrop.width - (newCrop.x - startCrop.x);
          newCrop.height = startCrop.height - (newCrop.y - startCrop.y);
          break;
        case 'ne':
          newCrop.y = Math.max(0, Math.min(startCrop.y + startCrop.height - minSize, startCrop.y + deltaY));
          newCrop.width = Math.max(minSize, Math.min(imageDimensions.width - startCrop.x, startCrop.width + deltaX));
          newCrop.height = startCrop.height - (newCrop.y - startCrop.y);
          break;
        case 'sw':
          newCrop.x = Math.max(0, Math.min(startCrop.x + startCrop.width - minSize, startCrop.x + deltaX));
          newCrop.width = startCrop.width - (newCrop.x - startCrop.x);
          newCrop.height = Math.max(minSize, Math.min(imageDimensions.height - startCrop.y, startCrop.height + deltaY));
          break;
        case 'se':
          newCrop.width = Math.max(minSize, Math.min(imageDimensions.width - startCrop.x, startCrop.width + deltaX));
          newCrop.height = Math.max(minSize, Math.min(imageDimensions.height - startCrop.y, startCrop.height + deltaY));
          break;
        case 'n':
          newCrop.y = Math.max(0, Math.min(startCrop.y + startCrop.height - minSize, startCrop.y + deltaY));
          newCrop.height = startCrop.height - (newCrop.y - startCrop.y);
          break;
        case 's':
          newCrop.height = Math.max(minSize, Math.min(imageDimensions.height - startCrop.y, startCrop.height + deltaY));
          break;
        case 'w':
          newCrop.x = Math.max(0, Math.min(startCrop.x + startCrop.width - minSize, startCrop.x + deltaX));
          newCrop.width = startCrop.width - (newCrop.x - startCrop.x);
          break;
        case 'e':
          newCrop.width = Math.max(minSize, Math.min(imageDimensions.width - startCrop.x, startCrop.width + deltaX));
          break;
      }
      
      setCropArea(newCrop);
    }
  }, [isDragging, isResizing, resizeHandle, imageDimensions, cropArea.width, cropArea.height]);

  const handleEnd = useCallback(() => {
    // Save to history when drag/resize ends (if there was a change)
    if ((isDragging || isResizing) && pendingHistoryRef.current) {
      setCropHistory(prev => [...prev, pendingHistoryRef.current!]);
      pendingHistoryRef.current = null;
    }
    
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
    dragStartRef.current = null;
    resizeStartRef.current = null;
  }, [isDragging, isResizing]);

  // Mouse event handlers
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    handleMove(e.clientX, e.clientY);
  }, [handleMove]);

  const handleMouseUp = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  // Touch event handlers
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      handleMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, [handleMove]);

  const handleTouchEnd = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  // Start dragging the crop area
  const startDrag = useCallback((clientX: number, clientY: number) => {
    // Save current state for potential undo
    pendingHistoryRef.current = { ...cropArea };
    
    setIsDragging(true);
    dragStartRef.current = {
      x: clientX,
      y: clientY,
      cropX: cropArea.x,
      cropY: cropArea.y,
    };
  }, [cropArea]);

  // Start resizing
  const startResize = useCallback((handle: ResizeHandle, clientX: number, clientY: number) => {
    // Save current state for potential undo
    pendingHistoryRef.current = { ...cropArea };
    
    setIsResizing(true);
    setResizeHandle(handle);
    resizeStartRef.current = {
      x: clientX,
      y: clientY,
      crop: { ...cropArea },
    };
  }, [cropArea]);

  // Undo last change
  const handleUndo = useCallback(() => {
    if (cropHistory.length === 0) return;
    
    const previousState = cropHistory[cropHistory.length - 1];
    setCropHistory(prev => prev.slice(0, -1));
    setCropArea(previousState);
  }, [cropHistory]);

  // Apply crop and generate cropped image
  const handleApplyCrop = useCallback(async () => {
    if (!imageRef.current || isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      const img = imageRef.current;
      
      // Calculate scale between displayed image and natural image size
      const scaleX = img.naturalWidth / imageDimensions.width;
      const scaleY = img.naturalHeight / imageDimensions.height;
      
      // Calculate crop coordinates in natural image space
      const naturalCropX = cropArea.x * scaleX;
      const naturalCropY = cropArea.y * scaleY;
      const naturalCropWidth = cropArea.width * scaleX;
      const naturalCropHeight = cropArea.height * scaleY;
      
      // Create canvas for cropping
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');
      
      // Handle rotation
      const radians = (rotation * Math.PI) / 180;
      const sin = Math.abs(Math.sin(radians));
      const cos = Math.abs(Math.cos(radians));
      
      // Calculate output dimensions after rotation
      const outputWidth = Math.ceil(naturalCropWidth * cos + naturalCropHeight * sin);
      const outputHeight = Math.ceil(naturalCropWidth * sin + naturalCropHeight * cos);
      
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      
      // Move to center, rotate, then draw cropped portion
      ctx.translate(outputWidth / 2, outputHeight / 2);
      ctx.rotate(radians);
      
      // Draw the cropped portion of the image
      ctx.drawImage(
        img,
        naturalCropX,
        naturalCropY,
        naturalCropWidth,
        naturalCropHeight,
        -naturalCropWidth / 2,
        -naturalCropHeight / 2,
        naturalCropWidth,
        naturalCropHeight
      );
      
      // Convert to blob
      canvas.toBlob((blob) => {
        if (blob) {
          onCropComplete(blob);
        }
        setIsProcessing(false);
      }, 'image/png');
      
    } catch (err) {
      console.error('Failed to crop image:', err);
      setIsProcessing(false);
    }
  }, [imageDimensions, cropArea, rotation, onCropComplete, isProcessing]);

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
  }, []);

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black/95 flex flex-col"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/50">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onCancel}
            className="text-white hover:bg-white/20"
          >
            <X className="h-6 w-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleUndo}
            disabled={cropHistory.length === 0}
            className={cn(
              "text-white hover:bg-white/20",
              cropHistory.length === 0 && "opacity-40"
            )}
            title="Отменить"
          >
            <Undo2 className="h-5 w-5" />
          </Button>
          {cropHistory.length > 0 && (
            <span className="text-white/60 text-xs">{cropHistory.length}</span>
          )}
        </div>
        <span className="text-white font-medium">Обрезка</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleApplyCrop}
          disabled={isProcessing}
          className="text-white hover:bg-white/20"
        >
          {isProcessing ? (
            <div className="h-6 w-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Check className="h-6 w-6" />
          )}
        </Button>
      </div>

      {/* Image container */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden p-4">
        <img
          ref={imageRef}
          src={imageSrc.replace(/^http:\/\//i, 'https://')}
          alt={imageAlt}
          className="max-w-full max-h-full object-contain"
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
          onLoad={handleImageLoad}
          draggable={false}
        />
        
        {/* Crop overlay */}
        {imageLoaded && (
          <div 
            className="absolute pointer-events-none"
            style={{
              left: imagePosition.x,
              top: imagePosition.y,
              width: imageDimensions.width,
              height: imageDimensions.height,
            }}
          >
            {/* Dark overlay outside crop area */}
            <div className="absolute inset-0">
              {/* Top */}
              <div 
                className="absolute left-0 right-0 top-0 bg-black/60"
                style={{ height: cropArea.y }}
              />
              {/* Bottom */}
              <div 
                className="absolute left-0 right-0 bottom-0 bg-black/60"
                style={{ height: imageDimensions.height - cropArea.y - cropArea.height }}
              />
              {/* Left */}
              <div 
                className="absolute left-0 bg-black/60"
                style={{ 
                  top: cropArea.y, 
                  width: cropArea.x,
                  height: cropArea.height 
                }}
              />
              {/* Right */}
              <div 
                className="absolute right-0 bg-black/60"
                style={{ 
                  top: cropArea.y, 
                  width: imageDimensions.width - cropArea.x - cropArea.width,
                  height: cropArea.height 
                }}
              />
            </div>

            {/* Crop area border and handles */}
            <div
              className="absolute border-2 border-white pointer-events-auto cursor-move"
              style={{
                left: cropArea.x,
                top: cropArea.y,
                width: cropArea.width,
                height: cropArea.height,
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                startDrag(e.clientX, e.clientY);
              }}
              onTouchStart={(e) => {
                if (e.touches.length === 1) {
                  e.stopPropagation();
                  startDrag(e.touches[0].clientX, e.touches[0].clientY);
                }
              }}
            >
              {/* Grid lines */}
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="border border-white/30" />
                ))}
              </div>
              
              {/* Move indicator in center */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/50 rounded-full p-2">
                <Move className="h-5 w-5 text-white" />
              </div>

              {/* Resize handles */}
              {/* Corners */}
              {(['nw', 'ne', 'sw', 'se'] as ResizeHandle[]).map((handle) => (
                <div
                  key={handle}
                  className={cn(
                    "absolute w-6 h-6 bg-white rounded-full pointer-events-auto touch-none",
                    handle === 'nw' && "-top-3 -left-3 cursor-nw-resize",
                    handle === 'ne' && "-top-3 -right-3 cursor-ne-resize",
                    handle === 'sw' && "-bottom-3 -left-3 cursor-sw-resize",
                    handle === 'se' && "-bottom-3 -right-3 cursor-se-resize"
                  )}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    startResize(handle, e.clientX, e.clientY);
                  }}
                  onTouchStart={(e) => {
                    if (e.touches.length === 1) {
                      e.stopPropagation();
                      startResize(handle, e.touches[0].clientX, e.touches[0].clientY);
                    }
                  }}
                />
              ))}
              
              {/* Edge handles */}
              {/* Top */}
              <div
                className="absolute -top-2 left-1/2 -translate-x-1/2 w-10 h-4 bg-white rounded-full cursor-n-resize pointer-events-auto touch-none"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  startResize('n', e.clientX, e.clientY);
                }}
                onTouchStart={(e) => {
                  if (e.touches.length === 1) {
                    e.stopPropagation();
                    startResize('n', e.touches[0].clientX, e.touches[0].clientY);
                  }
                }}
              />
              {/* Bottom */}
              <div
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-10 h-4 bg-white rounded-full cursor-s-resize pointer-events-auto touch-none"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  startResize('s', e.clientX, e.clientY);
                }}
                onTouchStart={(e) => {
                  if (e.touches.length === 1) {
                    e.stopPropagation();
                    startResize('s', e.touches[0].clientX, e.touches[0].clientY);
                  }
                }}
              />
              {/* Left */}
              <div
                className="absolute top-1/2 -left-2 -translate-y-1/2 w-4 h-10 bg-white rounded-full cursor-w-resize pointer-events-auto touch-none"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  startResize('w', e.clientX, e.clientY);
                }}
                onTouchStart={(e) => {
                  if (e.touches.length === 1) {
                    e.stopPropagation();
                    startResize('w', e.touches[0].clientX, e.touches[0].clientY);
                  }
                }}
              />
              {/* Right */}
              <div
                className="absolute top-1/2 -right-2 -translate-y-1/2 w-4 h-10 bg-white rounded-full cursor-e-resize pointer-events-auto touch-none"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  startResize('e', e.clientX, e.clientY);
                }}
                onTouchStart={(e) => {
                  if (e.touches.length === 1) {
                    e.stopPropagation();
                    startResize('e', e.touches[0].clientX, e.touches[0].clientY);
                  }
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="p-4 text-center text-white/60 text-sm">
        Перетащите углы или стороны для изменения области обрезки
      </div>
    </div>
  );
});

ImageCropOverlay.displayName = 'ImageCropOverlay';
