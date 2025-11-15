import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function Header() {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 shadow-sm">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Академиус
            </span>
          </Link>

          <nav className="hidden md:flex items-center space-x-6">
            <button
              onClick={() => scrollToSection('features')}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Возможности
            </button>
            <button
              onClick={() => scrollToSection('for-schools')}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Для школ
            </button>
            <button
              onClick={() => scrollToSection('for-teachers')}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Для педагогов
            </button>
            <button
              onClick={() => scrollToSection('for-parents')}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Для родителей
            </button>
            <button
              onClick={() => scrollToSection('pricing')}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Цены
            </button>
            <Link to="/auth">
              <Button variant="default" size="lg" className="shadow-md hover:shadow-lg transition-all">
                Попробовать бесплатно
              </Button>
            </Link>
          </nav>

          <Link to="/auth" className="md:hidden">
            <Button size="sm">Войти</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
