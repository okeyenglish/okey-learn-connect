import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';

export default function ForTeachers() {
  const features = [
    {
      pain: '❌ Забываете, кто пришел, а кто пропустил?',
      solution: '✅ Отметки посещаемости в 1 клик прямо с телефона',
      metric: 'Журнал всегда актуален',
      icon: CheckCircle2
    },
    {
      pain: '❌ Ученики спрашивают "Что задано?" каждый урок?',
      solution: '✅ ДЗ автоматически отправляется ученикам и родителям',
      metric: 'Экономия 15 мин/урок',
      icon: CheckCircle2
    },
    {
      pain: '❌ Не понимаете, сколько заработали за месяц?',
      solution: '✅ Прозрачный расчет: сколько уроков, какая оплата, какой доход',
      metric: 'Все видно в кабинете',
      icon: CheckCircle2
    },
    {
      pain: '❌ Тратите вечера на придумывание упражнений?',
      solution: '✅ AI генерирует игры и задания под вашу тему за секунды',
      metric: 'Экономия 2 часа/неделю',
      icon: CheckCircle2
    },
    {
      pain: '❌ Работаете в нескольких школах — везде разные системы?',
      solution: '✅ Один личный кабинет и общий календарь для всех школ',
      metric: 'Порядок во всем',
      icon: CheckCircle2
    }
  ];

  return (
    <section id="for-teachers" className="py-20 bg-background">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-4">
              <span className="text-sm font-medium text-primary">Для профессионалов</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Для преподавателей
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Академиус упрощает жизнь педагогам: вместо пяти таблиц и чатов — один удобный кабинет
            </p>
          </div>

          <div className="space-y-4 mb-12">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div 
                  key={index} 
                  className="bg-card p-6 rounded-xl border border-border hover:shadow-xl hover:border-primary/50 transition-all duration-300 group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground mb-2">{feature.pain}</p>
                      <p className="font-semibold mb-2 group-hover:text-primary transition-colors">{feature.solution}</p>
                      <span className="inline-block text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
                        {feature.metric}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-gradient-subtle p-8 rounded-2xl border border-border">
            <div className="max-w-2xl mx-auto text-center">
              <Button size="lg" className="text-lg px-8 py-6 bg-green-600 hover:bg-green-700 shadow-lg hover:shadow-xl hover:scale-105 transition-all mb-4">
                Упростить работу педагога
              </Button>
              <p className="text-sm text-muted-foreground">
                Узнайте, как Академиус экономит время преподавателей
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
