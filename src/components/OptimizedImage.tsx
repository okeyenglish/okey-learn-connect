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
}) => {
  // For critical images above the fold, use eager loading and fetchpriority
  const fetchPriority = priority ? 'high' : 'auto';
  const loadingAttr = priority ? 'eager' : loading;

  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      loading={loadingAttr}
      fetchPriority={fetchPriority as any}
      sizes={sizes}
      srcSet={srcSet}
      onClick={onClick}
      style={width && height ? { aspectRatio: `${width}/${height}` } : undefined}
    />
  );
};

export default OptimizedImage;