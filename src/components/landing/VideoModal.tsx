import { Dialog, DialogContent } from '@/components/ui/dialog';

interface VideoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function VideoModal({ open, onOpenChange }: VideoModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] p-0">
        <div className="aspect-video bg-black rounded-lg overflow-hidden">
          <div className="w-full h-full flex items-center justify-center text-white">
            <div className="text-center p-8">
              <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </div>
              <p className="text-lg mb-2">Демо-видео Академиус</p>
              <p className="text-sm text-white/70">2 минуты обзора возможностей</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}