import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';

export default function ForSchools() {
  const features = [
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
  ];

  return (
    <section id="for-schools" className="py-20 bg-gradient-to-br from-background via-primary/5 to-background">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-primary/10 px-6 py-2 rounded-xl mb-4">
              <span className="text-sm font-medium text-primary">Для бизнеса</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Для школ и учебных центров</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Академиус помогает владельцам и администраторам держать под контролем продажи, расписание и деньги
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 mb-16">
            <div className="space-y-8">
              <h3 className="text-xl font-semibold text-muted-foreground">Было</h3>
              {features.map((feature, index) => (
                <p key={index} className="text-muted-foreground text-lg">{feature.pain}</p>
              ))}
            </div>
            <div className="space-y-8">
              <h3 className="text-xl font-semibold">Стало с Академиус</h3>
              {features.map((feature, index) => (
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
                Сэкономить 20 часов в месяц
              </Button>
              <p className="text-sm text-muted-foreground mt-4">Бесплатная консультация и демо за 15 минут</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
