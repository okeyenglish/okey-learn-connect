import { Star, TrendingUp, Linkedin } from 'lucide-react';
import { useState } from 'react';
import VideoTestimonial from './VideoTestimonial';
import ScrollReveal from '@/components/effects/ScrollReveal';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Badge } from '@/components/ui/badge';

export default function Testimonials() {
  const [filter, setFilter] = useState<'all' | 'directors' | 'teachers'>('all');

  const testimonials = [
    {
      name: 'Елена Сергеева',
      role: 'Директор',
      company: 'Языковая школа "Полиглот"',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
      quote: 'Академиус полностью изменил нашу работу. Раньше мы тратили 15 часов в неделю на ручной учёт и составление расписания. Теперь всё автоматизировано.',
      rating: 5,
      category: 'directors' as const,
      verified: true,
      linkedIn: 'https://linkedin.com',
      metrics: [
        { label: 'Экономия времени', value: '15 ч/нед' },
        { label: 'Рост выручки', value: '+40%' }
      ]
    },
    {
      name: 'Дмитрий Козлов',
      role: 'Преподаватель',
      company: 'Музыкальная школа "Гармония"',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400',
      quote: 'Теперь я могу сосредоточиться на преподавании, а не на бумажной работе. Все домашние задания, оценки и отчёты в одном месте.',
      rating: 5,
      category: 'teachers' as const,
      verified: false,
      metrics: [
        { label: 'Экономия времени', value: '10 ч/мес' },
        { label: 'Удовлетворенность', value: '98%' }
      ]
    },
    {
      name: 'Анна Петрова',
      role: 'Основатель',
      company: 'Детский центр "Умка"',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400',
      quote: 'После внедрения Академиуса количество записей выросло на 60%. Родители в восторге от мобильного приложения и автоматических уведомлений.',
      rating: 5,
      category: 'directors' as const,
      verified: true,
      linkedIn: 'https://linkedin.com',
      metrics: [
        { label: 'Рост записей', value: '+60%' },
        { label: 'Лояльность', value: '95%' }
      ]
    },
    {
      name: 'Видео-отзыв директора',
      role: 'Директор',
      company: 'IT-школа "Кодиум"',
      isVideo: true,
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      thumbnail: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800',
      category: 'directors' as const,
    }
  ];

  const filteredTestimonials = filter === 'all' 
    ? testimonials 
    : testimonials.filter(t => t.category === filter);

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6">
        <ScrollReveal>
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Что говорят наши клиенты
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
              Более 10,000 школ уже используют Академиус
            </p>
            <div className="flex justify-center gap-2 flex-wrap">
              {['all', 'directors', 'teachers'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f as any)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    filter === f 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-card border border-border hover:border-primary'
                  }`}
                >
                  {f === 'all' ? 'Все' : f === 'directors' ? 'Директора' : 'Учителя'}
                </button>
              ))}
            </div>
          </div>
        </ScrollReveal>

        <Carousel opts={{ align: "start", loop: true }} className="w-full max-w-6xl mx-auto">
          <CarouselContent>
            {filteredTestimonials.map((testimonial, index) => (
              <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
                <ScrollReveal delay={index * 100}>
                  {testimonial.isVideo ? (
                    <VideoTestimonial
                      videoUrl={testimonial.videoUrl!}
                      thumbnail={testimonial.thumbnail!}
                      name={testimonial.name}
                      role={testimonial.role}
                    />
                  ) : (
                    <div className="bg-card p-6 rounded-lg border border-border hover-scale h-full flex flex-col">
                      <div className="flex items-center gap-4 mb-4">
                        <img src={testimonial.avatar} alt={testimonial.name} className="w-12 h-12 rounded-xl object-cover" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{testimonial.name}</h3>
                            {testimonial.verified && <Badge variant="secondary" className="text-xs">✓ Verified</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                          <p className="text-xs text-muted-foreground">{testimonial.company}</p>
                        </div>
                        {testimonial.linkedIn && (
                          <a href={testimonial.linkedIn} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                            <Linkedin className="w-5 h-5" />
                          </a>
                        )}
                      </div>
                      <div className="flex gap-1 mb-4">
                        {Array.from({ length: testimonial.rating }).map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                        ))}
                      </div>
                      <p className="text-muted-foreground mb-6 flex-1">{testimonial.quote}</p>
                      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                        {testimonial.metrics.map((metric, i) => (
                          <div key={i} className="text-center">
                            <div className="flex items-center justify-center gap-1 text-primary font-bold mb-1">
                              <TrendingUp className="w-4 h-4" />
                              {metric.value}
                            </div>
                            <div className="text-xs text-muted-foreground">{metric.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </ScrollReveal>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </div>
    </section>
  );
}
