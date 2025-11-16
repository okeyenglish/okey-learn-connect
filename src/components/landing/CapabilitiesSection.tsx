import { 
  Users, Calendar, DollarSign, CreditCard, 
  FileText, BarChart3, Brain, Zap, 
  Smartphone, UserCircle 
} from 'lucide-react';
import ScrollReveal from '@/components/effects/ScrollReveal';

const capabilities = [
  {
    icon: Users,
    title: 'CRM',
    description: 'Управление клиентами и лидами'
  },
  {
    icon: Calendar,
    title: 'Расписание',
    description: 'Автоматическое планирование занятий'
  },
  {
    icon: DollarSign,
    title: 'Финансы и зарплаты',
    description: 'Прозрачный учёт доходов и расходов'
  },
  {
    icon: CreditCard,
    title: 'Онлайн-платежи',
    description: 'Оплата занятий в один клик'
  },
  {
    icon: FileText,
    title: 'Домашние задания',
    description: 'Материалы и проверка работ'
  },
  {
    icon: BarChart3,
    title: 'Аналитика',
    description: 'Отчёты и KPI в реальном времени'
  },
  {
    icon: Brain,
    title: 'AI-инструменты',
    description: 'Умные подсказки и автоматизация'
  },
  {
    icon: Zap,
    title: 'Интеграции',
    description: 'Подключение WhatsApp, Telegram и др.'
  },
  {
    icon: Smartphone,
    title: 'Приложение для родителей',
    description: 'Всё под рукой в смартфоне'
  },
  {
    icon: UserCircle,
    title: 'Кабинет преподавателя',
    description: 'Управление группами и оценками'
  }
];

export const CapabilitiesSection = () => {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <ScrollReveal>
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-primary mb-4">
              Возможности Академиус
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Всё, что нужно для управления образовательным процессом
            </p>
          </div>
        </ScrollReveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 max-w-7xl mx-auto">
          {capabilities.map((capability, index) => {
            const Icon = capability.icon;
            return (
              <ScrollReveal key={index} delay={index * 0.05}>
                <div className="group p-6 bg-card rounded-xl border border-border hover:border-accent hover:shadow-lg transition-all cursor-pointer">
                  <div className="w-12 h-12 mb-4 rounded-lg bg-accent/10 flex items-center justify-center group-hover:bg-accent group-hover:scale-110 transition-all">
                    <Icon className="w-6 h-6 text-accent group-hover:text-white" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">
                    {capability.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {capability.description}
                  </p>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
};
