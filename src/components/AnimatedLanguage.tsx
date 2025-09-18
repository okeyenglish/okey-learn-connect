import { useState, useEffect } from "react";

const languages = [
  "английский",
  "китайский", 
  "испанский",
  "немецкий",
  "итальянский",
  "греческий",
  "французский"
];

export default function AnimatedLanguage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % languages.length);
        setIsAnimating(false);
      }, 200);
      
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <span 
      className="relative inline-block align-baseline"
      style={{ 
        width: '280px',
        minWidth: '280px',
        textAlign: 'left'
      }}
    >
      <span
        className={`block transition-all duration-400 ease-out ${
          isAnimating 
            ? 'transform -translate-y-full opacity-0' 
            : 'transform translate-y-0 opacity-100'
        }`}
      >
        {languages[currentIndex]}
      </span>
    </span>
  );
}