import { CheckCircle2, Globe, Music, BookOpen, Users, GraduationCap } from 'lucide-react';
import ScrollReveal from '@/components/effects/ScrollReveal';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

export default function WhoIsItFor() {
  const audiences = [
    {
      title: 'Языковые школы и центры',
      icon: Globe,
      image: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=800',
      size: '10-500 учеников',
      features: ['CRM для лидов', 'Расписание групп', 'Тестирование уровня'],
      examples: ['British Council', 'English First'],
      clientCount: 320,
      description: 'Управляйте группами, отслеживайте прогресс учеников и автоматизируйте тестирование'
    },
    {
      title: 'Детские развивающие центры',
      icon: Users,
      image: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800',
      size: '20-300 учеников',
      features: ['Мобильное приложение для родителей', 'Журнал занятий', 'Уведомления'],
      examples: ['Baby Club', 'Умка'],
      clientCount: 450,
      description: 'Держите родителей в курсе успехов детей через мобильное приложение'
    },
    {
      title: 'Онлайн-школы и репетиторы',
      icon: BookOpen,
      image: 'https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=800',
      size: '1-1000 учеников',
      features: ['Интеграция с Zoom', 'Онлайн-расписание', 'Автоматические напоминания'],
      examples: ['Skyeng', 'Puzzle English'],
      clientCount: 280,
      description: 'Проводите онлайн-уроки и управляйте расписанием из одной системы'
    },
    {
      title: 'Танцевальные, спортивные студии',
      icon: Music,
      image: 'https://images.unsplash.com/photo-1504609773096-104ff2c73ba4?w=800',
      size: '30-500 учеников',
      features: ['Абонементы', 'Посещаемость', 'Финансовый учёт'],
      examples: ['Dance Studio', 'FitKids'],
      clientCount: 190,
      description: 'Управляйте абонементами, отслеживайте посещаемость и финансы'
    },
    {
      title: 'Сети школ с филиалами',
      icon: GraduationCap,
      image: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800',
      size: '100-5000 учеников',
      features: ['Многофилиальность', 'Сводная отчётность', 'Централизованное управление'],
      examples: ['Skyeng Network', 'Maximum Education'],
      clientCount: 85,
      description: 'Управляйте несколькими филиалами из единого центра'
    }
  ];

  return (
    <section className="py-20 bg-gradient-subtle">
      <div className="container mx-auto px-4 sm:px-6">
        <ScrollReveal>
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Кому подходит Академиус
            </h2>
            <p className="text-muted-foreground text-lg">
              Платформа для образовательных организаций любого размера и направления
            </p>
          </div>
        </ScrollReveal>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {audiences.map((audience, index) => {
            const Icon = audience.icon;
            return (
              <ScrollReveal key={index} delay={index * 100}>
                <Card className="group overflow-hidden hover-scale h-full">
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={audience.image}
                      alt={audience.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-primary/20 backdrop-blur-sm flex items-center justify-center">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <Badge variant="secondary" className="backdrop-blur-sm">
                          {audience.clientCount}+ школ
                        </Badge>
                      </div>
                      <h3 className="text-white font-bold text-lg">{audience.title}</h3>
                      <p className="text-white/80 text-sm">{audience.size}</p>
                    </div>
                  </div>

                  <div className="p-6">
                    <p className="text-muted-foreground text-sm mb-4">
                      {audience.description}
                    </p>

                    <div className="space-y-2 mb-4">
                      {audience.features.map((feature, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-4 border-t border-border">
                      <p className="text-xs text-muted-foreground mb-2">Примеры клиентов:</p>
                      <div className="flex flex-wrap gap-1">
                        {audience.examples.map((example, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {example}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
