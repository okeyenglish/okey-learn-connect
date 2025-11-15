import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Phone, Mail } from 'lucide-react';
import DemoModal from './DemoModal';

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isDemoOpen, setIsDemoOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <header 
        className={`sticky top-0 z-50 w-full border-b transition-all duration-300 ${
          isScrolled 
            ? 'border-border/40 bg-background/80 backdrop-blur-lg shadow-md' 
            : 'border-border/40 bg-background/95 backdrop-blur-md shadow-sm'
        }`}
      >
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center space-x-2">
              <span className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Академиус
              </span>
            </Link>

            <nav className="hidden lg:flex items-center space-x-6">
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
              
              <div className="flex items-center gap-4 pl-4 border-l border-border/40">
                <a href="tel:+74951234567" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                  <Phone className="h-3 w-3" />
                  <span className="hidden xl:inline">+7 (495) 123-45-67</span>
                </a>
                <a href="mailto:hello@academius.ru" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                  <Mail className="h-3 w-3" />
                  <span className="hidden xl:inline">hello@academius.ru</span>
                </a>
              </div>

              <Button 
                variant="default" 
                size="lg" 
                className="shadow-md hover:shadow-lg transition-all bg-green-600 hover:bg-green-700"
                onClick={() => setIsDemoOpen(true)}
              >
                Попробовать бесплатно
              </Button>
            </nav>

            <Button 
              size="sm" 
              className="lg:hidden"
              onClick={() => setIsDemoOpen(true)}
            >
              Демо
            </Button>
          </div>
        </div>
      </header>
      <DemoModal open={isDemoOpen} onOpenChange={setIsDemoOpen} />
    </>
  );
}
