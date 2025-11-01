import { useState, useEffect } from 'react';
import { X, Maximize2, Minimize2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';

interface AppViewerProps {
  appId: string;
  previewUrl: string;
  open: boolean;
  onClose: () => void;
  teacherId?: string;
}

export const AppViewer = ({ appId, previewUrl, open, onClose, teacherId }: AppViewerProps) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (open && teacherId && appId) {
      supabase.functions.invoke('manage-app', {
        body: { action: 'usage', app_id: appId, teacher_id: teacherId }
      }).catch(console.error);
    }
  }, [open, appId, teacherId]);

  useEffect(() => {
    if (!open || !previewUrl) {
      setHtmlContent(null);
      setLoadError(null);
      return;
    }

    let aborted = false;
    setIsLoading(true);
    setLoadError(null);

    fetch(previewUrl, { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Failed to fetch preview: ${res.status}`);
        const txt = await res.text();
        if (!aborted) setHtmlContent(txt);
      })
      .catch((err) => {
        console.error('Failed to fetch app HTML:', err);
        if (!aborted) {
          setHtmlContent(null);
          setLoadError(err.message || 'Failed to load content');
        }
      })
      .finally(() => {
        if (!aborted) setIsLoading(false);
      });

    return () => { aborted = true; };
  }, [open, previewUrl, appId]);

  const iframeKey = `${appId}-${htmlContent ? 'doc' : 'url'}`;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={isFullscreen ? "max-w-full h-screen m-0 p-0" : "max-w-6xl h-[90vh] p-0"}>
          <div className="absolute top-1 right-1 z-50 flex gap-0.5 bg-background/80 backdrop-blur-sm rounded-md p-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsFullscreen(!isFullscreen)}
              aria-label={isFullscreen ? "Свернуть" : "Во весь экран"}
            >
              {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onClose}
              aria-label="Закрыть"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

        {isLoading && (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Загрузка приложения…
          </div>
        )}

        {!isLoading && (
          <iframe
            key={iframeKey}
            src={htmlContent ? undefined : previewUrl}
            srcDoc={htmlContent || undefined}
            className="w-full h-full border-0 bg-white"
            sandbox="allow-scripts allow-same-origin allow-popups"
            referrerPolicy="no-referrer"
            title="App Preview"
          />
        )}

        {!isLoading && loadError && (
          <div className="absolute bottom-2 left-4 right-4 text-xs text-muted-foreground">
            Не удалось загрузить через srcDoc, показываем прямую ссылку. Ошибка: {loadError}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
