import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';

export default function ForSchools() {
  const features = [
    { pain: '❌ Теряете заявки из WhatsApp, Instagram и сайта?', solution: '✅ Все обращения в одной CRM-воронке с автоответами', metric: 'До 40% больше конверсия', icon: CheckCircle2 },
    { pain: '❌ Путаетесь в расписании, постоянные конфликты?', solution: '✅ Автопроверка пересечений и уведомления о конфликтах', metric: 'Экономия 8 часов/неделю', icon: CheckCircle2 },
    { pain: '❌ Ведете долги и просрочки вручную?', solution: '✅ Автоматические напоминания и онлайн-оплата', metric: 'Задолженность -60%', icon: CheckCircle2 },
    { pain: '❌ Не понимаете, откуда приходят клиенты?', solution: '✅ Аналитика по источникам и воронке продаж', metric: 'Прозрачный ROI', icon: CheckCircle2 },
    { pain: '❌ Тратите часы на выгрузку отчетов из Excel?', solution: '✅ Автоматические отчеты за любой период в 1 клик', metric: 'Экономия 10 часов/месяц', icon: CheckCircle2 },
    { pain: '❌ Родители звонят и спрашивают расписание?', solution: '✅ Мобильное приложение с расписанием и ДЗ', metric: 'Звонков -80%', icon: CheckCircle2 },
  ];

  return (
    <section id="for-schools" className="py-20 bg-gradient-to-br from-background via-primary/5 to-background">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-4">
              <span className="text-sm font-medium text-primary">Для бизнеса</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Для школ и учебных центров</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Академиус помогает владельцам и администраторам держать под контролем продажи, расписание и деньги — без бесконечных таблиц и чатов
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
                Сэкономить 20 часов в месяц
              </Button>
              <p className="text-sm text-muted-foreground mb-6">Бесплатная консультация и демо за 15 минут</p>
              <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border-l-4 border-primary text-left">
                <p className="text-sm"><strong>Языковая школа "Полиглот"</strong> сократила время на административные задачи с 30 до 8 часов в неделю и увеличила конверсию заявок на 35% за первый месяц</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
