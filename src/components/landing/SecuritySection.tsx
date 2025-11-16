import { Shield, Lock, Cloud, Server } from 'lucide-react';
import ScrollReveal from '@/components/effects/ScrollReveal';

const technologies = [
  'React', 'Node.js', 'PostgreSQL', 'Docker', 'Kubernetes'
];

const securityFeatures = [
  {
    icon: Lock,
    title: '256-битное шифрование',
    description: 'Все данные защищены современными протоколами'
  },
  {
    icon: Shield,
    title: 'Соответствие GDPR',
    description: 'Полное соблюдение требований по защите данных'
  },
  {
    icon: Cloud,
    title: 'Резервное копирование',
    description: 'Автоматические бэкапы каждые 6 часов'
  },
  {
    icon: Server,
    title: 'SLA 99.9%',
    description: 'Гарантированная доступность сервиса'
  }
];

export const SecuritySection = () => {
  return (
    <section className="py-24 bg-card">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto">
          {/* Технологии */}
          <ScrollReveal>
            <div>
              <h2 className="text-3xl font-bold text-primary mb-6">
                Технологии
              </h2>
              <p className="text-muted-foreground mb-6">
                Мы используем современный стек технологий для создания быстрого и надёжного сервиса
              </p>
              <div className="flex flex-wrap gap-3">
                {technologies.map((tech, index) => (
                  <div
                    key={index}
                    className="px-4 py-2 bg-background rounded-lg border border-border text-sm font-medium text-foreground"
                  >
                    {tech}
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>

          {/* Безопасность */}
          <ScrollReveal delay={0.2}>
            <div>
              <h2 className="text-3xl font-bold text-primary mb-6">
                Безопасность
              </h2>
              <div className="space-y-4">
                {securityFeatures.map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <div key={index} className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-accent" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground mb-1">
                          {feature.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
};
