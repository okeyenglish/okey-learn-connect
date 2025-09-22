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
  quality?: number;
  placeholderBlur?: boolean;
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
  quality = 85,
  placeholderBlur = true,
}) => {
  // For critical images above the fold, use eager loading and fetchpriority
  const fetchPriority = priority ? 'high' : 'auto';
  const loadingAttr = priority ? 'eager' : loading;
  
  // Generate responsive srcSet if not provided
  const responsiveSrcSet = srcSet || generateResponsiveSrcSet(src, width);
  
  // Generate optimized sizes for mobile-first approach
  const responsiveSizes = sizes || generateResponsiveSizes(width);

  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={`${className} ${placeholderBlur && loading === 'lazy' && !priority ? 'blur-up' : ''}`}
      loading={loadingAttr}
      fetchPriority={fetchPriority as any}
      sizes={responsiveSizes}
      srcSet={responsiveSrcSet}
      onClick={onClick}
      style={width && height ? { aspectRatio: `${width}/${height}` } : undefined}
      decoding="async"
    />
  );
};

// Generate responsive srcSet for different screen sizes
const generateResponsiveSrcSet = (src: string, originalWidth?: number): string => {
  if (!originalWidth) return '';
  
  const widths = [320, 480, 640, 768, 1024, 1280, 1600];
  const validWidths = widths.filter(w => w <= originalWidth * 2); // Don't upscale beyond 2x
  
  return validWidths
    .map(w => `${src}?w=${w}&q=85&f=webp ${w}w`)
    .join(', ');
};

// Generate responsive sizes with mobile-first approach
const generateResponsiveSizes = (originalWidth?: number): string => {
  if (!originalWidth) return '100vw';
  
  // Mobile-first responsive sizes
  return '(max-width: 480px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw';
};

export default OptimizedImage;