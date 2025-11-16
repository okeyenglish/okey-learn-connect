import { useState } from 'react';
import { Building2, GraduationCap, Users, X, Check } from 'lucide-react';
import ScrollReveal from '@/components/effects/ScrollReveal';

const comparisons = {
  school: [
    {
      before: 'Заявки теряются в мессенджерах и тетрадках',
      after: 'Все заявки в одной CRM'
    },
    {
      before: 'Часы на расчёт зарплат вручную',
      after: 'Автоматический расчёт зарплаты'
    },
    {
      before: 'Нет понимания, откуда приходят клиенты',
      after: 'Прозрачная аналитика по источникам'
    }
  ],
  teacher: [
    {
      before: 'Тратите 15 минут после урока на оформление',
      after: 'Журнал заполняется автоматически'
    },
    {
      before: 'Не знаете, когда придут деньги',
      after: 'Прозрачная зарплата в реальном времени'
    },
    {
      before: 'Подготовка заданий отнимает вечера',
      after: 'AI генерирует задания за минуту'
    }
  ],
  parent: [
    {
      before: 'Забываете про занятия и домашки',
      after: 'Приложение показывает расписание'
    },
    {
      before: 'Теряете квитанции об оплате',
      after: 'История платежей в приложении'
    },
    {
      before: 'Не знаете, как учится ребёнок',
      after: 'Прогресс ребёнка всегда под рукой'
    }
  ]
};

const roleLabels = {
  school: { icon: Building2, label: 'Школы' },
  teacher: { icon: GraduationCap, label: 'Преподаватели' },
  parent: { icon: Users, label: 'Родители' }
};

export const BeforeAfterSection = () => {
  const [activeRole, setActiveRole] = useState<'school' | 'teacher' | 'parent'>('school');

  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <ScrollReveal>
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-primary mb-4">
              Было → Стало
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Как Академиус решает ваши задачи
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <div className="flex flex-wrap gap-3 justify-center mb-12">
            {Object.entries(roleLabels).map(([key, data]) => {
              const Icon = data.icon;
              const isActive = activeRole === key;
              
              return (
                <button
                  key={key}
                  onClick={() => setActiveRole(key as 'school' | 'teacher' | 'parent')}
                  className={`
                    flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all
                    ${isActive 
                      ? 'bg-primary text-primary-foreground shadow-lg' 
                      : 'bg-card text-muted-foreground hover:bg-secondary'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  {data.label}
                </button>
              );
            })}
          </div>
        </ScrollReveal>

        <div className="grid gap-6 max-w-4xl mx-auto">
          {comparisons[activeRole].map((item, index) => (
            <ScrollReveal key={index} delay={0.2 + index * 0.1}>
              <div className="grid md:grid-cols-2 gap-4">
                {/* Было */}
                <div className="p-6 bg-card rounded-lg border border-destructive/20">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <X className="w-4 h-4 text-destructive" />
                    </div>
                    <p className="text-foreground">{item.before}</p>
                  </div>
                </div>

                {/* Стало */}
                <div className="p-6 bg-card rounded-lg border border-accent/20">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-4 h-4 text-accent" />
                    </div>
                    <p className="text-foreground font-medium">{item.after}</p>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
};
