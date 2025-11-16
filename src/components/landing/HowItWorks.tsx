import { Users, Calendar, CreditCard, BarChart3, Sparkles } from 'lucide-react';

export default function HowItWorks() {
  const steps = [
    {
      icon: Users,
      title: "Соберите все заявки в одном месте",
      description: "Подключите WhatsApp, Telegram, соцсети — все обращения автоматически попадают в CRM. Ни одна заявка не потеряется.",
      color: "from-category-crm to-category-crm/50",
      delay: "0s"
    },
    {
      icon: Calendar,
      title: "Создайте расписание за минуты",
      description: "Алгоритмы подберут оптимальное время для каждой группы. Учителя и ученики получат уведомления автоматически.",
      color: "from-category-education to-category-education/50",
      delay: "0.2s"
    },
    {
      icon: CreditCard,
      title: "Автоматизируйте финансы",
      description: "Отслеживайте платежи, формируйте зарплаты, создавайте отчёты — всё это в пару кликов. Родители оплачивают онлайн.",
      color: "from-category-finance to-category-finance/50",
      delay: "0.4s"
    },
    {
      icon: BarChart3,
      title: "Анализируйте результаты",
      description: "Получайте аналитику по успеваемости, посещаемости, финансам. AI подскажет, где можно улучшить процессы.",
      color: "from-category-tech to-category-tech/50",
      delay: "0.6s"
    }
  ];

  return (
    <section className="relative py-24 overflow-hidden bg-gradient-to-b from-background via-muted/30 to-background">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-br from-purple-500/20 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-16 space-y-6 animate-fade-in">
          <div className="inline-flex items-center gap-3 px-5 py-2.5 glass-card backdrop-blur-xl border border-primary/20">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span className="text-sm font-semibold bg-gradient-to-r from-primary via-purple-500 to-primary bg-clip-text text-transparent">
              Простая интеграция за 4 шага
            </span>
          </div>

          <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
            <span className="bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
              Как это работает
            </span>
          </h2>
          
          <p className="text-xl sm:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            От регистрации до полной автоматизации школы — всего несколько простых шагов
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-2 gap-8 lg:gap-10 max-w-6xl mx-auto">
          {steps.map((step, index) => (
            <div
              key={index}
              className="group relative"
              style={{
                animation: `fade-in-up 0.8s ease-out ${step.delay} backwards`
              }}
            >
              {/* Card */}
              <div className="glass-card p-8 rounded-2xl hover:scale-105 transition-all duration-300 h-full relative overflow-hidden">
                {/* Step number */}
                <div className="absolute -top-4 -left-4 w-14 h-14 rounded-full bg-gradient-to-br from-primary via-purple-500 to-primary flex items-center justify-center shadow-xl group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
                  <span className="text-2xl font-bold text-white">{index + 1}</span>
                </div>

                {/* Icon */}
                <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg`}>
                  <step.icon className="w-10 h-10 text-white" />
                </div>

                {/* Content */}
                <h3 className="text-2xl sm:text-3xl font-bold mb-4 group-hover:text-primary transition-colors leading-tight">
                  {step.title}
                </h3>
                
                <p className="text-muted-foreground leading-relaxed text-lg">
                  {step.description}
                </p>

                {/* Hover glow */}
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${step.color} opacity-0 group-hover:opacity-10 blur-xl transition-opacity duration-300 -z-10`} />
              </div>

              {/* Connecting line (only for specific positions) */}
              {index === 0 && (
                <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-primary/50 to-transparent z-20" />
              )}
              {index === 2 && (
                <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-primary/50 to-transparent z-20" />
              )}
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-20 space-y-6 animate-fade-in" style={{ animationDelay: '0.8s' }}>
          <p className="text-xl text-muted-foreground">
            Готовы начать? Создайте аккаунт за 2 минуты
          </p>
          <div className="inline-flex items-center gap-3 px-6 py-4 glass-card backdrop-blur-xl border border-primary/20">
            <span className="text-3xl animate-pulse">🚀</span>
            <span className="text-base font-bold bg-gradient-to-r from-primary via-purple-500 to-primary bg-clip-text text-transparent">
              Первые 14 дней — бесплатно, без привязки карты
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
