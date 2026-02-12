import { useEffect, useRef } from 'react';

const FAVICON_SIZE = 32;
const BADGE_SIZE = 14;
const ORIGINAL_FAVICON = '/favicon.png';

/**
 * Hook to display a badge with unread count on the favicon
 * Shows a red circle with number when there are unread messages
 */
export const useFaviconBadge = (unreadCount: number) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  const linkRef = useRef<HTMLLinkElement | null>(null);

  useEffect(() => {
    // Get or create canvas
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
      canvasRef.current.width = FAVICON_SIZE;
      canvasRef.current.height = FAVICON_SIZE;
    }

    // Get existing favicon link or create one
    if (!linkRef.current) {
      linkRef.current = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
      if (!linkRef.current) {
        linkRef.current = document.createElement('link');
        linkRef.current.rel = 'icon';
        linkRef.current.type = 'image/png';
        document.head.appendChild(linkRef.current);
      }
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Load original favicon
    const drawBadge = (img: HTMLImageElement | null) => {
      ctx.clearRect(0, 0, FAVICON_SIZE, FAVICON_SIZE);

      if (img && img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, 0, 0, FAVICON_SIZE, FAVICON_SIZE);
      } else {
        // Fallback: white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, FAVICON_SIZE, FAVICON_SIZE);
      }

      if (unreadCount > 0) {
        const displayCount = unreadCount > 99 ? '99+' : String(unreadCount);
        const badgeX = FAVICON_SIZE - BADGE_SIZE / 2 - 1;
        const badgeY = BADGE_SIZE / 2 + 1;
        const badgeRadius = BADGE_SIZE / 2;

        ctx.beginPath();
        ctx.arc(badgeX, badgeY, badgeRadius + 1, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#ef4444';
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const fontSize = displayCount.length > 2 ? 6 : displayCount.length > 1 ? 7 : 9;
        ctx.font = `bold ${fontSize}px Arial, sans-serif`;
        ctx.fillText(displayCount, badgeX, badgeY + 0.5);
      }

      if (linkRef.current) {
        linkRef.current.href = canvas.toDataURL('image/png');
      }
    };

    const loadAndDrawFavicon = () => {
      if (!originalImageRef.current) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          originalImageRef.current = img;
          drawBadge(img);
        };
        img.onerror = () => {
          originalImageRef.current = null;
          drawBadge(null);
        };
        img.src = ORIGINAL_FAVICON;
      } else {
        drawBadge(originalImageRef.current);
      }
    };

    loadAndDrawFavicon();

    // Cleanup - restore original favicon on unmount
    return () => {
      if (linkRef.current) {
        linkRef.current.href = ORIGINAL_FAVICON;
      }
    };
  }, [unreadCount]);
};

export default useFaviconBadge;
