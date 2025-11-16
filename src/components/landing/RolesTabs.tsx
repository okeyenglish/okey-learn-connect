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
    <section className="py-20 bg-gradient-to-br from-background via-primary/5 to-background">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          {/* Tabs */}
          <div className="flex justify-center gap-4 mb-12 flex-wrap">
            <button
              onClick={() => setActiveRole('schools')}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                activeRole === 'schools'
                  ? 'bg-primary text-primary-foreground shadow-lg'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              Для школ
            </button>
            <button
              onClick={() => setActiveRole('teachers')}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                activeRole === 'teachers'
                  ? 'bg-primary text-primary-foreground shadow-lg'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              Для преподавателей
            </button>
            <button
              onClick={() => setActiveRole('parents')}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                activeRole === 'parents'
                  ? 'bg-primary text-primary-foreground shadow-lg'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              Для родителей
            </button>
          </div>

          {/* Content */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">{content.title}</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              {content.subtitle}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 mb-16">
            <div className="space-y-8">
              <h3 className="text-xl font-semibold text-muted-foreground">Было</h3>
              {content.features.map((feature, index) => (
                <p key={index} className="text-muted-foreground text-lg">{feature.pain}</p>
              ))}
            </div>
            <div className="space-y-8">
              <h3 className="text-xl font-semibold">Стало с Академиус</h3>
              {content.features.map((feature, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                    <p className="text-lg">{feature.solution}</p>
                  </div>
                  <p className="text-sm font-semibold text-primary ml-8">{feature.metric}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-subtle p-8 rounded-2xl border border-border">
            <div className="max-w-2xl mx-auto text-center">
              <Button size="lg" className="text-lg px-8 py-6 bg-green-600 hover:bg-green-700">
                {content.cta.text}
              </Button>
              <p className="text-sm text-muted-foreground mt-4">{content.cta.description}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
