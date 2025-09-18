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
      }, 300); // Half of the animation duration
      
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <span className="relative inline-block overflow-hidden">
      <span
        className={`inline-block transition-all duration-600 ease-in-out ${
          isAnimating 
            ? 'transform translate-y-[-100%] opacity-0' 
            : 'transform translate-y-0 opacity-100'
        }`}
        style={{
          transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {languages[currentIndex]}
      </span>
    </span>
  );
}