import academyOSLogo from "@/assets/academyos-logo.png";

interface AcademyOSLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

const sizeMap = {
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-12 h-12",
};

const textSizeMap = {
  sm: "text-lg",
  md: "text-xl",
  lg: "text-2xl",
};

export const AcademyOSLogo = ({ 
  size = "md", 
  showText = true,
  className = ""
}: AcademyOSLogoProps) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img 
        src={academyOSLogo} 
        alt="AcademyOS" 
        className={`${sizeMap[size]} object-contain`}
      />
      {showText && (
        <span className={`font-bold ${textSizeMap[size]}`}>
          AcademyOS
        </span>
      )}
    </div>
  );
};

export default AcademyOSLogo;
