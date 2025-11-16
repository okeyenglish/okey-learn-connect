import { Users, GraduationCap, Building2, BookOpen } from 'lucide-react';
import ScrollReveal from '@/components/effects/ScrollReveal';

const metrics = [
  {
    icon: Building2,
    value: '2 500+',
    label: 'школ'
  },
  {
    icon: Users,
    value: '150 000+',
    label: 'учеников'
  },
  {
    icon: GraduationCap,
    value: '12 000+',
    label: 'учителей'
  },
  {
    icon: BookOpen,
    value: '5 000 000+',
    label: 'уроков'
  }
];

// Логотипы школ-партнёров (замените на реальные)
const partnerLogos = [
  { name: 'Полиглот', logo: '/placeholder.svg' },
  { name: 'Умники', logo: '/placeholder.svg' },
  { name: 'CodeKids', logo: '/placeholder.svg' },
  { name: 'Лингва', logo: '/placeholder.svg' },
  { name: 'Эрудит', logo: '/placeholder.svg' },
];

export default function ProofBar() {
  return (
    <section className="py-16 bg-card border-y border-border">
      <div className="container mx-auto px-4">
        {/* Метрики */}
        <ScrollReveal>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            {metrics.map((metric, index) => {
              const Icon = metric.icon;
              return (
                <div key={index} className="text-center">
                  <div className="flex justify-center mb-3">
                    <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                      <Icon className="w-6 h-6 text-accent" />
                    </div>
                  </div>
                  <div className="text-3xl md:text-4xl font-bold text-primary mb-1">
                    {metric.value}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {metric.label}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollReveal>

        {/* Описание метрик */}
        <ScrollReveal delay={0.2}>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            У нас учатся более 150 000 детей в 2 500+ образовательных учреждениях
          </p>
        </ScrollReveal>

        {/* Логотипы партнёров */}
        <ScrollReveal delay={0.3}>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
            {partnerLogos.map((partner, index) => (
              <div
                key={index}
                className="grayscale hover:grayscale-0 transition-all opacity-60 hover:opacity-100"
              >
                <img
                  src={partner.logo}
                  alt={partner.name}
                  className="h-8 md:h-10 object-contain"
                />
              </div>
            ))}
          </div>
        </ScrollReveal>

        {/* Дата актуальности */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          Данные актуальны на ноябрь 2025
        </p>
      </div>
    </section>
  );
}
