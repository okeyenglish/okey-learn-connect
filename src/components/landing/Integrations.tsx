import { MessageCircle, Phone, Video, CreditCard, Zap, Globe, Mail, BarChart } from 'lucide-react';
import { useState } from 'react';

export default function Integrations() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const integrations = [
    { 
      name: 'WhatsApp', 
      icon: MessageCircle, 
      color: 'text-green-500',
      category: 'Коммуникация',
      description: 'Новое сообщение автоматически создаёт лид в CRM',
      badge: 'Популярное'
    },
    { 
      name: 'Телефония', 
      icon: Phone, 
      color: 'text-blue-500',
      category: 'Коммуникация',
      description: 'История звонков синхронизируется с карточкой клиента',
      badge: null
    },
    { 
      name: 'Zoom', 
      icon: Video, 
      color: 'text-purple-500',
      category: 'Обучение',
      description: 'Урок автоматически записывается в расписание',
      badge: null
    },
    { 
      name: 'ЮKassa', 
      icon: CreditCard, 
      color: 'text-orange-500',
      category: 'Оплата',
      description: 'Мгновенная обработка платежей и уведомления',
      badge: null
    },
    { 
      name: 'Telegram', 
      icon: MessageCircle, 
      color: 'text-cyan-500',
      category: 'Коммуникация',
      description: 'Уведомления о платежах приходят мгновенно',
      badge: null
    },
    { 
      name: 'Google Meet', 
      icon: Globe, 
      color: 'text-pink-500',
      category: 'Обучение',
      description: 'Создание видеоконференций в один клик',
      badge: 'Новое'
    },
    { 
      name: 'Email', 
      icon: Mail, 
      color: 'text-red-500',
      category: 'Коммуникация',
      description: 'Автоматические рассылки и напоминания родителям',
      badge: null
    },
    { 
      name: 'Аналитика', 
      icon: BarChart, 
      color: 'text-purple-500',
      category: 'Аналитика',
      description: 'Яндекс Метрика и Google Analytics из коробки',
      badge: null
    },
  ];

  return (
    <section className="py-20 bg-gradient-subtle">
      <div className="container mx-auto px-4 sm:px-6">
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

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {integrations.map((integration, index) => {
            const Icon = integration.icon;
            const isHovered = hoveredIndex === index;
            
            return (
              <div 
                key={index}
                className="relative group"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <div className={`bg-card p-6 rounded-xl border border-border hover:shadow-xl hover:border-primary/50 transition-all duration-300 flex flex-col items-center justify-center gap-3 ${
                  isHovered ? 'scale-105 z-10' : ''
                }`}>
                  {integration.badge && (
                    <span className={`absolute -top-2 -right-2 text-xs font-bold px-2 py-1 rounded-full ${
                      integration.badge === 'Новое' 
                        ? 'bg-success text-success-foreground' 
                        : 'bg-primary text-primary-foreground'
                    }`}>
                      {integration.badge}
                    </span>
                  )}
                  
                  <div className={`p-3 rounded-full bg-background ${integration.color} group-hover:scale-110 transition-transform`}>
                    <Icon className="h-8 w-8" />
                  </div>
                  <div className="text-sm font-medium text-center">{integration.name}</div>
                  <div className="text-xs text-muted-foreground">{integration.category}</div>
                </div>

                {/* Hover tooltip */}
                {isHovered && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 bg-popover border border-border rounded-lg p-4 shadow-xl w-64 z-20 animate-fade-in">
                    <p className="text-sm text-muted-foreground">{integration.description}</p>
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-popover border-l border-t border-border rotate-45"></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="text-center mt-12">
          <p className="text-sm text-muted-foreground">
            И многие другие популярные сервисы
          </p>
        </div>
      </div>
    </section>
  );
}
