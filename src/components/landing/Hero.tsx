import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Building2, GraduationCap, Users } from 'lucide-react';
import HeroImage from './HeroImage';
import DemoModal from './DemoModal';
import VideoModal from './VideoModal';

type Role = 'school' | 'teacher' | 'parent';

const scrollToSection = (id: string) => {
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
  }
};

export default function Hero() {
  const [isDemoOpen, setIsDemoOpen] = useState(false);
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role>('school');

  const roleContent = {
    school: {
      icon: Building2,
      title: 'Единая платформа для управления школой',
      subtitle: 'CRM, расписание, финансы и приложение для родителей в одной системе',
      items: [
        'Все заявки собираются автоматически — больше никаких потерянных сообщений',
        'Расписание, группы и зарплаты формируются за минуты, а не часы',
        'Родители видят всё в приложении — меньше звонков и вопросов'
      ],
      cta: 'Получить бесплатный тур',
      metric: '–18 часов рутины в месяц'
    },
    teacher: {
      icon: GraduationCap,
      title: 'Всё для работы преподавателя в одном месте',
      subtitle: 'Журнал, расписание, зарплата и AI-помощник под рукой',
      items: [
        'Отмечайте посещаемость одним кликом — никаких таблиц',
        'Видите своё расписание, учеников и зарплату в реальном времени',
        'AI генерирует задания и игры за вас'
      ],
      cta: 'Попробовать кабинет',
      metric: '0 пропущенных уроков'
    },
    parent: {
      icon: Users,
      title: 'Всё про обучение ребёнка в одном приложении',
      subtitle: 'Расписание, домашние задания, оплаты и прогресс — всегда под рукой',
      items: [
        'Получайте расписание и напоминания о занятиях автоматически',
        'Видите домашние задания и успехи ребёнка без звонков школе',
        'Оплачивайте уроки онлайн за пару секунд'
      ],
      cta: 'Посмотреть приложение',
      metric: '–80% звонков в школу'
    }
  };

  const RoleIcon = roleContent[selectedRole].icon;

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden py-20 md:py-32">
      <div className="absolute inset-0 bg-gradient-to-br from-surface-elevated/30 via-background to-surface-elevated/20" />
      
      <div className="container relative mx-auto px-4 sm:px-6 max-w-7xl">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="text-left space-y-8 animate-fade-in">
            {/* Role Selector - теперь в самом верху */}
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => setSelectedRole('school')}
                className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 hover:scale-105 ${
                  selectedRole === 'school' 
                    ? 'bg-primary text-primary-foreground shadow-md' 
                    : 'bg-surface-elevated text-foreground hover:bg-surface-elevated/80 hover:shadow-sm'
                }`}
              >
                Для школы
              </button>
              <button 
                onClick={() => setSelectedRole('teacher')}
                className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 hover:scale-105 ${
                  selectedRole === 'teacher' 
                    ? 'bg-primary text-primary-foreground shadow-md' 
                    : 'bg-surface-elevated text-foreground hover:bg-surface-elevated/80 hover:shadow-sm'
                }`}
              >
                Для преподавателя
              </button>
              <button 
                onClick={() => setSelectedRole('parent')}
                className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 hover:scale-105 ${
                  selectedRole === 'parent' 
                    ? 'bg-primary text-primary-foreground shadow-md' 
                    : 'bg-surface-elevated text-foreground hover:bg-surface-elevated/80 hover:shadow-sm'
                }`}
              >
                Для родителя
              </button>
            </div>

            {/* Динамический контент по роли */}
            <div className="space-y-6 animate-fade-in" key={selectedRole}>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight">
                {roleContent[selectedRole].title}
              </h1>

              <p className="text-lg md:text-xl text-text-secondary leading-relaxed">
                {roleContent[selectedRole].subtitle}
              </p>
            </div>

            {/* Преимущества */}
            <div className="space-y-4" key={`items-${selectedRole}`}>
              {roleContent[selectedRole].items.map((item, idx) => (
                <div 
                  key={idx} 
                  className="flex items-start gap-3 animate-fade-in hover:translate-x-1 transition-transform duration-200"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <span className="text-brand-primary mt-1 text-lg font-bold">✓</span>
                  <span className="text-foreground text-base leading-relaxed">{item}</span>
                </div>
              ))}
            </div>

            {/* Метрика */}
            <div 
              className="inline-flex items-center gap-2 bg-status-success/10 px-4 py-2 rounded-lg border border-status-success/20 animate-fade-in hover:scale-105 transition-transform duration-200"
              key={`metric-${selectedRole}`}
            >
              <span className="text-sm font-semibold text-status-success">{roleContent[selectedRole].metric}</span>
            </div>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg" 
                className="text-base px-8 py-6 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
                onClick={() => setIsDemoOpen(true)}
              >
                {roleContent[selectedRole].cta}
              </Button>
              <button 
                onClick={() => setIsVideoOpen(true)}
                className="text-text-secondary hover:text-primary text-base font-medium transition-all duration-300 group inline-flex items-center justify-center sm:justify-start gap-2 hover:gap-3"
              >
                Посмотреть видео (2 мин) <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">→</span>
              </button>
            </div>

            {/* Социальное доказательство */}
            <div className="pt-4">
              <span className="text-sm text-text-secondary">347 школ уже работают в Академиус</span>
            </div>
          </div>

          <div className="hidden lg:block">
            <HeroImage />
          </div>
        </div>
      </div>

      <DemoModal open={isDemoOpen} onOpenChange={setIsDemoOpen} />
      <VideoModal open={isVideoOpen} onOpenChange={setIsVideoOpen} />
    </section>
  );
}
