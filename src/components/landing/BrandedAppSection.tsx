import ScrollReveal from '@/components/effects/ScrollReveal';
import { Smartphone, Palette, Bell, MessageSquare, Calendar, CreditCard, Star, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const BrandedAppSection = () => {
  const features = [
    { icon: Palette, title: 'Ваш бренд', description: 'Логотип, цвета и название школы' },
    { icon: Bell, title: 'Push-уведомления', description: 'Напоминания о занятиях и новостях' },
    { icon: MessageSquare, title: 'Чат с педагогом', description: 'Прямая связь родителей и учителей' },
    { icon: Calendar, title: 'Расписание', description: 'Личное расписание с синхронизацией' },
    { icon: CreditCard, title: 'Оплата в приложении', description: 'Быстрая оплата без комиссий' },
    { icon: Star, title: 'Прогресс ученика', description: 'Оценки, достижения, домашние задания' },
  ];

  const stats = [
    { value: '3x', label: 'Выше вовлеченность' },
    { value: '2x', label: 'Больше онлайн-оплат' },
    { value: '60%', label: 'Меньше пропусков' },
  ];

  return (
    <section className="py-24 bg-gradient-to-b from-background via-primary/5 to-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="container mx-auto px-4 relative">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Content */}
          <div>
            <ScrollReveal>
              <div className="inline-block px-4 py-2 bg-primary/10 rounded-full mb-4">
                <span className="text-sm font-semibold text-primary">White-Label Решение</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent">
                Брендированное мобильное приложение
              </h2>
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                Создайте собственное приложение для родителей и учеников под брендом вашей школы.
                Готовое решение за <span className="font-semibold text-primary">3 дня</span> — без программистов и дизайнеров.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              <div className="grid grid-cols-2 gap-4 mb-8">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3 p-4 rounded-xl bg-card/50 border border-border/50">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <feature.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-1 text-foreground">{feature.title}</h4>
                      <p className="text-xs text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.3}>
              <div className="flex flex-wrap gap-6 mb-8">
                {stats.map((stat, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    <div>
                      <div className="text-2xl font-bold text-primary">{stat.value}</div>
                      <div className="text-xs text-muted-foreground">{stat.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.4}>
              <Button size="lg" className="group">
                Создать своё приложение
                <Smartphone className="ml-2 w-4 h-4 group-hover:scale-110 transition-transform" />
              </Button>
            </ScrollReveal>
          </div>

          {/* Right: App Mockup */}
          <ScrollReveal delay={0.2}>
            <div className="relative">
              {/* Phone Frame */}
              <div className="relative mx-auto w-[280px] h-[570px] bg-gradient-to-br from-gray-900 to-gray-800 rounded-[50px] p-3 shadow-2xl">
                {/* Screen */}
                <div className="w-full h-full bg-background rounded-[40px] overflow-hidden relative">
                  {/* Status Bar */}
                  <div className="bg-card px-6 py-3 flex justify-between items-center text-xs">
                    <span className="font-semibold">9:41</span>
                    <div className="flex gap-1">
                      <div className="w-4 h-4 border border-foreground/30 rounded" />
                      <div className="w-4 h-4 border border-foreground/30 rounded" />
                      <div className="w-4 h-4 border border-foreground/30 rounded" />
                    </div>
                  </div>

                  {/* App Header */}
                  <div className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground px-6 py-4">
                    <div className="text-sm opacity-90">Добро пожаловать!</div>
                    <div className="text-lg font-bold">Иван Петров</div>
                  </div>

                  {/* App Content */}
                  <div className="p-4 space-y-3">
                    <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
                      <div className="flex items-center gap-3 mb-3">
                        <Calendar className="w-5 h-5 text-primary" />
                        <div className="text-sm font-semibold">Следующее занятие</div>
                      </div>
                      <div className="text-xs text-muted-foreground">Завтра, 15:00 - Английский</div>
                      <div className="mt-2 h-2 bg-primary/20 rounded-full overflow-hidden">
                        <div className="h-full w-3/4 bg-primary rounded-full" />
                      </div>
                    </div>

                    <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
                      <div className="flex items-center gap-3 mb-3">
                        <Star className="w-5 h-5 text-accent" />
                        <div className="text-sm font-semibold">Прогресс</div>
                      </div>
                      <div className="text-xs text-muted-foreground">Пройдено 12 из 24 уроков</div>
                    </div>

                    <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
                      <div className="flex items-center gap-3 mb-3">
                        <MessageSquare className="w-5 h-5 text-primary-glow" />
                        <div className="text-sm font-semibold">Новое сообщение</div>
                      </div>
                      <div className="text-xs text-muted-foreground">От преподавателя Анна И.</div>
                    </div>
                  </div>
                </div>

                {/* Home indicator */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/30 rounded-full" />
              </div>

              {/* Floating badges */}
              <div className="absolute -top-4 -right-4 bg-primary text-primary-foreground px-4 py-2 rounded-full text-xs font-semibold shadow-lg animate-bounce">
                iOS & Android
              </div>
              <div className="absolute -bottom-4 -left-4 bg-accent text-accent-foreground px-4 py-2 rounded-full text-xs font-semibold shadow-lg animate-pulse">
                Ваш бренд
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
};
