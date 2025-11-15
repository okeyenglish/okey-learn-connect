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
            <div className="bg-card p-8 rounded-lg border border-border">
              <h3 className="text-xl font-bold mb-2">Для школ</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Помесячная подписка за центр или филиал
              </p>
              <Button className="w-full">Узнать стоимость</Button>
            </div>

            <div className="bg-card p-8 rounded-lg border-2 border-primary">
              <div className="inline-block bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full mb-4">
                Популярно
              </div>
              <h3 className="text-xl font-bold mb-2">Для педагогов</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Бесплатно при работе через школу на Академиус
              </p>
              <Button className="w-full">Начать работу</Button>
            </div>

            <div className="bg-card p-8 rounded-lg border border-border">
              <h3 className="text-xl font-bold mb-2">Для родителей</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Бесплатно — оплачиваются только занятия
              </p>
              <Button variant="outline" className="w-full">Скачать приложение</Button>
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
