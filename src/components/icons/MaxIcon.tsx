import maxIconSrc from "@/assets/max-icon.webp";

interface MaxIconProps {
  className?: string;
  /** Size in pixels (width & height). Defaults to 16. */
  size?: number;
}

/**
 * MAX messenger icon using the official logo.
 * For small badge usage (avatar overlays), use size={10} or similar.
 */
const MaxIcon = ({ className, size = 16 }: MaxIconProps) => (
  <img 
    src={maxIconSrc} 
    alt="MAX" 
    width={size} 
    height={size} 
    className={className || `w-4 h-4 rounded-full`}
    style={{ objectFit: 'cover' }}
  />
);

export default MaxIcon;
