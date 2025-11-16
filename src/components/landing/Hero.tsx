import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';
import VideoModal from './VideoModal';
import { OnboardingModal } from '@/components/onboarding/OnboardingModal';
import { UniversalAssistant } from '@/components/assistant/UniversalAssistant';
import { RoleTabs } from './RoleTabs';

export default function Hero() {
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showAssistant, setShowAssistant] = useState(false);
  const [activeRole, setActiveRole] = useState<'school' | 'teacher' | 'parent'>('school');
  
  return (
    <>
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Лёгкий градиентный фон */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--muted)) 100%)'
          }}
        />

        <div className="container relative mx-auto px-4 sm:px-6 max-w-7xl py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Левая колонка - текст и табы */}
            <div className="space-y-8">
              <h1 className="text-5xl md:text-6xl font-bold text-primary leading-tight">
                Академиус — платформа, которая объединяет школу, преподавателя и родителя
              </h1>
              
              <p className="text-xl text-muted-foreground">
                CRM, расписание, журнал, платежи и AI-ассистент — всё в одной системе. 
                Полностью бесплатно.
              </p>

              {/* Переключатель ролей */}
              <RoleTabs onRoleChange={setActiveRole} />

              {/* CTA кнопки */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg" 
                  className="text-base px-8"
                  onClick={() => { 
                    setShowOnboarding(true); 
                    setShowAssistant(true); 
                  }}
                >
                  Настроить за 10 минут
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  onClick={() => setIsVideoOpen(true)}
                  className="text-base"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Посмотреть тур (2 мин)
                </Button>
              </div>
            </div>

            {/* Правая колонка - визуал */}
            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-border">
                <img 
                  src="/placeholder.svg" 
                  alt="Академиус Interface"
                  className="w-full h-auto"
                />
                {/* Overlay с градиентом */}
                <div 
                  className="absolute inset-0 opacity-10"
                  style={{
                    background: 'linear-gradient(135deg, hsl(var(--purple-start)) 0%, hsl(var(--purple-end)) 100%)'
                  }}
                />
              </div>

              {/* Декоративные элементы */}
              <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full">
                <div 
                  className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-20"
                  style={{ background: 'hsl(var(--purple-start))' }}
                />
                <div 
                  className="absolute bottom-0 left-0 w-96 h-96 rounded-full blur-3xl opacity-20"
                  style={{ background: 'hsl(var(--accent))' }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <VideoModal open={isVideoOpen} onOpenChange={setIsVideoOpen} />
      <OnboardingModal open={showOnboarding} onOpenChange={setShowOnboarding} />
      <UniversalAssistant context="onboarding" open={showAssistant} onOpenChange={setShowAssistant} />
    </>
  );
}
