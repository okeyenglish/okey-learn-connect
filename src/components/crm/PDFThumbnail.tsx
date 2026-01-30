import { useEffect, useMemo, useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  url: string;
  height?: number;
  className?: string;
  /** Called when thumbnail rendering fails (e.g. CORS / unsupported) */
  onError?: () => void;
};

/**
 * Renders the first page of a PDF into an <img> thumbnail using pdf.js.
 * This avoids relying on <iframe>/<object> PDF viewers which are unreliable on mobile.
 */
export function PDFThumbnail({ url, height = 170, className, onError }: Props) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const normalizedUrl = useMemo(() => url?.replace(/^http:\/\//i, "https://"), [url]);

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
        // pdfjs-dist is heavy; keep it lazy-ish by importing inside effect.
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

        // Fetch ourselves so we can pass ArrayBuffer to pdf.js
        const res = await fetch(normalizedUrl, {
          signal: controller.signal,
          credentials: "omit",
        });
        if (!res.ok) throw new Error(`PDF fetch failed: ${res.status}`);
        const data = await res.arrayBuffer();

        // disableWorker keeps it simple & avoids worker bundling issues in some mobile browsers.
        const doc = await (pdfjs as any).getDocument({ data, disableWorker: true }).promise;
        const page = await doc.getPage(1);

        // Target ~height, keep aspect ratio.
        const unscaledViewport = page.getViewport({ scale: 1 });
        const scale = height / Math.max(1, unscaledViewport.height);
        const viewport = page.getViewport({ scale });

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas 2D context unavailable");

        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
        const out = canvas.toDataURL("image/jpeg", 0.88);

        if (!cancelled) setDataUrl(out);
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
  }, [normalizedUrl, height, onError]);

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
