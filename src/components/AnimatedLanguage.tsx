import { useState, useEffect, useRef } from "react";

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
  const [width, setWidth] = useState<number | null>(null);
  const containerRef = useRef<HTMLSpanElement>(null);

  const nextIndex = (currentIndex + 1) % languages.length;

  useEffect(() => {
    const tick = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % languages.length);
        setIsAnimating(false);
      }, 500);
    }, 2000);
    return () => clearInterval(tick);
  }, []);

  // Precise width measuring to avoid jitter
  useEffect(() => {
    const measure = () => {
      const el = containerRef.current;
      if (!el) return;
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
      for (const w of languages) {
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
      className="inline-block align-baseline overflow-hidden leading-none"
      style={{ height: '1em', width: width ?? undefined }}
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