import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import OptimizedImage from '@/components/OptimizedImage';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useEmblaCarousel from 'embla-carousel-react';
import { normalizeBranchName } from '@/lib/branchNameMap';

interface BranchPhoto {
  id: string;
  image_url: string;
  is_main: boolean;
  sort_order: number;
}

interface BranchPhotoCarouselProps {
  branchId: string;
}

export function BranchPhotoCarousel({ branchId }: BranchPhotoCarouselProps) {
  const [photos, setPhotos] = useState<BranchPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: false, 
    align: 'start',
    slidesToScroll: 1,
    containScroll: 'trimSnaps'
  });

  useEffect(() => {
    fetchPhotos();
  }, [branchId]);

  const fetchPhotos = async () => {
    try {
      const normalizedName = normalizeBranchName(branchId);
      console.log(`[BranchPhotoCarousel] Fetching photos for branch: "${branchId}" (normalized: "${normalizedName}")`);
      
      const { data: branchData, error: branchError } = await supabase
        .from('organization_branches')
        .select('id, name')
        .ilike('name', `%${normalizedName}%`)
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (branchError) {
        console.error(`[BranchPhotoCarousel] Error fetching branch data:`, branchError);
        setIsLoading(false);
        return;
      }

      if (!branchData || branchData.length === 0) {
        console.warn(`[BranchPhotoCarousel] No branch found for: "${branchId}" (normalized: "${normalizedName}")`);
        setIsLoading(false);
        return;
      }

      console.log(`[BranchPhotoCarousel] Found ${branchData.length} branch(es):`, branchData.map(b => ({ id: b.id, name: b.name })));

      let foundPhotos: BranchPhoto[] = [];
      for (const branch of branchData) {
        const { data, error } = await supabase
          .from('branch_photos')
          .select('*')
          .eq('branch_id', branch.id)
          .order('sort_order', { ascending: true });

        if (error) {
          console.error(`[BranchPhotoCarousel] Error fetching photos for branch_id ${branch.id}:`, error);
          continue;
        }
        
        console.log(`[BranchPhotoCarousel] Branch "${branch.name}" (${branch.id}): ${data?.length || 0} photo(s) found`);
        
        if (data && data.length > 0) {
          console.log(`[BranchPhotoCarousel] Photos URLs:`, data.map(p => ({ url: p.image_url, is_main: p.is_main, sort: p.sort_order })));
          foundPhotos = data;
          break;
        }
      }

      if (foundPhotos.length === 0) {
        console.warn(`[BranchPhotoCarousel] No photos found for any branch: "${branchId}"`);
      }

      setPhotos(foundPhotos);
    } catch (error) {
      console.error('[BranchPhotoCarousel] Unexpected error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

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
      <div className="h-64 bg-muted animate-pulse rounded-lg relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
        <div className="absolute bottom-2 left-2 text-xs text-muted-foreground opacity-50">
          Загрузка карусели фото...
        </div>
      </div>
    );
  }

  if (photos.length === 0) {
    console.warn(`[BranchPhotoCarousel] No photos to display for: ${branchId}`);
    return (
      <div className="h-64 bg-muted/30 rounded-lg flex items-center justify-center border-2 border-dashed border-muted">
        <div className="text-center text-muted-foreground p-4">
          <div className="text-sm">Фотогалерея филиала скоро появится</div>
          <div className="text-xs mt-1 opacity-70">{branchId}</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="relative">
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex gap-4">
            {photos.map((photo, index) => (
              <div
                key={photo.id}
                className="flex-[0_0_calc(25%-12px)] min-w-0 md:flex-[0_0_calc(20%-13px)]"
              >
                <div
                  className="aspect-[4/3] overflow-hidden rounded-lg cursor-pointer hover:opacity-90 transition-opacity relative group"
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
              </div>
            ))}
          </div>
        </div>

        {/* Navigation Buttons */}
        {photos.length > 4 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white shadow-lg"
              onClick={scrollPrev}
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white shadow-lg"
              onClick={scrollNext}
            >
              <ChevronRight className="w-6 h-6" />
            </Button>
          </>
        )}
      </div>

      {/* Fullscreen Dialog */}
      <Dialog open={selectedIndex !== null} onOpenChange={() => setSelectedIndex(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/90">
          <div className="relative w-full h-full flex items-center justify-center">
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
