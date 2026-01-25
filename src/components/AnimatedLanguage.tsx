import { useState, useEffect, useRef } from "react";

const languageCombinations = [
  "Свободный английский",
  "Беглый китайский", 
  "Уверенный испанский",
  "Продвинутый немецкий",
  "Разговорный итальянский",
  "Свободный греческий",
  "Беглый французский",
  "Уверенный английский",
  "Продвинутый китайский",
  "Разговорный испанский"
];

const mobileLanguages = [
  "Английский",
  "Китайский", 
  "Испанский",
  "Немецкий",
  "Итальянский",
  "Греческий",
  "Французский",
  "Английский",
  "Китайский",
  "Испанский"
];

export default function AnimatedLanguage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [width, setWidth] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  const currentLanguages = isMobile ? mobileLanguages : languageCombinations;
  const nextIndex = (currentIndex + 1) % currentLanguages.length;

  // Reset index when switching between mobile/desktop to avoid out of bounds
  useEffect(() => {
    setCurrentIndex(0);
  }, [isMobile]);

  useEffect(() => {
    const tick = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % currentLanguages.length);
        setIsAnimating(false);
      }, 500);
    }, 2000);
    return () => clearInterval(tick);
  }, [currentLanguages.length]);

  // Responsive width measuring to avoid overflow on mobile
  useEffect(() => {
    const measure = () => {
      const el = containerRef.current;
      if (!el) return;
      
      const windowWidth = window.innerWidth;
      setIsMobile(windowWidth <= 768);
      
      const computed = getComputedStyle(el);
      const m = document.createElement('span');
      m.style.position = 'absolute';
      m.style.visibility = 'hidden';
      m.style.whiteSpace = 'nowrap';
      m.style.font = computed.font;
      m.style.letterSpacing = computed.letterSpacing;
      m.style.fontWeight = computed.fontWeight;
      document.body.appendChild(m);
      
      const languagesToMeasure = windowWidth <= 768 ? mobileLanguages : languageCombinations;
      let max = 0;
      for (const w of languagesToMeasure) {
        m.textContent = w;
        max = Math.max(max, m.getBoundingClientRect().width);
      }
      document.body.removeChild(m);
      
      setWidth(Math.ceil(max));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  return (
    <span
      ref={containerRef}
      className="inline-block align-baseline overflow-hidden"
      style={{ 
        height: '1em', 
        width: width ?? undefined,
        minWidth: 'fit-content',
        verticalAlign: 'baseline',
        lineHeight: 'inherit'
      }}
    >
      <span
        className={`block transition-transform duration-500 ease-out will-change-transform ${
          isAnimating ? '-translate-y-full' : 'translate-y-0'
        }`}
        style={{ lineHeight: 'inherit' }}
      >
        <span 
          className="block text-gradient text-center" 
          style={{ 
            lineHeight: 'inherit'
          }}
        >
          {currentLanguages[currentIndex]}
        </span>
        <span 
          className="block text-gradient text-center" 
          style={{ 
            lineHeight: 'inherit'
          }}
        >
          {currentLanguages[nextIndex]}
        </span>
      </span>
    </span>
  );
}