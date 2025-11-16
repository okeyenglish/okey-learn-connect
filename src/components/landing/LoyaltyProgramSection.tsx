import { Gift, Star, CreditCard, Trophy, TrendingUp, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import ScrollReveal from '@/components/effects/ScrollReveal';

export const LoyaltyProgramSection = () => {
  const features = [
    {
      icon: Gift,
      title: 'Подарочные сертификаты',
      description: 'Продавайте электронные сертификаты на любую сумму. Отличный подарок для близких.',
      stats: '+25% доп. выручки',
    },
    {
      icon: Star,
      title: 'Бонусные баллы',
      description: 'Начисляйте баллы за посещения и оплату. Семьи могут тратить их на дополнительные занятия.',
      stats: '40% используют бонусы',
    },
    {
      icon: CreditCard,
      title: 'Абонементы и пакеты',
      description: 'Создавайте выгодные пакеты занятий. Клиенты могут купить их онлайн с предоплатой.',
      stats: '+35% повторных продаж',
    },
    {
      icon: Trophy,
      title: 'Программа лояльности',
      description: 'Автоматические скидки для постоянных клиентов. Уровни: Базовый, Золотой, Платиновый.',
      stats: '65% в программе',
    },
    {
      icon: TrendingUp,
      title: 'Реферальная программа',
      description: 'Родители приводят друзей и получают бонусы. Лучший канал привлечения новых учеников.',
      stats: 'x2.5 рост по рефералам',
    },
    {
      icon: Users,
      title: 'Семейные скидки',
      description: 'Автоматические скидки при обучении нескольких детей из одной семьи.',
      stats: '30% семейных клиентов',
    },
  ];

  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <ScrollReveal>
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Программы лояльности и удержание
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Увеличьте повторные продажи и средний чек с помощью встроенных инструментов лояльности
            </p>
          </div>
        </ScrollReveal>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <ScrollReveal key={index} delay={index * 0.1}>
                <Card className="h-full hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground mb-4">{feature.description}</p>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-sm font-medium text-primary">
                      {feature.stats}
                    </div>
                  </CardContent>
                </Card>
              </ScrollReveal>
            );
          })}
        </div>

        <ScrollReveal delay={0.2}>
          <Card className="bg-gradient-to-br from-primary/10 to-purple-500/10 border-2 border-primary/20">
            <CardContent className="p-8">
              <div className="grid md:grid-cols-3 gap-8 text-center">
                <div>
                  <div className="text-4xl font-bold text-primary mb-2">+45%</div>
                  <div className="text-muted-foreground">Повторных покупок</div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-primary mb-2">+30%</div>
                  <div className="text-muted-foreground">Средний чек</div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-primary mb-2">−50%</div>
                  <div className="text-muted-foreground">Отток клиентов</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </ScrollReveal>
      </div>
    </section>
  );
};
