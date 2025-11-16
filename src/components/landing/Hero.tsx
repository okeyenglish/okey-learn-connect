import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Play } from 'lucide-react';
import DemoModal from './DemoModal';
import VideoModal from './VideoModal';

export default function Hero() {
  const [isDemoOpen, setIsDemoOpen] = useState(false);
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-background via-background to-muted/10">
      {/* Enhanced animated background with 3D depth */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.1),transparent_50%)] animate-pulse" />
        
        {/* 3D floating elements */}
        <div 
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-category-tech/10 to-transparent rounded-full blur-3xl animate-float"
          style={{
            transform: `translate(${mousePosition.x}px, ${mousePosition.y}px)`,
            transition: 'transform 0.3s ease-out'
          }}
        />
        <div 
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-br from-category-crm/10 to-transparent rounded-full blur-3xl animate-float"
          style={{
            transform: `translate(${-mousePosition.x}px, ${-mousePosition.y}px)`,
            transition: 'transform 0.3s ease-out',
            animationDelay: '2s'
          }}
        />
        <div 
          className="absolute top-1/2 left-1/2 w-64 h-64 bg-gradient-to-br from-category-education/10 to-transparent rounded-full blur-3xl animate-float"
          style={{
            transform: `translate(${mousePosition.x * 0.5}px, ${mousePosition.y * 0.5}px)`,
            transition: 'transform 0.3s ease-out',
            animationDelay: '1s'
          }}
        />
      </div>
      
      <div className="container relative mx-auto px-4 sm:px-6 max-w-7xl">
        <div className="flex flex-col items-center justify-center">
          <div className="text-center max-w-4xl space-y-8 animate-fade-in">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-3 px-5 py-2.5 glass-card backdrop-blur-xl border border-primary/20">
                <Sparkles className="w-5 h-5 text-[hsl(var(--accent-purple))] animate-pulse" />
                <span className="text-sm font-semibold bg-gradient-to-r from-primary via-purple-500 to-primary bg-clip-text text-transparent">
                  EdTech платформа №1 в России
                </span>
              </div>
              
              <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold leading-[1.1] gradient-text" style={{
                textShadow: '0 0 40px rgba(139, 92, 246, 0.3), 0 0 80px rgba(59, 130, 246, 0.2)'
              }}>
                Управляйте школой{' '}
                <span className="bg-gradient-to-r from-primary via-purple-500 to-primary bg-clip-text text-transparent animate-gradient">
                  в 10 раз быстрее
                </span>
              </h1>
              
              <p className="text-xl sm:text-2xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
                CRM, расписание, финансы и AI-помощник в одной системе. Автоматизируйте рутину и сосредоточьтесь на обучении.
              </p>
            </div>

            <ul className="space-y-5">
              {[
                'Все заявки собираются автоматически — никаких потерянных сообщений',
                'Расписание и зарплаты формируются за минуты, а не часы',
                'Родители видят всё в приложении — меньше звонков и вопросов'
              ].map((item, index) => (
                <li 
                  key={index} 
                  className="flex items-start gap-4 group hover:translate-x-2 transition-all duration-300"
                  style={{
                    animation: `fade-in-up 0.6s ease-out ${index * 0.1}s backwards`
                  }}
                >
                  <div className="mt-0.5 flex-shrink-0">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary via-purple-500 to-primary flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <span className="text-base sm:text-lg text-foreground leading-relaxed font-medium group-hover:text-primary transition-colors">{item}</span>
                </li>
              ))}
            </ul>

            <div className="inline-flex items-center gap-3 glass-card px-5 py-3 backdrop-blur-xl border border-primary/20">
              <span className="text-3xl animate-pulse">⚡</span>
              <span className="text-sm sm:text-base font-bold bg-gradient-to-r from-primary via-purple-500 to-primary bg-clip-text text-transparent">
                Экономия до 20 часов в месяц
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                size="lg" 
                onClick={() => setIsDemoOpen(true)}
                className="group relative overflow-hidden bg-gradient-to-r from-primary via-purple-500 to-primary hover:shadow-2xl hover:shadow-primary/50 text-primary-foreground text-lg px-10 py-7 transition-all duration-300 hover:scale-105"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Попробовать бесплатно
                  <Sparkles className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </Button>
              
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => setIsVideoOpen(true)}
                className="group gap-2 border-2 hover:border-primary/50 hover:bg-primary/10 backdrop-blur-sm text-lg px-10 py-7 transition-all duration-300"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 group-hover:scale-110 transition-all">
                  <Play className="w-5 h-5" />
                </div>
                Смотреть видео
              </Button>
            </div>
          </div>
        </div>
      </div>

      <DemoModal open={isDemoOpen} onOpenChange={setIsDemoOpen} />
      <VideoModal open={isVideoOpen} onOpenChange={setIsVideoOpen} />
    </section>
  );
}
