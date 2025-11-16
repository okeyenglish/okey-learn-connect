import { useState } from 'react';
import { MessageCircle, Users, BookOpen, CreditCard, FileText, ArrowRight } from 'lucide-react';

interface FlowStep {
  icon: any;
  title: string;
  description: string;
  metric: string;
}

export default function FlowDiagram() {
  const [activeStep, setActiveStep] = useState<number | null>(null);

  const steps: FlowStep[] = [
    {
      icon: MessageCircle,
      title: 'Заявка',
      description: 'Лид автоматически попадает в CRM из любого канала',
      metric: '30 сек вместо 10 мин'
    },
    {
      icon: Users,
      title: 'CRM',
      description: 'Воронка продаж, автоматические напоминания, история взаимодействий',
      metric: '0% потерянных лидов'
    },
    {
      icon: BookOpen,
      title: 'Занятие',
      description: 'Расписание, электронный журнал, автоматические уведомления',
      metric: '95% посещаемость'
    },
    {
      icon: CreditCard,
      title: 'Оплата',
      description: 'Онлайн-оплата, абонементы, рассрочка, автоплатежи',
      metric: '3x быстрее сборы'
    },
    {
      icon: FileText,
      title: 'Отчёт',
      description: 'Аналитика, финансы, успеваемость в реальном времени',
      metric: '18 часов экономии'
    }
  ];

  return (
    <div className="relative py-12">
      <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-0">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = activeStep === index;
          
          return (
            <div key={index} className="flex items-center">
              {/* Step card */}
              <div
                className={`relative group cursor-pointer transition-all duration-300 ${
                  isActive ? 'scale-110 z-10' : 'scale-100'
                }`}
                onMouseEnter={() => setActiveStep(index)}
                onMouseLeave={() => setActiveStep(null)}
              >
                <div className={`bg-card p-6 rounded-xl border-2 transition-all duration-300 ${
                  isActive 
                    ? 'border-primary shadow-2xl shadow-primary/20' 
                    : 'border-border shadow-lg hover:border-primary/50'
                }`}>
                  {/* Icon */}
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 transition-all duration-300 ${
                    isActive 
                      ? 'bg-primary text-primary-foreground animate-pulse' 
                      : 'bg-primary/10 text-primary'
                  }`}>
                    <Icon className="w-8 h-8" />
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-bold mb-2 text-center">{step.title}</h3>

                  {/* Metric badge */}
                  <div className="text-xs font-semibold text-center text-success bg-success/10 px-3 py-1 rounded-full">
                    {step.metric}
                  </div>

                  {/* Tooltip */}
                  {isActive && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 bg-popover border border-border rounded-lg p-4 shadow-xl w-64 z-20 animate-fade-in">
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-popover border-l border-t border-border rotate-45"></div>
                    </div>
                  )}
                </div>

                {/* Data flow animation */}
                {isActive && (
                  <div className="absolute inset-0 rounded-xl">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-primary/20 rounded-full animate-ping"></div>
                  </div>
                )}
              </div>

              {/* Arrow */}
              {index < steps.length - 1 && (
                <div className="hidden md:flex items-center mx-4">
                  <div className="relative w-16 h-1 bg-gradient-to-r from-primary/50 to-primary/20">
                    {/* Animated dot */}
                    <div className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-primary rounded-full animate-flow"></div>
                  </div>
                  <ArrowRight className="w-6 h-6 text-primary ml-2" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Process summary */}
      <div className="text-center mt-12 p-6 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-xl border border-primary/20">
        <h4 className="text-xl font-bold mb-2">Единый процесс без разрывов</h4>
        <p className="text-muted-foreground">
          Все данные автоматически передаются между этапами. Никаких потерь информации и ручного ввода.
        </p>
      </div>
    </div>
  );
}
