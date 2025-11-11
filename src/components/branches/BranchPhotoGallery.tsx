import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import OptimizedImage from '@/components/OptimizedImage';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { normalizeBranchName } from '@/lib/branchNameMap';

interface BranchPhoto {
  id: string;
  image_url: string;
  is_main: boolean;
  sort_order: number;
}

interface BranchPhotoGalleryProps {
  branchId: string;
  showMainOnly?: boolean;
}

export function BranchPhotoGallery({ branchId, showMainOnly = false }: BranchPhotoGalleryProps) {
  const [photos, setPhotos] = useState<BranchPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    fetchPhotos();
  }, [branchId]);

  const fetchPhotos = async () => {
    try {
      // Use limit(1) to handle potential duplicates
      const { data: branchData } = await supabase
        .from('organization_branches')
        .select('id')
        .eq('name', normalizeBranchName(branchId))
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1);

      if (!branchData || branchData.length === 0) {
        setIsLoading(false);
        return;
      }

      let query = supabase
        .from('branch_photos')
        .select('*')
        .eq('branch_id', branchData[0].id);

      if (showMainOnly) {
        query = query.eq('is_main', true);
      }

      query = query.order('sort_order', { ascending: true });

      const { data, error } = await query;

      if (error) throw error;
      setPhotos(data || []);
    } catch (error) {
      console.error('Error fetching branch photos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrevious = () => {
    if (selectedIndex !== null && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
  };

  const handleNext = () => {
    if (selectedIndex !== null && selectedIndex < photos.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  };

  if (isLoading) {
    return (
      <div className="aspect-[16/9] bg-muted animate-pulse rounded-lg" />
    );
  }

  if (photos.length === 0) {
    return null;
  }

  if (showMainOnly && photos.length > 0) {
    return (
      <div className="aspect-[16/9] overflow-hidden rounded-lg">
        <OptimizedImage
          src={photos[0].image_url}
          alt="Фото филиала"
          className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
          loading="eager"
          priority
          onClick={() => setSelectedIndex(0)}
        />
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            className="aspect-square overflow-hidden rounded-lg cursor-pointer hover:opacity-90 transition-opacity relative group"
            onClick={() => setSelectedIndex(index)}
          >
            <OptimizedImage
              src={photo.image_url}
              alt={`Фото филиала ${index + 1}`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {photo.is_main && (
              <div className="absolute top-2 right-2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-semibold">
                Главное
              </div>
            )}
          </div>
        ))}
      </div>

      <Dialog open={selectedIndex !== null} onOpenChange={() => setSelectedIndex(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/90">
          <div className="relative w-full h-full flex items-center justify-center">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-50 text-white hover:bg-white/20"
              onClick={() => setSelectedIndex(null)}
            >
              <X className="w-6 h-6" />
            </Button>

            {selectedIndex !== null && (
              <>
                {selectedIndex > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-4 z-50 text-white hover:bg-white/20"
                    onClick={handlePrevious}
                  >
                    <ChevronLeft className="w-8 h-8" />
                  </Button>
                )}

                <img
                  src={photos[selectedIndex].image_url}
                  alt={`Фото филиала ${selectedIndex + 1}`}
                  className="max-w-full max-h-[95vh] object-contain"
                />

                {selectedIndex < photos.length - 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-4 z-50 text-white hover:bg-white/20"
                    onClick={handleNext}
                  >
                    <ChevronRight className="w-8 h-8" />
                  </Button>
                )}

                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-4 py-2 rounded">
                  {selectedIndex + 1} / {photos.length}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}