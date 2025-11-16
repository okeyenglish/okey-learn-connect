import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Play } from 'lucide-react';
import DemoModal from './DemoModal';
import VideoModal from './VideoModal';
import { OnboardingModal } from '@/components/onboarding/OnboardingModal';
import { UniversalAssistant } from '@/components/assistant/UniversalAssistant';

export default function Hero() {
  const [isDemoOpen, setIsDemoOpen] = useState(false);
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showAssistant, setShowAssistant] = useState(false);
  
  return (
    <>
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-background via-background to-muted/10">
        <div className="container relative mx-auto px-4 sm:px-6 max-w-7xl">
          <div className="flex flex-col items-center justify-center">
            <div className="text-center max-w-4xl space-y-8">
              <div className="inline-flex items-center gap-3 px-5 py-2.5 glass-card backdrop-blur-xl border border-primary/20">
                <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                <span className="text-sm font-semibold">Полностью бесплатная CRM для школ</span>
              </div>
              
              <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold gradient-text">
                Управляйте школой с помощью AI
              </h1>
              
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Начните работу за 2 минуты - без звонков и ожидания
              </p>
              
              <div className="flex gap-4 justify-center">
                <Button size="lg" onClick={() => { setShowOnboarding(true); setShowAssistant(true); }}>
                  Начать бесплатно
                </Button>
                <Button size="lg" variant="outline" onClick={() => setIsVideoOpen(true)}>
                  <Play className="w-5 h-5 mr-2" />Видео демо
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <DemoModal open={isDemoOpen} onOpenChange={setIsDemoOpen} />
      <VideoModal open={isVideoOpen} onOpenChange={setIsVideoOpen} />
      <OnboardingModal open={showOnboarding} onOpenChange={setShowOnboarding} />
      <UniversalAssistant context="onboarding" open={showAssistant} onOpenChange={setShowAssistant} />
    </>
  );
}
