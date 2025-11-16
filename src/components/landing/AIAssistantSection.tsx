import { Brain, Zap, TrendingUp, Bot } from 'lucide-react';
import ScrollReveal from '@/components/effects/ScrollReveal';
import { Button } from '@/components/ui/button';

const aiFeatures = [
  {
    icon: Brain,
    title: 'Автоматические планы уроков',
    description: 'Сгенерировать структуру урока по теме и возрасту за 30 секунд'
  },
  {
    icon: Bot,
    title: 'Служба поддержки 24/7',
    description: 'Авто-ответы на вопросы родителей'
  },
  {
    icon: TrendingUp,
    title: 'Прогноз успеваемости',
    description: 'Прогнозирует результаты ученика и подсказывает учителю'
  },
  {
    icon: Zap,
    title: 'Автопилот задач',
    description: 'Автоматическое распределение задач и напоминания'
  }
];

export const AIAssistantSection = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Фиолетовый градиентный фон */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, hsl(var(--purple-start)) 0%, hsl(var(--purple-end)) 100%)'
        }}
      />
      
      {/* Декоративные элементы */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-64 h-64 bg-white rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-white rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <ScrollReveal>
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Ваш персональный ассистент на базе AI
            </h2>
            <p className="text-xl text-white/90 max-w-2xl mx-auto">
              Искусственный интеллект берёт на себя рутину и помогает принимать решения
            </p>
          </div>
        </ScrollReveal>

        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto mb-12">
          {aiFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <ScrollReveal key={index} delay={index * 0.1}>
                <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl border border-white/20 hover:bg-white/20 transition-all">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-white/80 text-sm">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            );
          })}
        </div>

        <ScrollReveal delay={0.4}>
          <div className="text-center">
            <Button
              size="lg"
              className="bg-white text-primary hover:bg-white/90 font-semibold px-8"
            >
              Попробовать AI бесплатно
            </Button>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};
