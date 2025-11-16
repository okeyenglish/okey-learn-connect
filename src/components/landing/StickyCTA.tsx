import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import DemoModal from './DemoModal';

export default function StickyCTA() {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isDemoOpen, setIsDemoOpen] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('stickyCTADismissed');
    if (dismissed) {
      setIsDismissed(true);
      return;
    }

    const handleScroll = () => {
      const scrollPercentage = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
      setIsVisible(scrollPercentage > 50 && !isDismissed);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [isDismissed]);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('stickyCTADismissed', 'true');
  };

  if (!isVisible || isDismissed) return null;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-primary text-primary-foreground py-4 shadow-2xl z-40 animate-slide-in-bottom">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <p className="font-semibold text-sm sm:text-base">Готовы попробовать Академиус?</p>
              <p className="text-xs sm:text-sm opacity-90 hidden sm:block">14 дней бесплатно, без привязки карты</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <Button 
                size="lg" 
                variant="secondary"
                onClick={() => setIsDemoOpen(true)}
                className="text-sm sm:text-base"
              >
                Получить демо
              </Button>
              <button
                onClick={handleDismiss}
                className="p-2 hover:bg-primary-foreground/10 rounded-full transition-colors"
                aria-label="Закрыть"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
      <DemoModal open={isDemoOpen} onOpenChange={setIsDemoOpen} />
    </>
  );
}
