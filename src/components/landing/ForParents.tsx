import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';

export default function ForParents() {
  const features = [
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
  ];

  return (
    <section id="for-parents" className="py-20 bg-gradient-to-br from-background via-primary/5 to-background">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-primary/10 px-6 py-2 rounded-xl mb-4">
              <span className="text-sm font-medium text-primary">Для семей</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Для родителей и семей</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Академиус превращает занятия ребёнка в понятный путь: виден прогресс, расписание и оплата
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
                Узнать о приложении для родителей
              </Button>
              <p className="text-sm text-muted-foreground mt-4">Покажем, как будет выглядеть обучение вашего ребенка в Академиус</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
