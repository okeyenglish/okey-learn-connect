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
    <section className="py-20 md:py-32 bg-gradient-subtle">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
            CRM и суперприложение для школ, педагогов и родителей
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-12 leading-relaxed">
            Академиус объединяет управление школой, работу преподавателя и прогресс ребёнка в одной системе — от первого звонка до результата на занятиях
          </p>

          <div className="flex flex-wrap justify-center gap-4 mb-16">
            <Button size="lg" onClick={() => scrollToSection('for-schools')}>
              <Users className="mr-2 h-5 w-5" />
              Я — школа
            </Button>
            <Button size="lg" variant="outline" onClick={() => scrollToSection('for-teachers')}>
              <GraduationCap className="mr-2 h-5 w-5" />
              Я — педагог
            </Button>
            <Button size="lg" variant="outline" onClick={() => scrollToSection('for-parents')}>
              <Heart className="mr-2 h-5 w-5" />
              Я — родитель
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-8 text-left">
            <div className="bg-card p-6 rounded-lg border border-border">
              <Users className="h-10 w-10 text-primary mb-4" />
              <h3 className="font-semibold mb-2">Школам</h3>
              <p className="text-sm text-muted-foreground">
                CRM, расписание, финансы и отчеты
              </p>
            </div>
            <div className="bg-card p-6 rounded-lg border border-border">
              <GraduationCap className="h-10 w-10 text-primary mb-4" />
              <h3 className="font-semibold mb-2">Педагогам</h3>
              <p className="text-sm text-muted-foreground">
                Удобный кабинет и AI-ассистент
              </p>
            </div>
            <div className="bg-card p-6 rounded-lg border border-border">
              <Heart className="h-10 w-10 text-primary mb-4" />
              <h3 className="font-semibold mb-2">Родителям</h3>
              <p className="text-sm text-muted-foreground">
                Одно приложение для всех кружков и оплат
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
