import React from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  loading?: 'lazy' | 'eager';
  priority?: boolean;
  sizes?: string;
  srcSet?: string;
  onClick?: () => void;
  onLoad?: () => void;
  onError?: () => void;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  className = '',
  loading = 'lazy',
  priority = false,
  sizes,
  srcSet,
  onClick,
  onLoad,
  onError,
}) => {
  // For critical images above the fold, use eager loading
  const loadingAttr = priority ? 'eager' : loading;

  const handleLoad = () => {
    console.log('[OptimizedImage] ✅ Loaded:', src);
    onLoad?.();
  };

  const handleError = () => {
    console.warn('[OptimizedImage] ❌ Error:', src);
    onError?.();
  };

  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      loading={loadingAttr}
      sizes={sizes}
      srcSet={srcSet}
      onClick={onClick}
      onLoad={handleLoad}
      onError={handleError}
      style={width && height ? { aspectRatio: `${width}/${height}` } : undefined}
    />
  );
};

export default OptimizedImage;