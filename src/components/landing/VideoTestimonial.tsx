import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Play } from 'lucide-react';
import { useState } from 'react';

interface VideoTestimonialProps {
  videoUrl: string;
  thumbnail: string;
  name: string;
  role: string;
}

export default function VideoTestimonial({ videoUrl, thumbnail, name, role }: VideoTestimonialProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div 
        onClick={() => setOpen(true)}
        className="relative cursor-pointer group overflow-hidden rounded-lg"
      >
        <img 
          src={thumbnail} 
          alt={`${name} video testimonial`}
          className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity group-hover:bg-black/50">
          <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center transition-transform group-hover:scale-110">
            <Play className="w-8 h-8 text-primary-foreground ml-1" fill="currentColor" />
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent text-white">
          <p className="font-semibold">{name}</p>
          <p className="text-sm opacity-90">{role}</p>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[800px] p-0">
          <div className="aspect-video">
            <iframe
              src={videoUrl}
              className="w-full h-full rounded-lg"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
