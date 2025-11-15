import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

export default function Pricing() {
  return (
    <section id="pricing" className="py-20 bg-background">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Прозрачные тарифы без скрытых платежей
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Выберите подходящий тариф для вашей школы. Все тарифы включают 14 дней бесплатного пробного периода
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {/* Тариф Старт */}
            <div className="bg-card p-8 rounded-xl border border-border hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <h3 className="text-2xl font-bold mb-2">Старт</h3>
              <div className="mb-4">
                <span className="text-4xl font-bold">5,990₽</span>
                <span className="text-muted-foreground">/месяц</span>
              </div>
              <p className="text-muted-foreground mb-6 text-sm">
                Для школ до 50 учеников
              </p>
              
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">CRM с лидами и клиентами</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Расписание и управление группами</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Базовые финансовые отчёты</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Электронный журнал</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Техподдержка Email</span>
                </li>
              </ul>
              
              <Button className="w-full shadow-lg hover:shadow-xl transition-all" size="lg">
                Попробовать 14 дней бесплатно
              </Button>
            </div>

            {/* Тариф Бизнес (популярный) */}
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-8 rounded-xl border-2 border-primary shadow-xl relative transform md:scale-105">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-sm font-bold px-6 py-2 rounded-full shadow-lg">
                Популярно
              </div>
              
              <h3 className="text-2xl font-bold mb-2">Бизнес</h3>
              <div className="mb-4">
                <span className="text-4xl font-bold">14,990₽</span>
                <span className="text-muted-foreground">/месяц</span>
              </div>
              <p className="text-muted-foreground mb-6 text-sm">
                Для школ до 200 учеников
              </p>
              
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm font-semibold">Всё из тарифа "Старт" +</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Мобильное приложение для родителей</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Автоматические напоминания и SMS</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">API для интеграций</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Автоматический расчёт зарплат</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Приоритетная поддержка (Чат + Телефон)</span>
                </li>
              </ul>
              
              <Button className="w-full shadow-lg hover:shadow-xl transition-all bg-primary hover:bg-primary/90" size="lg">
                Попробовать 14 дней бесплатно
              </Button>
            </div>

            {/* Тариф Enterprise */}
            <div className="bg-card p-8 rounded-xl border border-border hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <h3 className="text-2xl font-bold mb-2">Enterprise</h3>
              <div className="mb-4">
                <span className="text-4xl font-bold">По запросу</span>
              </div>
              <p className="text-muted-foreground mb-6 text-sm">
                Для сетей школ 200+ учеников
              </p>
              
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm font-semibold">Всё из тарифа "Бизнес" +</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Безлимитное количество учеников</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">White-label (ваш бренд)</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Персональный менеджер</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">SLA 99.9% uptime</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Обучение команды и внедрение</span>
                </li>
              </ul>
              
              <Button variant="outline" className="w-full shadow-lg hover:shadow-xl transition-all border-primary hover:bg-primary/10" size="lg">
                Связаться с нами
              </Button>
            </div>
          </div>

          {/* Гарантия */}
          <div className="text-center bg-muted/50 p-6 rounded-xl border border-border">
            <p className="text-lg font-semibold mb-2">
              🎁 14 дней бесплатно, без привязки карты
            </p>
            <p className="text-muted-foreground text-sm">
              Отмените в любой момент. Никаких скрытых платежей или долгосрочных обязательств.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
