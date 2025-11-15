import { Button } from '@/components/ui/button';
import { Smartphone, BookOpen, CreditCard, Users } from 'lucide-react';

export default function ForParents() {
  const features = [
    {
      icon: Smartphone,
      title: 'Единое приложение для обучения',
      description: 'Расписание, предметы, преподаватели и филиалы — всё в одном месте'
    },
    {
      icon: BookOpen,
      title: 'Домашние задания и комментарии',
      description: 'Понимание, что задают, что уже сделано, какие есть успехи и зоны роста'
    },
    {
      icon: CreditCard,
      title: 'Онлайн-оплата и напоминания',
      description: 'Удобная оплата и уведомления, чтобы ничего не пропустить'
    },
    {
      icon: Users,
      title: 'Несколько детей и школ — один кабинет',
      description: 'Если у ребёнка несколько кружков/центров, Академиус собирает всё в едином семейном профиле'
    }
  ];

  return (
    <section id="for-parents" className="py-20 bg-gradient-to-br from-background via-primary/5 to-background">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-4">
              <span className="text-sm font-medium text-primary">Для семей</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Для родителей и семей
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Академиус превращает занятия ребёнка в понятный путь: виден прогресс, расписание и оплата — 
              без потока сообщений в мессенджерах
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div 
                  key={index} 
                  className="bg-card p-8 rounded-xl border border-border hover:shadow-xl hover:border-primary/50 transition-all duration-300 group hover:-translate-y-1"
                >
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-success/20 to-success/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Icon className="h-7 w-7 text-success" />
                  </div>
                  <h3 className="text-lg font-bold mb-3 group-hover:text-primary transition-colors">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              );
            })}
          </div>

          <div className="text-center bg-gradient-to-r from-success/10 via-success/5 to-success/10 p-8 rounded-2xl border border-success/20">
            <Button size="lg" className="text-lg px-8 py-6 bg-success hover:bg-success-600 shadow-lg hover:shadow-xl hover:scale-105 transition-all">
              Узнать о приложении для родителей
            </Button>
            <p className="text-sm text-muted-foreground mt-4 max-w-xl mx-auto">
              Покажем, как будет выглядеть обучение вашего ребенка в Академиус
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
