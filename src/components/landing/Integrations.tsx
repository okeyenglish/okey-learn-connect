import { MessageCircle, Phone, Video, CreditCard, Globe, Mail, BarChart, Zap } from 'lucide-react';
import { useState } from 'react';
import RippleEffect from '@/components/effects/RippleEffect';
import ScrollReveal from '@/components/effects/ScrollReveal';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from '@/components/ui/badge';

export default function Integrations() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const integrations = [
    { 
      name: 'WhatsApp', 
      icon: MessageCircle, 
      color: 'text-green-500',
      category: 'Коммуникация',
      description: 'Автоматические сообщения в CRM',
      badge: 'Популярное',
      howItWorks: 'Новое сообщение автоматически создаёт лид в CRM с полной историей переписки'
    },
    { 
      name: 'Телефония', 
      icon: Phone, 
      color: 'text-blue-500',
      category: 'Коммуникация',
      description: 'История звонков в карточке',
      howItWorks: 'История звонков синхронизируется с карточкой клиента автоматически'
    },
    { 
      name: 'Zoom', 
      icon: Video, 
      color: 'text-purple-500',
      category: 'Обучение',
      description: 'Автозапись в расписание',
      howItWorks: 'Урок автоматически записывается в расписание при создании встречи'
    },
    { 
      name: 'ЮKassa', 
      icon: CreditCard, 
      color: 'text-orange-500',
      category: 'Оплата',
      description: 'Мгновенная обработка платежей',
      howItWorks: 'Мгновенная обработка платежей и автоматические уведомления клиентам'
    },
    { 
      name: 'Telegram', 
      icon: MessageCircle, 
      color: 'text-cyan-500',
      category: 'Коммуникация',
      description: 'Мгновенные уведомления',
      howItWorks: 'Уведомления о платежах и занятиях приходят мгновенно в Telegram'
    },
    { 
      name: 'Google Meet', 
      icon: Globe, 
      color: 'text-pink-500',
      category: 'Обучение',
      description: 'Видеоконференции в один клик',
      badge: 'Новое',
      howItWorks: 'Создание и управление видеоконференциями прямо из системы'
    },
    { 
      name: 'Email', 
      icon: Mail, 
      color: 'text-red-500',
      category: 'Коммуникация',
      description: 'Автоматические рассылки',
      howItWorks: 'Автоматические рассылки и напоминания родителям по расписанию'
    },
    { 
      name: 'Аналитика', 
      icon: BarChart, 
      color: 'text-purple-500',
      category: 'Аналитика',
      description: 'Метрики из коробки',
      howItWorks: 'Яндекс Метрика и Google Analytics интегрированы из коробки'
    },
  ];

  return (
    <section className="py-20 bg-gradient-subtle">
      <div className="container mx-auto px-4 sm:px-6">
        <ScrollReveal>
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-4">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Интеграции</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Работает с вашими любимыми сервисами
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Академиус легко интегрируется с популярными платформами для общения, оплаты и проведения уроков
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {integrations.map((integration, index) => {
            const Icon = integration.icon;
            const isHovered = hoveredIndex === index;
            
            return (
              <ScrollReveal key={index} delay={index * 50}>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div 
                        className="relative group"
                        onMouseEnter={() => setHoveredIndex(index)}
                        onMouseLeave={() => setHoveredIndex(null)}
                      >
                        <RippleEffect>
                          <div className={`bg-card p-6 rounded-xl border border-border hover:shadow-xl hover:border-primary/50 transition-all duration-300 flex flex-col items-center justify-center gap-3 ${
                            isHovered ? 'scale-105 z-10' : ''
                          }`}>
                            {integration.badge && (
                              <Badge variant="secondary" className="absolute top-2 right-2 text-xs">
                                {integration.badge}
                              </Badge>
                            )}
                            <div className={`w-12 h-12 rounded-xl bg-muted flex items-center justify-center ${integration.color}`}>
                              <Icon className="h-6 w-6" />
                            </div>
                            <div className="text-center">
                              <h3 className="font-semibold mb-1">{integration.name}</h3>
                              <p className="text-xs text-muted-foreground">{integration.description}</p>
                            </div>
                          </div>
                        </RippleEffect>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-semibold mb-1">Как это работает:</p>
                      <p className="text-sm max-w-xs">{integration.howItWorks}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
