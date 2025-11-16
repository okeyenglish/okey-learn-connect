import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Building2, GraduationCap, Users } from 'lucide-react';
import HeroImage from './HeroImage';
import DemoModal from './DemoModal';
import VideoModal from './VideoModal';
import AnimatedBackground from '../effects/AnimatedBackground';

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
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

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
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-background via-background to-muted/10">
      {/* Enhanced animated background with 3D depth */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.1),transparent_50%)] animate-pulse" />
        
        {/* 3D floating elements */}
        <div 
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-category-tech/10 to-transparent rounded-full blur-3xl animate-float"
          style={{
            transform: `translate(${mousePosition.x}px, ${mousePosition.y}px)`,
            transition: 'transform 0.3s ease-out'
          }}
        />
        <div 
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-br from-category-crm/10 to-transparent rounded-full blur-3xl animate-float"
          style={{
            transform: `translate(${-mousePosition.x}px, ${-mousePosition.y}px)`,
            transition: 'transform 0.3s ease-out',
            animationDelay: '2s'
          }}
        />
        <div 
          className="absolute top-1/2 left-1/2 w-64 h-64 bg-gradient-to-br from-category-education/10 to-transparent rounded-full blur-3xl animate-float"
          style={{
            transform: `translate(${mousePosition.x * 0.5}px, ${mousePosition.y * 0.5}px)`,
            transition: 'transform 0.3s ease-out',
            animationDelay: '1s'
          }}
        />
      </div>
      
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
              {/* Dynamic Title with Icon */}
              <div className="space-y-4">
                <div className="inline-flex items-center gap-3 px-4 py-2 glass-card">
                  <RoleIcon className="w-5 h-5 text-[hsl(var(--accent-purple))]" />
                  <span className="text-sm font-medium gradient-text">
                    {selectedRole === 'school' ? 'Для школ' : selectedRole === 'teacher' ? 'Для преподавателей' : 'Для родителей'}
                  </span>
                </div>
                
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight gradient-text" style={{
                  textShadow: '0 0 40px rgba(139, 92, 246, 0.3), 0 0 80px rgba(59, 130, 246, 0.2)'
                }}>
                  {roleContent[selectedRole].title}
                </h1>
                
                <p className="text-xl text-muted-foreground max-w-2xl">
                  {roleContent[selectedRole].subtitle}
                </p>
              </div>
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
              className="inline-flex items-center gap-2 px-4 py-2 glass-card animate-fade-in hover:scale-105 transition-all duration-200"
              key={`metric-${selectedRole}`}
              style={{
                boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)'
              }}
            >
              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[hsl(152,69%,42%)] to-[hsl(189,94%,43%)] animate-pulse" />
              <span className="text-sm font-medium bg-gradient-to-r from-[hsl(152,69%,42%)] to-[hsl(189,94%,43%)] bg-clip-text text-transparent">
                {roleContent[selectedRole].metric}
              </span>
            </div>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg"
                onClick={() => setIsDemoOpen(true)}
                className="text-lg px-8 py-6 glow-button hover:scale-105 transition-all duration-300 bg-gradient-to-r from-[hsl(212,85%,58%)] via-[hsl(262,83%,68%)] to-[hsl(330,81%,60%)] text-white border-0"
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
