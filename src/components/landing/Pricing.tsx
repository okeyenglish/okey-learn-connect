import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { OnboardingModal } from '@/components/onboarding/OnboardingModal';

export default function Pricing() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  return (
    <>
      <section id="pricing" className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Полностью бесплатно навсегда</h2>
            <p className="text-lg text-muted-foreground">Все функции без ограничений</p>
          </div>

          <div className="max-w-2xl mx-auto bg-primary/5 p-8 rounded-xl border-2 border-primary">
            <div className="text-center mb-6">
              <span className="text-6xl font-bold text-primary">0₽</span>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="flex gap-2"><Check className="w-5 h-5 text-primary" /><span className="text-sm">Неограниченно учеников</span></div>
              <div className="flex gap-2"><Check className="w-5 h-5 text-primary" /><span className="text-sm">AI-ассистент</span></div>
              <div className="flex gap-2"><Check className="w-5 h-5 text-primary" /><span className="text-sm">CRM и аналитика</span></div>
              <div className="flex gap-2"><Check className="w-5 h-5 text-primary" /><span className="text-sm">Мобильное приложение</span></div>
            </div>
            
            <Button className="w-full" size="lg" onClick={() => setShowOnboarding(true)}>
              Начать бесплатно
            </Button>
          </div>
        </div>
      </section>
      <OnboardingModal open={showOnboarding} onOpenChange={setShowOnboarding} />
    </>
  );
}
