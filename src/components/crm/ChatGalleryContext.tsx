import { createContext, useContext, useState, useCallback, ReactNode, useMemo } from 'react';
import { ImageLightbox, GalleryImage } from './ImageLightbox';

interface ChatGalleryContextValue {
  /** Register an image to the gallery */
  registerImage: (id: string, image: GalleryImage) => void;
  /** Unregister an image from the gallery */
  unregisterImage: (id: string) => void;
  /** Open the gallery at a specific image */
  openGallery: (imageId: string) => void;
  /** Close the gallery */
  closeGallery: () => void;
}

const ChatGalleryContext = createContext<ChatGalleryContextValue | null>(null);

interface ChatGalleryProviderProps {
  children: ReactNode;
  onDownload?: (src: string) => Promise<void>;
}

/**
 * Provider that manages a gallery of all images in the chat.
 * Images register themselves when mounted and unregister when unmounted.
 * This allows swiping between all images in the chat.
 */
export function ChatGalleryProvider({ children, onDownload }: ChatGalleryProviderProps) {
  const [images, setImages] = useState<Map<string, GalleryImage>>(new Map());
  const [isOpen, setIsOpen] = useState(false);
  const [currentImageId, setCurrentImageId] = useState<string | null>(null);
  const [downloadLoading, setDownloadLoading] = useState(false);

  const registerImage = useCallback((id: string, image: GalleryImage) => {
    setImages(prev => {
      const next = new Map(prev);
      next.set(id, image);
      return next;
    });
  }, []);

  const unregisterImage = useCallback((id: string) => {
    setImages(prev => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const openGallery = useCallback((imageId: string) => {
    setCurrentImageId(imageId);
    setIsOpen(true);
  }, []);

  const closeGallery = useCallback(() => {
    setIsOpen(false);
    setCurrentImageId(null);
  }, []);

  // Convert map to array, maintaining insertion order (chronological in chat)
  const galleryImages = useMemo(() => Array.from(images.values()), [images]);
  const imageIds = useMemo(() => Array.from(images.keys()), [images]);
  
  const currentIndex = currentImageId ? imageIds.indexOf(currentImageId) : 0;

  const handleDownload = useCallback(async (src: string) => {
    if (!onDownload) return;
    setDownloadLoading(true);
    try {
      await onDownload(src);
    } finally {
      setDownloadLoading(false);
    }
  }, [onDownload]);

  const contextValue = useMemo<ChatGalleryContextValue>(() => ({
    registerImage,
    unregisterImage,
    openGallery,
    closeGallery,
  }), [registerImage, unregisterImage, openGallery, closeGallery]);

  return (
    <ChatGalleryContext.Provider value={contextValue}>
      {children}
      {galleryImages.length > 0 && (
        <ImageLightbox
          images={galleryImages}
          initialIndex={currentIndex >= 0 ? currentIndex : 0}
          isOpen={isOpen}
          onClose={closeGallery}
          onDownload={onDownload ? handleDownload : undefined}
          downloadLoading={downloadLoading}
        />
      )}
    </ChatGalleryContext.Provider>
  );
}

/**
 * Hook to access the chat gallery context.
 * Returns null if used outside of ChatGalleryProvider.
 */
export function useChatGallery() {
  return useContext(ChatGalleryContext);
}
