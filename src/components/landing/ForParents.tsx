import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';

export default function ForParents() {
  const features = [
    { pain: '❌ Не знаете, что происходит на занятиях?', solution: '✅ Комментарии педагога и прогресс ребенка в реальном времени', metric: 'Полная прозрачность', icon: CheckCircle2 },
    { pain: '❌ Забываете про домашние задания?', solution: '✅ ДЗ автоматически приходит в приложение с уведомлениями', metric: 'Всё под контролем', icon: CheckCircle2 },
    { pain: '❌ Звоните в школу, чтобы узнать расписание?', solution: '✅ Актуальное расписание всегда в телефоне', metric: 'Никаких звонков', icon: CheckCircle2 },
    { pain: '❌ Несколько детей в разных школах — хаос?', solution: '✅ Один семейный кабинет для всех детей и школ', metric: 'Порядок во всем', icon: CheckCircle2 },
    { pain: '❌ Забываете оплатить занятия вовремя?', solution: '✅ Онлайн-оплата и напоминания о просрочках', metric: 'Удобно и быстро', icon: CheckCircle2 }
  ];

  return (
    <section id="for-parents" className="py-20 bg-gradient-to-br from-background via-primary/5 to-background">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-4">
              <span className="text-sm font-medium text-primary">Для семей</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Для родителей и семей</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Академиус превращает занятия ребёнка в понятный путь: виден прогресс, расписание и оплата — без потока сообщений в мессенджерах
            </p>
          </div>
          <div className="space-y-4 mb-12">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="bg-card p-6 rounded-xl border border-border hover:shadow-xl hover:border-primary/50 transition-all duration-300 group">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground mb-2">{feature.pain}</p>
                      <p className="font-semibold mb-2 group-hover:text-primary transition-colors">{feature.solution}</p>
                      <span className="inline-block text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">{feature.metric}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="bg-gradient-subtle p-8 rounded-2xl border border-border">
            <div className="max-w-2xl mx-auto text-center">
              <Button size="lg" className="text-lg px-8 py-6 bg-green-600 hover:bg-green-700 shadow-lg hover:shadow-xl hover:scale-105 transition-all mb-4">
                Узнать о приложении для родителей
              </Button>
              <p className="text-sm text-muted-foreground">Покажем, как будет выглядеть обучение вашего ребенка в Академиус</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
