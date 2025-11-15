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
    <section id="for-parents" className="py-20 bg-gradient-subtle">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-center">
            Для родителей и семей
          </h2>
          <p className="text-lg text-muted-foreground mb-12 text-center">
            Академиус превращает занятия ребёнка в понятный путь: виден прогресс, расписание и оплата — 
            без потока сообщений в мессенджерах
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
            <Button size="lg" variant="outline">Узнать о приложении для родителей</Button>
            <p className="text-sm text-muted-foreground mt-4">
              Покажем, как будет выглядеть обучение вашего ребенка в Академиус
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
