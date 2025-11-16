import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertCircle, TrendingUp, Clock, Zap, Target } from 'lucide-react';

type Role = 'schools' | 'teachers' | 'parents';

export default function RolesTabs() {
  const [activeRole, setActiveRole] = useState<Role>('schools');

  const rolesContent = {
    schools: {
      title: 'Для школ и учебных центров',
      subtitle: 'Академиус помогает владельцам и администраторам держать под контролем продажи, расписание и деньги',
      features: [
        {
          pain: "Лиды теряются в мессенджерах и таблицах",
          solution: "Все заявки автоматически собираются в CRM",
          metric: "+40% конверсий"
        },
        {
          pain: "Нет прозрачности по финансам",
          solution: "Видите выручку и прибыль в реальном времени",
          metric: "Полная прозрачность"
        },
        {
          pain: "Журнал не заполняется вовремя",
          solution: "Преподаватели ведут журнал из личного кабинета",
          metric: "100% заполнение"
        }
      ],
      cta: {
        text: "Сэкономить 20 часов в месяц",
        description: "Бесплатная консультация и демо за 15 минут"
      }
    },
    teachers: {
      title: 'Для преподавателей',
      subtitle: 'Академиус упрощает жизнь педагогам: вместо пяти таблиц и чатов — один удобный кабинет',
      features: [
        {
          pain: "Часы на журнал и подсчёт зарплаты",
          solution: "Журнал за 2 клика, зарплата автоматически",
          metric: "–10 часов в месяц"
        },
        {
          pain: "Расписание постоянно меняется",
          solution: "Всё в личном кабинете с уведомлениями",
          metric: "0 пропущенных уроков"
        },
        {
          pain: "Сложно готовиться к урокам",
          solution: "AI создаёт план урока и упражнения",
          metric: "Урок за 5 минут"
        }
      ],
      cta: {
        text: "Упростить работу педагога",
        description: "Узнайте, как Академиус экономит время преподавателей"
      }
    },
    parents: {
      title: 'Для родителей и семей',
      subtitle: 'Академиус превращает занятия ребёнка в понятный путь: виден прогресс, расписание и оплата',
      features: [
        {
          pain: "Не знаете, как ребёнок занимается",
          solution: "Видите оценки, ДЗ и комментарии преподавателя",
          metric: "Полная прозрачность"
        },
        {
          pain: "Нужно звонить для уточнения расписания",
          solution: "Расписание в приложении с push-уведомлениями",
          metric: "0 пропусков"
        },
        {
          pain: "Неудобно оплачивать",
          solution: "Оплата онлайн картой в приложении",
          metric: "30 секунд на оплату"
        }
      ],
      cta: {
        text: "Узнать о приложении для родителей",
        description: "Покажем, как будет выглядеть обучение вашего ребенка в Академиус"
      }
    }
  };

  const content = rolesContent[activeRole];

  return (
    <section className="py-32 bg-gradient-to-br from-background via-primary/3 to-background">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          {/* Tabs */}
          <div className="flex justify-center gap-4 mb-16 flex-wrap">
            <button
              onClick={() => setActiveRole('schools')}
              className={`px-8 py-4 rounded-xl font-medium transition-all ${
                activeRole === 'schools'
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              Для школ
            </button>
            <button
              onClick={() => setActiveRole('teachers')}
              className={`px-8 py-4 rounded-xl font-medium transition-all ${
                activeRole === 'teachers'
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              Для преподавателей
            </button>
            <button
              onClick={() => setActiveRole('parents')}
              className={`px-8 py-4 rounded-xl font-medium transition-all ${
                activeRole === 'parents'
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              Для родителей
            </button>
          </div>

          {/* Content */}
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-bold mb-8 leading-tight">{content.title}</h2>
            <p className="text-2xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
              {content.subtitle}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-20">
            {/* Pain Points */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-8">
                <AlertCircle className="h-8 w-8 text-red-500" />
                <h3 className="text-2xl font-bold text-foreground">Было</h3>
              </div>
              {content.features.map((feature, index) => (
                <div 
                  key={index} 
                  className="comparison-card bg-red-50 dark:bg-red-950/20 border-l-4 border-red-500 animate-fade-in"
                  style={{ 
                    animationDelay: `${index * 100}ms`,
                    color: 'hsl(0, 72%, 58%)'
                  }}
                >
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 flex-shrink-0 mt-1 text-red-500" />
                    <p className="text-lg text-foreground leading-relaxed">{feature.pain}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Solutions */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-8">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
                <h3 className="text-2xl font-bold text-foreground">Стало с Академиус</h3>
              </div>
              {content.features.map((feature, index) => (
                <div 
                  key={index} 
                  className="comparison-card bg-green-50 dark:bg-green-950/20 border-l-4 border-green-500 space-y-3 animate-fade-in"
                  style={{ 
                    animationDelay: `${index * 150}ms`,
                    color: 'hsl(152, 69%, 42%)'
                  }}
                >
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-1" />
                    <p className="text-lg text-foreground leading-relaxed">{feature.solution}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-8">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <p className="text-base font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                      {feature.metric}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-12 rounded-3xl border-2 border-primary/20 shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="max-w-2xl mx-auto text-center space-y-6 relative z-10">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Zap className="h-8 w-8 text-primary" />
                <Target className="h-8 w-8 text-primary" />
              </div>
              <Button size="lg" className="glow-button text-lg px-12 py-8 bg-gradient-to-r from-primary via-purple-600 to-pink-600 hover:shadow-2xl transition-all duration-300">
                {content.cta.text}
              </Button>
              <p className="text-base text-muted-foreground font-medium">{content.cta.description}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
