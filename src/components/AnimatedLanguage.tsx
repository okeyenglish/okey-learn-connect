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

export default function AnimatedLanguage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [width, setWidth] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  const nextIndex = (currentIndex + 1) % languageCombinations.length;

  useEffect(() => {
    const tick = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % languageCombinations.length);
        setIsAnimating(false);
      }, 500);
    }, 2000);
    return () => clearInterval(tick);
  }, []);

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
      m.style.fontWeight = computed.fontWeight as any;
      document.body.appendChild(m);
      let max = 0;
      for (const w of languageCombinations) {
        m.textContent = w;
        max = Math.max(max, m.getBoundingClientRect().width);
      }
      document.body.removeChild(m);
      
      // Limit width to viewport width minus padding on mobile
      const maxWidth = windowWidth <= 768 ? windowWidth - 64 : max;
      setWidth(Math.ceil(Math.min(max, maxWidth)));
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
        maxWidth: '100%',
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
          className={`block text-gradient text-center overflow-hidden ${isMobile ? '' : 'whitespace-nowrap'}`} 
          style={{ 
            lineHeight: 'inherit',
            textOverflow: 'ellipsis'
          }}
        >
          {languageCombinations[currentIndex]}
        </span>
        <span 
          className={`block text-gradient text-center overflow-hidden ${isMobile ? '' : 'whitespace-nowrap'}`} 
          style={{ 
            lineHeight: 'inherit',
            textOverflow: 'ellipsis'
          }}
        >
          {languageCombinations[nextIndex]}
        </span>
      </span>
    </span>
  );
}