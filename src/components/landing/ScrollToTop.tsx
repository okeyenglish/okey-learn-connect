import { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';
import { throttle } from '@/lib/performance';

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Throttle scroll event to improve performance (check every 200ms)
    const toggleVisibility = throttle(() => {
      if (window.pageYOffset > 500) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    }, 200);

    window.addEventListener('scroll', toggleVisibility, { passive: true });

    return () => {
      window.removeEventListener('scroll', toggleVisibility);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <>
      {isVisible && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-24 right-6 z-40 bg-primary text-primary-foreground p-3 rounded-full shadow-elevated hover:bg-primary-hover transition-all duration-300 hover:scale-110 animate-fade-in"
          aria-label="Прокрутить наверх"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </>
  );
}
