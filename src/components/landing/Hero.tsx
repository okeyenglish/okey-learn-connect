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
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden py-32">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-background to-accent/20" />
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.015]" />
      
      <div className="container relative mx-auto px-4 sm:px-6 max-w-7xl">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          <div className="text-left space-y-10">
            <div className="space-y-6">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight">
                Платформа, которая соединяет школу, преподавателя и родителя
              </h1>

              <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed">
                Управляйте школой, работой педагогов и прогрессом детей в одной системе
              </p>
            </div>

            {/* Role Selector */}
            <div className="space-y-6">
              <div className="flex flex-wrap gap-3">
                <button 
                  onClick={() => setSelectedRole('school')}
                  className={`px-7 py-4 rounded-xl font-medium transition-all ${
                    selectedRole === 'school' 
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25' 
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  Я представляю школу
                </button>
                <button 
                  onClick={() => setSelectedRole('teacher')}
                  className={`px-7 py-4 rounded-xl font-medium transition-all ${
                    selectedRole === 'teacher' 
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25' 
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  Я преподаватель
                </button>
                <button 
                  onClick={() => setSelectedRole('parent')}
                  className={`px-7 py-4 rounded-xl font-medium transition-all ${
                    selectedRole === 'parent' 
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25' 
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  Я родитель
                </button>
              </div>

              {/* Role Content */}
              <div className="bg-card border border-border/50 rounded-2xl p-8 min-h-[240px] shadow-sm">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <RoleIcon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-2xl font-semibold">{roleContent[selectedRole].title}</h3>
                </div>
                <ul className="space-y-4">
                  {roleContent[selectedRole].items.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <span className="text-primary mt-1 text-lg">✓</span>
                      <span className="text-foreground text-lg leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-5">
              <Button 
                size="lg" 
                className="text-lg px-10 py-7 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/25 transition-all"
                onClick={() => setIsDemoOpen(true)}
              >
                Получить демо
              </Button>
              <button 
                onClick={() => setIsVideoOpen(true)}
                className="text-foreground hover:text-primary text-lg font-medium transition-colors group"
              >
                Посмотреть видео (2 мин) <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
              </button>
            </div>

            {/* Single Stats Line */}
            <div className="inline-flex items-center gap-3 bg-card/50 backdrop-blur-sm px-6 py-3 rounded-full border border-border/50 shadow-sm">
              <span className="text-sm font-medium text-foreground">347 школ уже работают в Академиус</span>
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
