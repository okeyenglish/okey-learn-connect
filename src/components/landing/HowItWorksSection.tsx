import { MessageSquare, Calendar, Users, BarChart3 } from 'lucide-react';
import ScrollReveal from '@/components/effects/ScrollReveal';

const steps = [
  {
    icon: MessageSquare,
    title: 'Собирайте заявки',
    description: 'Подключите WhatsApp, Telegram и форму записи; все обращения попадают в CRM'
  },
  {
    icon: Calendar,
    title: 'Создавайте расписание',
    description: 'Система предлагает оптимальное распределение учеников и учителей, заменяет педагога по одному клику'
  },
  {
    icon: Users,
    title: 'Проводите занятия',
    description: 'Преподаватель отмечает присутствие, выдаёт задания — всё в одном журнале'
  },
  {
    icon: BarChart3,
    title: 'Анализируйте результаты',
    description: 'Отчёты по конверсии, посещаемости, финансам и рекомендации AI'
  }
];

export const HowItWorksSection = () => {
  return (
    <section className="py-24 bg-card">
      <div className="container mx-auto px-4">
        <ScrollReveal>
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-primary mb-4">
              Как это работает
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Четыре простых шага к автоматизации вашей школы
            </p>
          </div>
        </ScrollReveal>

        <div className="relative max-w-6xl mx-auto">
          {/* Линия соединения (desktop) */}
          <div className="hidden md:block absolute top-16 left-0 right-0 h-0.5 bg-border" 
               style={{ width: 'calc(100% - 8rem)', left: '4rem' }} 
          />

          <div className="grid md:grid-cols-4 gap-8">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <ScrollReveal key={index} delay={index * 0.1}>
                  <div className="relative">
                    {/* Номер шага */}
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm z-10">
                      {index + 1}
                    </div>

                    <div className="pt-8 text-center">
                      {/* Иконка */}
                      <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-accent/10 flex items-center justify-center">
                        <Icon className="w-8 h-8 text-accent" />
                      </div>

                      {/* Текст */}
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        {step.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
