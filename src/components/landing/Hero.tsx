import { Button } from '@/components/ui/button';
import { Users, GraduationCap, Heart } from 'lucide-react';

export default function Hero() {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative py-24 md:py-32 overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/5" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.1),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_60%,rgba(139,92,246,0.08),transparent_50%)]" />
      
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="text-center max-w-5xl mx-auto">
          {/* Trust badge */}
          <div className="inline-flex items-center gap-2 bg-success/10 text-success px-4 py-2 rounded-full mb-6 text-sm font-medium animate-fade-in">
            ✓ Более 500 школ уже используют Академиус
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-primary via-purple-600 to-primary bg-clip-text text-transparent">
              CRM и суперприложение
            </span>
            <br />
            <span className="text-foreground">для образования</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-12 leading-relaxed max-w-3xl mx-auto">
            Академиус объединяет управление школой, работу преподавателя и прогресс ребёнка в одной системе — от первого звонка до результата на занятиях
          </p>

          <div className="flex flex-wrap justify-center gap-4 mb-16">
            <Button 
              size="lg" 
              onClick={() => scrollToSection('for-schools')}
              className="text-lg px-8 py-6 shadow-lg hover:shadow-xl hover:scale-105 transition-all"
            >
              <Users className="mr-2 h-5 w-5" />
              Я — школа
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              onClick={() => scrollToSection('for-teachers')}
              className="text-lg px-8 py-6 hover:bg-primary hover:text-primary-foreground transition-all"
            >
              <GraduationCap className="mr-2 h-5 w-5" />
              Я — педагог
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              onClick={() => scrollToSection('for-parents')}
              className="text-lg px-8 py-6 hover:bg-primary hover:text-primary-foreground transition-all"
            >
              <Heart className="mr-2 h-5 w-5" />
              Я — родитель
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-8 text-left">
            <div className="bg-card p-8 rounded-xl border border-border hover:shadow-xl hover:border-primary/50 transition-all duration-300 hover:-translate-y-1">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">Школам</h3>
              <p className="text-muted-foreground">
                CRM, расписание, финансы и отчеты
              </p>
            </div>
            <div className="bg-card p-8 rounded-xl border border-border hover:shadow-xl hover:border-primary/50 transition-all duration-300 hover:-translate-y-1">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <GraduationCap className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">Педагогам</h3>
              <p className="text-muted-foreground">
                Удобный кабинет и AI-ассистент
              </p>
            </div>
            <div className="bg-card p-8 rounded-xl border border-border hover:shadow-xl hover:border-primary/50 transition-all duration-300 hover:-translate-y-1">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Heart className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">Родителям</h3>
              <p className="text-muted-foreground">
                Одно приложение для всех кружков и оплат
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
