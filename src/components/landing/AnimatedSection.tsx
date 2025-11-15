import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { ReactNode } from 'react';

interface AnimatedSectionProps {
  children: ReactNode;
  animation?: 'fade-up' | 'fade-in' | 'scale-in' | 'slide-left' | 'slide-right';
  delay?: number;
  className?: string;
}

export default function AnimatedSection({
  children,
  animation = 'fade-up',
  delay = 0,
  className = ''
}: AnimatedSectionProps) {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1, triggerOnce: true });

  const animationClasses = {
    'fade-up': 'opacity-0 translate-y-10',
    'fade-in': 'opacity-0',
    'scale-in': 'opacity-0 scale-95',
    'slide-left': 'opacity-0 -translate-x-10',
    'slide-right': 'opacity-0 translate-x-10'
  };

  const visibleClasses = {
    'fade-up': 'opacity-100 translate-y-0',
    'fade-in': 'opacity-100',
    'scale-in': 'opacity-100 scale-100',
    'slide-left': 'opacity-100 translate-x-0',
    'slide-right': 'opacity-100 translate-x-0'
  };

  return (
    <div
      ref={ref as any}
      className={`transition-all duration-700 ease-out ${
        isVisible ? visibleClasses[animation] : animationClasses[animation]
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
