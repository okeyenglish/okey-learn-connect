import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';

export default function ForTeachers() {
  const features = [
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
  ];

  return (
    <section id="for-teachers" className="py-20 bg-background">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
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
                Упростить работу педагога
              </Button>
              <p className="text-sm text-muted-foreground mt-4">
                Узнайте, как Академиус экономит время преподавателей
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
