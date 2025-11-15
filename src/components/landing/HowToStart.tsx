import { Calendar, Settings, Rocket } from 'lucide-react';

export default function HowToStart() {
  const steps = [
    {
      number: '01',
      icon: Calendar,
      title: 'Оставьте заявку',
      description: 'Заполните форму, и мы свяжемся с вами в течение 15 минут для обсуждения ваших задач'
    },
    {
      number: '02',
      icon: Settings,
      title: 'Настройка за 1 день',
      description: 'Наша команда поможет перенести данные и настроить систему под ваши процессы'
    },
    {
      number: '03',
      icon: Rocket,
      title: 'Начинайте работу',
      description: 'Получите доступ к платформе и начните управлять школой эффективно'
    }
  ];

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Как начать работу
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Три простых шага до полноценной работы в Академиус
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={index} className="relative">
                {/* Connecting line */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-16 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-primary/50 to-transparent" />
                )}
                
                <div className="text-center">
                  <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/70 mb-6 shadow-lg">
                    <Icon className="h-10 w-10 text-primary-foreground" />
                    <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-success flex items-center justify-center text-white font-bold text-sm">
                      {step.number}
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
