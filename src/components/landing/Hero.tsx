import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Play } from 'lucide-react';
import HeroImage from './HeroImage';
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
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="text-left space-y-8 animate-fade-in">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-3 px-4 py-2 glass-card">
                <Sparkles className="w-5 h-5 text-[hsl(var(--accent-purple))]" />
                <span className="text-sm font-medium gradient-text">
                  EdTech платформа №1 в России
                </span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight gradient-text" style={{
                textShadow: '0 0 40px rgba(139, 92, 246, 0.3), 0 0 80px rgba(59, 130, 246, 0.2)'
              }}>
                Единая платформа для школ, преподавателей и родителей
              </h1>
              
              <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed">
                CRM, расписание, финансы и AI-помощник в одной системе. Автоматизируйте рутину и сосредоточьтесь на обучении.
              </p>
            </div>

            <ul className="space-y-4">
              {[
                'Все заявки собираются автоматически — никаких потерянных сообщений',
                'Расписание и зарплаты формируются за минуты, а не часы',
                'Родители видят всё в приложении — меньше звонков и вопросов'
              ].map((item, index) => (
                <li 
                  key={index} 
                  className="flex items-start gap-3 group"
                  style={{
                    animation: `fade-in-up 0.6s ease-out ${index * 0.1}s backwards`
                  }}
                >
                  <div className="mt-1 flex-shrink-0">
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[hsl(152,69%,42%)] to-[hsl(189,94%,43%)]" />
                    </div>
                  </div>
                  <span className="text-base text-foreground group-hover:text-primary transition-colors">{item}</span>
                </li>
              ))}
            </ul>

            <div className="inline-flex items-center gap-2 glass-card px-4 py-2 backdrop-blur-xl">
              <span className="text-2xl">⚡</span>
              <span className="text-sm font-semibold gradient-text">
                Экономия до 20 часов в месяц
              </span>
            </div>

            <div className="flex flex-wrap gap-4">
              <Button 
                size="lg" 
                onClick={() => setIsDemoOpen(true)}
                className="group relative overflow-hidden bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
              >
                <span className="relative z-10">Попробовать бесплатно</span>
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
              </Button>
              
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => setIsVideoOpen(true)}
                className="group gap-2 border-2 hover:border-primary/50 hover:bg-primary/5"
              >
                Смотреть видео
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Play className="w-4 h-4" />
                </div>
              </Button>
            </div>
          </div>

          {/* Right: Enhanced Image Section */}
          <div className="relative lg:block">
            <HeroImage />
          </div>
        </div>
      </div>

      <DemoModal open={isDemoOpen} onOpenChange={setIsDemoOpen} />
      <VideoModal open={isVideoOpen} onOpenChange={setIsVideoOpen} />
    </section>
  );
}
