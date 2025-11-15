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
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
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

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div 
                  key={index} 
                  className="bg-card p-6 rounded-xl border border-border hover:shadow-xl hover:border-primary/50 transition-all duration-300 group hover:-translate-y-1"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              );
            })}
          </div>

          <div className="text-center bg-gradient-subtle p-8 rounded-2xl border border-border">
            <Button size="lg" className="text-lg px-8 py-6 shadow-lg hover:shadow-xl hover:scale-105 transition-all">
              Оставить заявку как педагог
            </Button>
            <p className="text-sm text-muted-foreground mt-4 max-w-xl mx-auto">
              Расскажите, как вы сейчас работаете — покажем, чем Академиус будет удобнее
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
