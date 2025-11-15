import { Star, Quote } from 'lucide-react';

export default function Testimonials() {
  const testimonials = [
    {
      name: 'Мария Иванова',
      role: 'Директор языковой школы',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Maria',
      text: 'Перешли на Академиус полгода назад — это спасение! Больше не теряем лиды, все расписание под контролем. Сэкономили 20 часов в месяц на рутине.',
      rating: 5,
      result: 'Сэкономили 20 часов/месяц'
    },
    {
      name: 'Анна Петрова',
      role: 'Преподаватель английского',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Anna',
      text: 'Наконец-то вижу свою зарплату в реальном времени и могу планировать материалы для уроков в одном месте. AI-помощник просто находка!',
      rating: 5,
      result: 'Работаю в 3 школах — всё в одном месте'
    },
    {
      name: 'Елена Смирнова',
      role: 'Мама двоих детей',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Elena',
      text: 'Дети ходят в 4 разных кружка, и теперь я вижу всё в одном приложении — расписание, домашки, оплаты. Больше не нужно искать информацию в разных чатах!',
      rating: 5,
      result: '4 кружка в одном приложении'
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
            Реальные отзывы от школ, педагогов и родителей, которые уже используют Академиус
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div 
              key={index} 
              className="bg-card p-6 rounded-xl border border-border hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              <Quote className="h-8 w-8 text-primary/20 mb-4" />
              
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                ))}
              </div>

              <p className="text-muted-foreground mb-6 italic">
                "{testimonial.text}"
              </p>

              <div className="flex items-center gap-4 mb-4">
                <img 
                  src={testimonial.avatar} 
                  alt={testimonial.name}
                  className="w-12 h-12 rounded-full"
                />
                <div>
                  <div className="font-semibold">{testimonial.name}</div>
                  <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <div className="text-sm font-medium text-success">
                  ✓ {testimonial.result}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
