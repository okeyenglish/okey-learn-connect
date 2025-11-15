import { Button } from '@/components/ui/button';

export default function Pricing() {
  return (
    <section id="pricing" className="py-20 bg-background">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Тарифы
          </h2>
          <p className="text-lg text-muted-foreground mb-12">
            Прозрачная стоимость без скрытых платежей
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-card p-8 rounded-xl border border-border hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <h3 className="text-2xl font-bold mb-3">Для школ</h3>
              <p className="text-muted-foreground mb-6">
                Помесячная подписка за центр или филиал
              </p>
              <ul className="space-y-3 mb-8 text-sm">
                <li className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    ✓
                  </div>
                  <span>Полный CRM функционал</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    ✓
                  </div>
                  <span>Расписание и группы</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    ✓
                  </div>
                  <span>Финансы и отчеты</span>
                </li>
              </ul>
              <Button className="w-full shadow-lg hover:shadow-xl transition-all">Узнать стоимость</Button>
            </div>

            <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-8 rounded-xl border-2 border-primary shadow-xl relative transform md:scale-105">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-sm font-bold px-6 py-2 rounded-full shadow-lg">
                Популярно
              </div>
              <h3 className="text-2xl font-bold mb-3">Для педагогов</h3>
              <p className="text-muted-foreground mb-6">
                Бесплатно при работе через школу на Академиус
              </p>
              <ul className="space-y-3 mb-8 text-sm">
                <li className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    ✓
                  </div>
                  <span>Личный кабинет</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    ✓
                  </div>
                  <span>AI-помощник</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    ✓
                  </div>
                  <span>Журнал и ДЗ</span>
                </li>
              </ul>
              <Button className="w-full shadow-lg hover:shadow-xl transition-all">Начать работу</Button>
            </div>

            <div className="bg-card p-8 rounded-xl border border-border hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <h3 className="text-2xl font-bold mb-3">Для родителей</h3>
              <p className="text-muted-foreground mb-6">
                Бесплатно — оплачиваются только занятия
              </p>
              <ul className="space-y-3 mb-8 text-sm">
                <li className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                    ✓
                  </div>
                  <span>Единый дневник</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                    ✓
                  </div>
                  <span>Онлайн-оплата</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                    ✓
                  </div>
                  <span>Уведомления</span>
                </li>
              </ul>
              <Button variant="outline" className="w-full hover:bg-primary hover:text-primary-foreground transition-all">Скачать приложение</Button>
            </div>
          </div>

          <p className="text-muted-foreground mt-8">
            Старт без внедрения за миллионы — можно начать с одного филиала и вырасти до сети
          </p>
        </div>
      </div>
    </section>
  );
}
