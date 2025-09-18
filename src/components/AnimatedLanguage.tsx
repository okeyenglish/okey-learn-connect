import { useState, useEffect, useMemo } from "react";

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

  const longest = useMemo(() => Math.max(...languages.map((w) => w.length)), []);
  const nextIndex = (currentIndex + 1) % languages.length;

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % languages.length);
        setIsAnimating(false);
      }, 450); // slide duration
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span 
      className="inline-block align-baseline overflow-hidden"
      style={{ height: '1em', lineHeight: '1em', minWidth: `${longest}ch` }}
    >
      <span
        className={`block transition-transform duration-500 ease-out will-change-transform ${
          isAnimating ? '-translate-y-full' : 'translate-y-0'
        }`}
      >
        <span className="block text-gradient whitespace-nowrap">{languages[currentIndex]}</span>
        <span className="block text-gradient whitespace-nowrap">{languages[nextIndex]}</span>
      </span>
    </span>
  );
}