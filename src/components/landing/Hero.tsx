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
      title: 'CRM и управление',
      items: [
        'Принимайте заявки и ведите базу учеников',
        'Формируйте группы и расписание',
        'Контролируйте выручку и загрузку филиалов'
      ]
    },
    teacher: {
      icon: GraduationCap,
      title: 'Личный кабинет и AI',
      items: [
        'Ведите журнал и выдавайте домашние задания',
        'Видите своё расписание и список учеников',
        'Получайте прозрачный расчёт зарплаты'
      ]
    },
    parent: {
      icon: Users,
      title: 'Приложение и оплаты',
      items: [
        'Получайте расписание и напоминания',
        'Видите домашние задания и прогресс ребёнка',
        'Оплачивайте занятия онлайн в пару кликов'
      ]
    }
  };

  const RoleIcon = roleContent[selectedRole].icon;

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden py-20">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/5" />
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" />
      
      <div className="container relative mx-auto px-4 sm:px-6 max-w-7xl">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="text-left space-y-8">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
              Платформа, которая соединяет школу, преподавателя и родителя
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground">
              Академиус — CRM и суперприложение для управления школой, работой преподавателя и контролем прогресса ребёнка
            </p>

            {/* Role Selector */}
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <button 
                  onClick={() => setSelectedRole('school')}
                  className={`px-6 py-3 rounded-lg font-medium transition-all ${
                    selectedRole === 'school' 
                      ? 'bg-primary text-primary-foreground shadow-lg' 
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  Я представляю школу
                </button>
                <button 
                  onClick={() => setSelectedRole('teacher')}
                  className={`px-6 py-3 rounded-lg font-medium transition-all ${
                    selectedRole === 'teacher' 
                      ? 'bg-primary text-primary-foreground shadow-lg' 
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  Я преподаватель
                </button>
                <button 
                  onClick={() => setSelectedRole('parent')}
                  className={`px-6 py-3 rounded-lg font-medium transition-all ${
                    selectedRole === 'parent' 
                      ? 'bg-primary text-primary-foreground shadow-lg' 
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  Я родитель
                </button>
              </div>

              {/* Role Content */}
              <div className="bg-card border border-border rounded-xl p-6 min-h-[200px]">
                <div className="flex items-center gap-3 mb-4">
                  <RoleIcon className="h-6 w-6 text-primary" />
                  <h3 className="text-xl font-semibold">{roleContent[selectedRole].title}</h3>
                </div>
                <ul className="space-y-3">
                  {roleContent[selectedRole].items.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-primary mt-1">✓</span>
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg" 
                className="text-lg px-8 py-6 bg-green-600 hover:bg-green-700 text-white"
                onClick={() => setIsDemoOpen(true)}
              >
                Получить демо за 15 минут
              </Button>
              <button 
                onClick={() => setIsVideoOpen(true)}
                className="text-primary hover:underline text-lg font-medium"
              >
                Посмотреть видео (2 мин) →
              </button>
            </div>

            {/* Single Stats Line */}
            <div className="text-sm text-muted-foreground">
              9 филиалов • 110+ активных групп • 1000+ учеников
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
