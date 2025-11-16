import { Award, TrendingUp, Users, Globe, Clock, DollarSign } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function ProofBar() {
  const [isVisible, setIsVisible] = useState(true);

  const proofItems = [
    { icon: Award, text: '⭐ 4.9/5 средний рейтинг' },
    { icon: Award, text: '🏆 Лучшая EdTech платформа 2024' },
    { icon: Users, text: '1,200+ школ доверяют Академиус' },
    { icon: TrendingUp, text: '98% остаются после trial' },
    { icon: Users, text: '50,000+ учеников обучаются' },
    { icon: Clock, text: '2M+ часов сэкономлено' },
    { icon: Globe, text: 'Работаем в 87 странах' },
    { icon: DollarSign, text: '₽5B обработано платежей' },
  ];

  useEffect(() => {
    const hidden = localStorage.getItem('proofBarHidden');
    if (hidden === 'true') {
      setIsVisible(false);
    }
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem('proofBarHidden', 'true');
  };

  if (!isVisible) return null;

  return (
    <div className="sticky top-[60px] z-40 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-b border-border/50 backdrop-blur-sm">
      <div className="relative overflow-hidden py-3">
        <div className="flex animate-marquee gap-8 items-center whitespace-nowrap">
          {[...proofItems, ...proofItems].map((item, index) => (
            <div key={index} className="flex items-center gap-2 text-sm font-medium">
              <span>{item.text}</span>
              {index < proofItems.length * 2 - 1 && (
                <span className="text-primary">•</span>
              )}
            </div>
          ))}
        </div>
        <button
          onClick={handleClose}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Закрыть"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
