import ScrollReveal from '@/components/effects/ScrollReveal';
import { MessageSquare, Smartphone, Globe, Share2, Calendar, CreditCard, Phone, Mail, Users, QrCode } from 'lucide-react';

export const MultiChannelSection = () => {
  const channels = [
    { icon: Smartphone, title: 'Мобильное приложение', description: 'iOS и Android для родителей и учеников' },
    { icon: Globe, title: 'Личный кабинет', description: 'Веб-интерфейс с полным функционалом' },
    { icon: MessageSquare, title: 'WhatsApp/Telegram', description: 'Запись и уведомления через мессенджеры' },
    { icon: Share2, title: 'Социальные сети', description: 'Интеграция с VK, Instagram, Facebook' },
    { icon: Calendar, title: 'Виджет записи', description: 'Встраиваемая форма на ваш сайт' },
    { icon: QrCode, title: 'QR-коды', description: 'Быстрая запись через сканирование' },
    { icon: Phone, title: 'Телефония', description: 'Запись через звонок с CRM' },
    { icon: Mail, title: 'Email-рассылки', description: 'Автоматические уведомления' },
    { icon: CreditCard, title: 'Онлайн-оплата', description: 'Прием платежей из любого канала' },
    { icon: Users, title: 'Партнерская сеть', description: 'Агрегаторы и маркетплейсы' },
  ];

  return (
    <section className="py-24 bg-gradient-to-b from-background via-muted/30 to-background">
      <div className="container mx-auto px-4">
        <ScrollReveal>
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent">
              10+ каналов взаимодействия
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Родители и ученики выбирают удобный способ записи, оплаты и общения.
              Все каналы работают в единой системе.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {channels.map((channel, index) => (
            <ScrollReveal key={index} delay={index * 0.1}>
              <div className="group relative p-6 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-elegant hover:-translate-y-1">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <channel.icon className="w-6 h-6 text-primary" />
                  </div>
                  
                  <h3 className="text-lg font-semibold mb-2 text-foreground">
                    {channel.title}
                  </h3>
                  
                  <p className="text-sm text-muted-foreground">
                    {channel.description}
                  </p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal delay={0.6}>
          <div className="mt-12 text-center">
            <p className="text-lg text-muted-foreground">
              <span className="font-semibold text-primary">Единая база данных</span> — 
              все заявки и платежи синхронизируются автоматически
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};
