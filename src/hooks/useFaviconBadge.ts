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
    const loadAndDrawFavicon = () => {
      if (!originalImageRef.current) {
        originalImageRef.current = new Image();
        originalImageRef.current.crossOrigin = 'anonymous';
        originalImageRef.current.src = ORIGINAL_FAVICON;
      }

      const img = originalImageRef.current;

      const draw = () => {
        // Clear canvas
        ctx.clearRect(0, 0, FAVICON_SIZE, FAVICON_SIZE);

        // Draw original favicon
        ctx.drawImage(img, 0, 0, FAVICON_SIZE, FAVICON_SIZE);

        // Draw badge if there are unread messages
        if (unreadCount > 0) {
          const displayCount = unreadCount > 99 ? '99+' : String(unreadCount);
          
          // Badge background (red circle)
          const badgeX = FAVICON_SIZE - BADGE_SIZE / 2 - 1;
          const badgeY = BADGE_SIZE / 2 + 1;
          const badgeRadius = BADGE_SIZE / 2;

          // Draw shadow for better visibility
          ctx.beginPath();
          ctx.arc(badgeX, badgeY, badgeRadius + 1, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
          ctx.fill();

          // Draw red circle
          ctx.beginPath();
          ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
          ctx.fillStyle = '#ef4444'; // Tailwind red-500
          ctx.fill();

          // Draw white border
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Draw count text
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          // Adjust font size based on text length
          const fontSize = displayCount.length > 2 ? 6 : displayCount.length > 1 ? 7 : 9;
          ctx.font = `bold ${fontSize}px Arial, sans-serif`;
          
          ctx.fillText(displayCount, badgeX, badgeY + 0.5);
        }

        // Update favicon
        if (linkRef.current) {
          linkRef.current.href = canvas.toDataURL('image/png');
        }
      };

      if (img.complete) {
        draw();
      } else {
        img.onload = draw;
        img.onerror = () => {
          // If favicon fails to load, just draw the badge on white background
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, FAVICON_SIZE, FAVICON_SIZE);
          
          if (unreadCount > 0) {
            const displayCount = unreadCount > 99 ? '99+' : String(unreadCount);
            const badgeX = FAVICON_SIZE / 2;
            const badgeY = FAVICON_SIZE / 2;
            const badgeRadius = FAVICON_SIZE / 2 - 2;

            ctx.beginPath();
            ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
            ctx.fillStyle = '#ef4444';
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = 'bold 14px Arial, sans-serif';
            ctx.fillText(displayCount, badgeX, badgeY);
          }

          if (linkRef.current) {
            linkRef.current.href = canvas.toDataURL('image/png');
          }
        };
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
