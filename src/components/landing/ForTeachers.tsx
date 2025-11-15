import { Button } from '@/components/ui/button';
import { Calendar, FileText, DollarSign, Sparkles, Building2 } from 'lucide-react';

export default function ForTeachers() {
  const features = [
    {
      icon: Calendar,
      title: 'Расписание под рукой',
      description: 'Все уроки, группы и индивидуальные занятия — в понятном календаре'
    },
    {
      icon: FileText,
      title: 'Журнал и ДЗ онлайн',
      description: 'Отметки, посещаемость, комментарии — без бумажек и бесконечных Excel'
    },
    {
      icon: DollarSign,
      title: 'Прозрачная зарплата',
      description: 'Сколько уроков проведено, какие ученики оплачены, какой доход за месяц — видно сразу'
    },
    {
      icon: Sparkles,
      title: 'AI-помощник преподавателя',
      description: 'Генератор игр, заданий, планов уроков и упражнений по твоим темам и уровню группы'
    },
    {
      icon: Building2,
      title: 'Работа с несколькими школами',
      description: 'Если педагог ведет занятия в разных центрах — всё равно один личный кабинет и общий календарь'
    }
  ];

  return (
    <section id="for-teachers" className="py-20 bg-background">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-center">
            Для преподавателей
          </h2>
          <p className="text-lg text-muted-foreground mb-12 text-center">
            Академиус упрощает жизнь педагогам: вместо пяти таблиц и чатов — один удобный кабинет
          </p>

          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="bg-card p-6 rounded-lg border border-border">
                  <Icon className="h-8 w-8 text-primary mb-4" />
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              );
            })}
          </div>

          <div className="text-center">
            <Button size="lg" variant="outline">Оставить заявку как педагог</Button>
            <p className="text-sm text-muted-foreground mt-4">
              Расскажите, как вы сейчас работаете — покажем, чем Академиус будет удобнее
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
