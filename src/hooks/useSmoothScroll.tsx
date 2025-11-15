import { useEffect } from 'react';

export const useSmoothScroll = () => {
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a[href^="#"]');
      
      if (!anchor) return;
      
      const href = anchor.getAttribute('href');
      if (!href || href === '#') return;
      
      e.preventDefault();
      
      const targetElement = document.querySelector(href);
      if (!targetElement) return;
      
      const headerOffset = 80; // Height of sticky header
      const elementPosition = targetElement.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    };

    document.addEventListener('click', handleClick);
    
    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, []);
};
