import { Star, Quote, ArrowUpRight } from 'lucide-react';

export default function Testimonials() {
  const testimonials = [
    {
      name: 'Мария Иванова',
      role: 'Директор',
      company: 'Языковая школа "Полиглот"',
      location: 'Москва',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop',
      text: 'До Академиуса мы теряли 30% заявок из Instagram и WhatsApp — они просто терялись в разных чатах. Сейчас все лиды автоматически попадают в CRM, а менеджер видит всю историю общения. Конверсия выросла с 25% до 42%, админ экономит 22 часа в месяц на составлении расписания.',
      rating: 5,
      metrics: {
        label: 'Результаты за 3 месяца',
        items: ['Конверсия: 25% → 42%', 'Экономия времени: 22 ч/мес', 'Выручка: +35%']
      }
    },
    {
      name: 'Анна Петрова',
      role: 'Преподаватель английского',
      company: 'Работает в 3 школах',
      location: 'Санкт-Петербург',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop',
      text: 'Раньше я вела 3 разных журнала в Excel, постоянно путалась в расписаниях и не понимала, сколько мне должны. Теперь всё в одном месте — вижу своё расписание на неделю, зарплату в реальном времени, и AI-помощник помогает готовить материалы к урокам за минуты.',
      rating: 5,
      metrics: {
        label: 'Экономия времени',
        items: ['3 школы в одном месте', 'Подготовка урока: 2 часа → 20 мин', 'Прозрачность зарплаты']
      }
    },
    {
      name: 'Елена Смирнова',
      role: 'Родитель',
      company: 'Дети в 4 разных кружках',
      location: 'Казань',
      avatar: 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=200&h=200&fit=crop',
      text: 'Мои дети ходят в языковую школу, на рисование, в шахматы и на программирование. До этого я жила в 4 разных чатах WhatsApp, искала расписание в переписках, а домашки скидывали в фото. Теперь всё в одном приложении — расписание, домашки, оплаты. Больше никакого хаоса!',
      rating: 5,
      metrics: {
        label: 'Удобство',
        items: ['4 кружка в одном приложении', 'Все домашки в одном месте', 'Онлайн-оплата']
      }
    }
  ];

  return (
    <section className="py-20 bg-gradient-subtle">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Что говорят наши пользователи
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Реальные истории от школ, педагогов и родителей, которые уже используют Академиус
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div 
              key={index} 
              className="bg-card p-6 rounded-xl border border-border hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col"
            >
              <Quote className="h-8 w-8 text-primary/20 mb-4" />
              
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                ))}
              </div>

              <p className="text-muted-foreground mb-6 italic text-sm leading-relaxed flex-grow">
                "{testimonial.text}"
              </p>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <img 
                    src={testimonial.avatar} 
                    alt={testimonial.name}
                    className="w-14 h-14 rounded-full object-cover"
                  />
                  <div>
                    <div className="font-semibold">{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                    <div className="text-xs text-muted-foreground">{testimonial.company}</div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <div className="text-xs font-semibold text-primary mb-2 flex items-center gap-1">
                    <ArrowUpRight className="w-3 h-3" />
                    {testimonial.metrics.label}
                  </div>
                  <ul className="space-y-1">
                    {testimonial.metrics.items.map((item, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-0.5">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}