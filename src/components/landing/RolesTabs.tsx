import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';

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

          <div className="grid md:grid-cols-2 gap-16 mb-20">
            <div className="space-y-10">
              <h3 className="text-2xl font-semibold text-muted-foreground">Было</h3>
              {content.features.map((feature, index) => (
                <p key={index} className="text-muted-foreground text-xl leading-relaxed">{feature.pain}</p>
              ))}
            </div>
            <div className="space-y-10">
              <h3 className="text-2xl font-semibold">Стало с Академиус</h3>
              {content.features.map((feature, index) => (
                <div key={index} className="space-y-3">
                  <div className="flex items-start gap-4">
                    <CheckCircle2 className="h-6 w-6 text-success flex-shrink-0 mt-1" />
                    <p className="text-xl leading-relaxed">{feature.solution}</p>
                  </div>
                  <p className="text-base font-semibold text-success ml-10">{feature.metric}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-accent/50 p-12 rounded-3xl border border-border/50">
            <div className="max-w-2xl mx-auto text-center space-y-4">
              <Button size="lg" className="text-lg px-10 py-7 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/25 transition-all">
                {content.cta.text}
              </Button>
              <p className="text-base text-muted-foreground">{content.cta.description}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
