import { Building2, GraduationCap, Users } from 'lucide-react';

export default function HowItWorks() {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Одна платформа — три роли, общий результат
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Академиус связывает школу, педагога и родителя в один понятный процесс. 
            Управление бизнесом, учебный процесс и коммуникация с семьей больше не живут в разных сервисах.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-4">Школа</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li>Принимает лиды и заявки</li>
              <li>Формирует группы, расписание и оплату</li>
              <li>Видит аналитику по филиалам и менеджерам</li>
            </ul>
          </div>

          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
              <GraduationCap className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-4">Педагог</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li>Видит расписание и список учеников</li>
              <li>Заполняет журнал и ДЗ</li>
              <li>Получает прозрачный расчет зарплаты</li>
            </ul>
          </div>

          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-4">Родитель</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li>Получает уведомления и ДЗ</li>
              <li>Оплачивает занятия онлайн</li>
              <li>Видит прогресс и историю обучения</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
