import { MessageCircle, Phone, Video, CreditCard, Zap, Globe } from 'lucide-react';

export default function Integrations() {
  const integrations = [
    { name: 'WhatsApp', icon: MessageCircle, color: 'text-green-500' },
    { name: 'Телефония', icon: Phone, color: 'text-blue-500' },
    { name: 'Zoom', icon: Video, color: 'text-purple-500' },
    { name: 'Оплата', icon: CreditCard, color: 'text-orange-500' },
    { name: 'Telegram', icon: MessageCircle, color: 'text-cyan-500' },
    { name: 'Вебинары', icon: Globe, color: 'text-pink-500' },
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

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 max-w-5xl mx-auto">
          {integrations.map((integration, index) => {
            const Icon = integration.icon;
            return (
              <div 
                key={index}
                className="bg-card p-6 rounded-xl border border-border hover:shadow-lg hover:scale-105 transition-all duration-300 flex flex-col items-center justify-center gap-3"
              >
                <div className={`p-3 rounded-full bg-background ${integration.color}`}>
                  <Icon className="h-8 w-8" />
                </div>
                <div className="text-sm font-medium text-center">{integration.name}</div>
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
