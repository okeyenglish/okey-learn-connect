import { Shield, Clock, CheckCircle2, TrendingUp } from 'lucide-react';

export default function TrustIndicators() {
  const stats = [
    { number: '347', label: 'Школ доверяют нам', icon: TrendingUp },
    { number: '8,432', label: 'Активных учеников', icon: CheckCircle2 },
    { number: '18 ч', label: 'Экономия времени/месяц', icon: Clock },
    { number: '9/10', label: 'Рекомендуют коллегам', icon: Shield },
  ];

  const badges = [
    { icon: Shield, text: 'Безопасность данных по ГОСТ' },
    { icon: Clock, text: 'Резервное копирование 24/7' },
    { icon: CheckCircle2, text: 'Техподдержка на русском' },
  ];

  return (
    <section className="py-12 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-y border-border/50">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <div className="text-3xl md:text-4xl font-bold text-primary mb-1">
                  {stat.number}
                </div>
                <div className="text-sm text-muted-foreground">
                  {stat.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Security badges */}
        <div className="flex flex-wrap justify-center gap-6 pt-6 border-t border-border/50">
          {badges.map((badge, index) => {
            const Icon = badge.icon;
            return (
              <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Icon className="h-4 w-4 text-primary" />
                <span>{badge.text}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
