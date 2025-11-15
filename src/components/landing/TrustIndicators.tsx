import { Shield, Clock, CheckCircle2, TrendingUp } from 'lucide-react';

export default function TrustIndicators() {
  const stats = [
    { number: '500+', label: 'Школ доверяют нам', icon: TrendingUp },
    { number: '10,000+', label: 'Активных учеников', icon: CheckCircle2 },
    { number: '98%', label: 'Довольных клиентов', icon: Shield },
    { number: '24/7', label: 'Поддержка', icon: Clock },
  ];

  return (
    <section className="py-12 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-y border-border/50">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
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
      </div>
    </section>
  );
}
