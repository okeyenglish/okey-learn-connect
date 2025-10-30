import { useState, useEffect } from 'react';
import { X, Maximize2, Minimize2 } from 'lucide-react';
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

  useEffect(() => {
    if (open && teacherId && appId) {
      // Track usage
      supabase.functions.invoke('manage-app', {
        body: { action: 'usage', app_id: appId, teacher_id: teacherId }
      }).catch(console.error);
    }
  }, [open, appId, teacherId]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={isFullscreen ? "max-w-full h-screen m-0 p-0" : "max-w-6xl h-[90vh] p-0"}>
        <div className="flex items-center justify-between p-4 border-b bg-background">
          <h3 className="font-semibold">Предпросмотр приложения</h3>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <iframe
          src={previewUrl}
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin"
          referrerPolicy="no-referrer"
          title="App Preview"
        />
      </DialogContent>
    </Dialog>
  );
};
