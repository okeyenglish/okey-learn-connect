import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-card border-t border-border py-12">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-bold text-lg mb-4 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Академиус
            </h3>
            <p className="text-sm text-muted-foreground">
              Национальная образовательная платформа для школ, педагогов и родителей
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Платформа</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#for-schools" className="hover:text-foreground">Для школ</a></li>
              <li><a href="#for-teachers" className="hover:text-foreground">Для педагогов</a></li>
              <li><a href="#for-parents" className="hover:text-foreground">Для родителей</a></li>
              <li><a href="#features" className="hover:text-foreground">Возможности</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Компания</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground">О нас</a></li>
              <li><a href="#pricing" className="hover:text-foreground">Тарифы</a></li>
              <li><a href="#" className="hover:text-foreground">Контакты</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Поддержка</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground">Документация</a></li>
              <li><a href="#" className="hover:text-foreground">FAQ</a></li>
              <li><Link to="/auth" className="hover:text-foreground">Войти</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>© 2024 Академиус. Все права защищены.</p>
        </div>
      </div>
    </footer>
  );
}
