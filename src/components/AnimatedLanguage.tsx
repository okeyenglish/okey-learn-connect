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
      }, 300);
      
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <span 
      className="inline-block relative overflow-hidden"
      style={{ 
        minWidth: '280px',
        height: '1.2em',
        verticalAlign: 'baseline'
      }}
    >
      <span
        className={`absolute left-0 top-0 w-full transition-all duration-500 ease-out ${
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