import ScrollReveal from '@/components/effects/ScrollReveal';
import { Target, Send, Gift, TrendingUp, Users, BarChart3, MessageCircle, Award } from 'lucide-react';

export const MarketingToolsSection = () => {
  const tools = [
    {
      icon: Target,
      title: 'Сегментация клиентов',
      description: 'Разделяйте базу на "активные семьи", "готовы продлить", "требуется напоминание"',
      badge: 'Smart'
    },
    {
      icon: Send,
      title: 'Массовые рассылки',
      description: 'Email, SMS, WhatsApp и Telegram — отправка акций и напоминаний по целевым группам',
      badge: 'Auto'
    },
    {
      icon: Gift,
      title: 'Подарочные сертификаты',
      description: 'Продавайте абонементы как подарки онлайн и офлайн, с QR-кодами',
      badge: 'New'
    },
    {
      icon: TrendingUp,
      title: 'Возврат "спящих"',
      description: 'Автоматические кампании для семей, которые давно не посещали занятия',
      badge: 'AI'
    },
    {
      icon: Users,
      title: 'Реферальная программа',
      description: 'Бонусы за приведенных друзей — мотивируйте родителей рекомендовать школу',
      badge: 'Growth'
    },
    {
      icon: BarChart3,
      title: 'Аналитика кампаний',
      description: 'Отслеживайте конверсию, открываемость и эффективность каждой рассылки',
      badge: 'Analytics'
    },
    {
      icon: MessageCircle,
      title: 'Чат-боты',
      description: 'Автоответы в мессенджерах для первичных запросов и FAQ',
      badge: 'Bot'
    },
    {
      icon: Award,
      title: 'Программа лояльности',
      description: 'Бонусные баллы за посещаемость, оплату, отзывы — повышайте удержание',
      badge: 'Premium'
    }
  ];

  return (
    <section className="py-24 bg-gradient-to-b from-muted/30 to-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />
      
      <div className="container mx-auto px-4 relative">
        <ScrollReveal>
          <div className="text-center mb-16">
            <div className="inline-block px-4 py-2 bg-primary/10 rounded-full mb-4">
              <span className="text-sm font-semibold text-primary">Маркетинг и лояльность</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-primary via-accent to-primary-glow bg-clip-text text-transparent">
              Удерживайте и возвращайте клиентов
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Встроенные инструменты для маркетинга экономят до 80% времени на продвижение
              и повышают удержание на 40%
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {tools.map((tool, index) => (
            <ScrollReveal key={index} delay={index * 0.1}>
              <div className="group relative p-6 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-elegant hover:-translate-y-1">
                <div className="absolute top-4 right-4">
                  <span className="px-2 py-1 text-xs font-semibold bg-primary/10 text-primary rounded-full">
                    {tool.badge}
                  </span>
                </div>

                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <tool.icon className="w-6 h-6 text-primary" />
                </div>
                
                <h3 className="text-lg font-semibold mb-2 text-foreground pr-16">
                  {tool.title}
                </h3>
                
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {tool.description}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal delay={0.4}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mt-16">
            <div className="text-center p-6 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent border border-primary/20">
              <div className="text-4xl font-bold text-primary mb-2">+40%</div>
              <div className="text-sm text-muted-foreground">Рост удержания клиентов</div>
            </div>
            <div className="text-center p-6 rounded-2xl bg-gradient-to-br from-accent/5 to-transparent border border-accent/20">
              <div className="text-4xl font-bold text-accent mb-2">15-20%</div>
              <div className="text-sm text-muted-foreground">Возврат "спящих" семей</div>
            </div>
            <div className="text-center p-6 rounded-2xl bg-gradient-to-br from-primary-glow/5 to-transparent border border-primary-glow/20">
              <div className="text-4xl font-bold text-primary-glow mb-2">80%</div>
              <div className="text-sm text-muted-foreground">Экономия времени на маркетинг</div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};
