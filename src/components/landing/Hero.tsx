import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, Play } from 'lucide-react';
import HeroImage from './HeroImage';
import DemoModal from './DemoModal';
import VideoModal from './VideoModal';

const scrollToSection = (id: string) => {
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
  }
};

export default function Hero() {
  const [isDemoOpen, setIsDemoOpen] = useState(false);
  const [isVideoOpen, setIsVideoOpen] = useState(false);

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden py-20">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/5" />
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" />
      
      <div className="container relative mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-left">
            <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              <span className="text-sm font-semibold text-primary">✓ Более 500 школ уже используют Академиус</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Прекратите терять учеников и деньги в таблицах Excel
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mb-8">
              Академиус — CRM для школ, которая экономит 20+ часов в месяц на рутине и увеличивает конверсию заявок на 40%
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Button 
                size="lg" 
                className="text-lg px-8 py-6 bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                onClick={() => setIsDemoOpen(true)}
              >
                Получить демо за 15 минут
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="text-lg px-8 py-6"
                onClick={() => setIsVideoOpen(true)}
              >
                <Play className="mr-2 h-5 w-5" />
                Посмотреть видео (2 мин)
              </Button>
            </div>

            <div className="flex flex-wrap gap-3 text-sm">
              <button 
                onClick={() => scrollToSection('for-schools')}
                className="text-muted-foreground hover:text-primary transition-colors underline"
              >
                Для школ
              </button>
              <span className="text-muted-foreground">•</span>
              <button 
                onClick={() => scrollToSection('for-teachers')}
                className="text-muted-foreground hover:text-primary transition-colors underline"
              >
                Для педагогов
              </button>
              <span className="text-muted-foreground">•</span>
              <button 
                onClick={() => scrollToSection('for-parents')}
                className="text-muted-foreground hover:text-primary transition-colors underline"
              >
                Для родителей
              </button>
            </div>
          </div>

          <div className="hidden lg:block">
            <HeroImage />
          </div>
        </div>
      </div>

      <DemoModal open={isDemoOpen} onOpenChange={setIsDemoOpen} />
      <VideoModal open={isVideoOpen} onOpenChange={setIsVideoOpen} />
    </section>
  );
}
