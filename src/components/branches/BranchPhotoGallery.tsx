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
  fallbackImage?: string;
}

export function BranchPhotoGallery({ branchId, showMainOnly = false, fallbackImage }: BranchPhotoGalleryProps) {
  const [photos, setPhotos] = useState<BranchPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    fetchPhotos();
  }, [branchId]);

  const fetchPhotos = async () => {
    try {
      const normalizedName = normalizeBranchName(branchId);
      console.log(`[BranchPhotoGallery] Fetching photos for branch: "${branchId}" (normalized: "${normalizedName}", showMainOnly: ${showMainOnly})`);
      
      // Get all branches with this name to handle duplicates
      // Use ilike for case-insensitive search
      const { data: branchData, error: branchError } = await supabase
        .from('organization_branches')
        .select('id, name')
        .ilike('name', `%${normalizedName}%`)
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (branchError) {
        console.error(`[BranchPhotoGallery] Error fetching branch data:`, branchError);
        setIsLoading(false);
        return;
      }

      if (!branchData || branchData.length === 0) {
        console.warn(`[BranchPhotoGallery] No branch found for: "${branchId}" (normalized: "${normalizedName}")`);
        console.log(`[BranchPhotoGallery] Fallback image available: ${!!fallbackImage}`);
        setIsLoading(false);
        return;
      }

      console.log(`[BranchPhotoGallery] Found ${branchData.length} branch(es):`, branchData.map(b => ({ id: b.id, name: b.name })));

      // Try to find photos for any of the branch IDs (in case of duplicates)
      let allPhotos: BranchPhoto[] = [];
      
      for (const branch of branchData) {
        let query = supabase
          .from('branch_photos')
          .select('*')
          .eq('branch_id', branch.id);

        if (showMainOnly) {
          query = query.eq('is_main', true);
        }

        query = query.order('sort_order', { ascending: true });

        const { data, error } = await query;

        if (error) {
          console.error(`[BranchPhotoGallery] Error fetching photos for branch_id ${branch.id}:`, error);
          continue;
        }

        console.log(`[BranchPhotoGallery] Branch "${branch.name}" (${branch.id}): ${data?.length || 0} photo(s) found`);
        
        if (data && data.length > 0) {
          console.log(`[BranchPhotoGallery] Photos URLs:`, data.map(p => ({ url: p.image_url, is_main: p.is_main, sort: p.sort_order })));
          allPhotos = data;
          break; // Found photos, stop searching
        }
      }

      if (allPhotos.length === 0) {
        console.warn(`[BranchPhotoGallery] No photos found for any branch. Will use fallback: ${!!fallbackImage}`);
      }

      setPhotos(allPhotos);
    } catch (error) {
      console.error('[BranchPhotoGallery] Unexpected error:', error);
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
      <div className="relative aspect-[16/9] bg-muted animate-shimmer rounded-lg overflow-hidden" />
    );
  }

  if (photos.length === 0 && !fallbackImage) {
    console.warn(`[BranchPhotoGallery] No photos and no fallback for: ${branchId}`);
    return (
      <div className="relative aspect-[16/9] bg-muted/30 rounded-lg flex items-center justify-center border-2 border-dashed border-muted">
        <div className="text-center text-muted-foreground p-4">
          <div className="text-sm">Фото филиала скоро появится</div>
        </div>
      </div>
    );
  }

  // Show fallback image if no photos from database or if image error
  if ((photos.length === 0 || imageError) && fallbackImage && showMainOnly) {
    console.log(`[BranchPhotoGallery] Using fallback image for: ${branchId}`);
    return (
      <div className="relative aspect-[16/9] overflow-hidden rounded-lg">
        <OptimizedImage
          src={fallbackImage}
          alt="Фото филиала"
          className="w-full h-full object-cover"
          loading="eager"
          priority
          onError={() => setImageError(true)}
        />
      </div>
    );
  }

  if (showMainOnly && photos.length > 0) {
    return (
      <div className="relative aspect-[16/9] overflow-hidden rounded-lg">
        <OptimizedImage
          src={photos[0].image_url}
          alt="Фото филиала"
          className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
          loading="eager"
          priority
          onClick={() => setSelectedIndex(0)}
          onError={() => setImageError(true)}
        />
      </div>
    );
  }

  return (
    <>
      <div className="relative grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
              onError={() => console.warn('[BranchPhotoGallery] Image error:', photo.image_url)}
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