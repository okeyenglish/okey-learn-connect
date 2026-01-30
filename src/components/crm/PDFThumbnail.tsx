import { useEffect, useMemo, useState, useCallback } from "react";
import { FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  url: string;
  height?: number;
  className?: string;
  /** Called when thumbnail rendering fails (e.g. CORS / unsupported) */
  onError?: () => void;
};

// Cache name for PDF thumbnails
const PDF_THUMBNAIL_CACHE = 'chat-pdf-thumbnails-v1';

/**
 * Get cached PDF thumbnail data URL
 */
async function getCachedThumbnail(url: string): Promise<string | null> {
  try {
    if (!('caches' in window)) return null;
    const cache = await caches.open(PDF_THUMBNAIL_CACHE);
    const response = await cache.match(url);
    if (response) {
      const text = await response.text();
      return text;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Cache PDF thumbnail data URL
 */
async function cacheThumbnail(url: string, dataUrl: string): Promise<void> {
  try {
    if (!('caches' in window)) return;
    const cache = await caches.open(PDF_THUMBNAIL_CACHE);
    const response = new Response(dataUrl, {
      headers: {
        'Content-Type': 'text/plain',
        'X-Cached-At': Date.now().toString(),
      },
    });
    await cache.put(url, response);
    console.log('[PDFThumbnail] Cached thumbnail for:', url.substring(0, 50));
  } catch (error) {
    console.warn('[PDFThumbnail] Failed to cache thumbnail:', error);
  }
}

/**
 * Renders the first page of a PDF into an <img> thumbnail using pdf.js.
 * This avoids relying on <iframe>/<object> PDF viewers which are unreliable on mobile.
 * Thumbnails are cached for offline access.
 */
export function PDFThumbnail({ url, height = 170, className, onError }: Props) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const normalizedUrl = useMemo(() => url?.replace(/^http:\/\//i, "https://"), [url]);

  const renderThumbnail = useCallback(async (
    pdfData: ArrayBuffer,
    targetHeight: number
  ): Promise<string> => {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const doc = await (pdfjs as any).getDocument({ data: pdfData, disableWorker: true }).promise;
    const page = await doc.getPage(1);

    const unscaledViewport = page.getViewport({ scale: 1 });
    const scale = targetHeight / Math.max(1, unscaledViewport.height);
    const viewport = page.getViewport({ scale });

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");

    canvas.width = Math.floor(viewport.width * dpr);
    canvas.height = Math.floor(viewport.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    return canvas.toDataURL("image/jpeg", 0.88);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function run() {
      setLoading(true);
      setFailed(false);
      setDataUrl(null);

      if (!normalizedUrl) {
        setLoading(false);
        setFailed(true);
        return;
      }

      try {
        // Check cache first
        const cachedDataUrl = await getCachedThumbnail(normalizedUrl);
        if (cachedDataUrl) {
          console.log('[PDFThumbnail] Cache hit:', normalizedUrl.substring(0, 50));
          if (!cancelled) {
            setDataUrl(cachedDataUrl);
            setLoading(false);
          }
          return;
        }

        // Fetch PDF and render thumbnail
        const res = await fetch(normalizedUrl, {
          signal: controller.signal,
          credentials: "omit",
        });
        if (!res.ok) throw new Error(`PDF fetch failed: ${res.status}`);
        const data = await res.arrayBuffer();

        const out = await renderThumbnail(data, height);

        if (!cancelled) {
          setDataUrl(out);
          // Cache the thumbnail for offline access
          cacheThumbnail(normalizedUrl, out);
        }
      } catch (e) {
        if (!cancelled) {
          setFailed(true);
          onError?.();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [normalizedUrl, height, onError, renderThumbnail]);

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden",
        className
      )}
      style={{ height }}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {dataUrl && (
        <img
          src={dataUrl}
          alt="PDF preview"
          className="h-full w-full object-cover"
          loading="lazy"
          draggable={false}
        />
      )}

      {!loading && (failed || !dataUrl) && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <FileText className="h-14 w-14 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

/**
 * Clear all PDF thumbnail cache
 */
export async function clearPDFThumbnailCache(): Promise<void> {
  try {
    if ('caches' in window) {
      await caches.delete(PDF_THUMBNAIL_CACHE);
      console.log('[PDFThumbnail] Cache cleared');
    }
  } catch (error) {
    console.warn('[PDFThumbnail] Failed to clear cache:', error);
  }
}

/**
 * Check if PDF thumbnail is cached
 */
export async function isPDFThumbnailCached(url: string): Promise<boolean> {
  const cached = await getCachedThumbnail(url);
  return cached !== null;
}
