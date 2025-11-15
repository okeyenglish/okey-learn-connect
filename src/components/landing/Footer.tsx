import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';
import { useState } from 'react';

export default function Footer() {
  const [email, setEmail] = useState('');

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    // Здесь будет логика подписки на newsletter
    console.log('Subscribe:', email);
    setEmail('');
  };

  return (
    <footer className="bg-gradient-to-br from-primary/5 to-background border-t border-border py-16">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Newsletter Section */}
        <div className="max-w-2xl mx-auto text-center mb-16 pb-16 border-b border-border">
          <h3 className="text-2xl font-bold mb-3">
            Полезные материалы раз в неделю
          </h3>
          <p className="text-muted-foreground mb-6">
            Кейсы, статьи и секреты автоматизации школ. Никакого спама.
          </p>
          <form onSubmit={handleSubscribe} className="flex gap-2 max-w-md mx-auto">
            <Input
              type="email"
              placeholder="Ваш email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="flex-1"
            />
            <Button type="submit" className="gap-2">
              <Send className="w-4 h-4" />
              Подписаться
            </Button>
          </form>
          <p className="text-xs text-muted-foreground mt-3">
            Никакого спама. Только кейсы и статьи.
          </p>
        </div>

        {/* Main Footer Content */}
        <div className="grid md:grid-cols-5 gap-8 mb-12">
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
              <li><a href="#" className="hover:text-foreground transition-colors">О нас</a></li>
              <li><a href="#pricing" className="hover:text-foreground transition-colors">Тарифы</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Кейсы</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Блог</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Контакты</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Разработчикам</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors">API документация</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Вебхуки</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Интеграции</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Статус сервиса</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Поддержка</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors">Документация</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">FAQ</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Обучающие видео</a></li>
              <li><Link to="/auth" className="hover:text-foreground transition-colors">Войти</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Юридическое</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors">Пользовательское соглашение</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Политика конфиденциальности</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Реквизиты</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Партнерам</a></li>
            </ul>
          </div>
        </div>

        {/* Social Links */}
        <div className="flex justify-center gap-6 mb-8">
          <a
            href="#"
            className="text-muted-foreground hover:text-primary transition-colors"
            aria-label="Telegram"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.692-1.653-1.123-2.678-1.799-1.185-.781-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.008-1.252-.241-1.865-.44-.752-.244-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635.099-.002.321.023.465.141.121.099.155.232.171.326.016.095.037.312.021.481z"/>
            </svg>
          </a>
          <a
            href="#"
            className="text-muted-foreground hover:text-primary transition-colors"
            aria-label="YouTube"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
          </a>
          <a
            href="#"
            className="text-muted-foreground hover:text-primary transition-colors"
            aria-label="VK"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm6.066 13.163c.603.599 1.245 1.167 1.735 1.806.219.283.425.577.577.914.217.485.02.93-.357 1.008l-2.345-.001c-.607.05-1.092-.196-1.487-.593-.328-.329-.632-.677-.947-1.017-.131-.142-.267-.277-.425-.39-.296-.212-.553-.153-.73.15-.181.306-.222.647-.244.99-.033.486-.26.613-.743.636-1.037.05-2.023-.083-2.948-.609-.806-.457-1.43-1.088-1.986-1.802-1.082-1.39-1.911-2.937-2.667-4.53-.161-.34-.043-.522.33-.53.617-.013 1.233-.011 1.85-.002.253.004.422.155.532.386.366.765.8 1.487 1.325 2.146.139.175.282.35.476.474.213.136.381.088.489-.144.07-.15.106-.312.13-.475.082-.56.093-1.12.014-1.68-.047-.333-.226-.549-.558-.613-.169-.032-.144-.095-.062-.192.13-.155.252-.251.497-.251h1.836c.29.057.354.188.393.479l.001 2.042c-.002.125.062.495.286.578.18.057.299-.083.407-.196.486-.509.833-1.114 1.145-1.739.137-.275.256-.564.371-.852.086-.215.22-.32.465-.314l2.541.003c.075 0 .151.001.224.015.338.064.431.225.326.554-.166.521-.473.955-.783 1.386-.329.457-.682.896-1.013 1.353-.308.425-.282.638.097 1.011z"/>
            </svg>
          </a>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>© 2024 Академиус. Все права защищены.</p>
          <p className="mt-2">
            ООО "Академиус" • ИНН 7743123456 • ОГРН 1234567890123
          </p>
        </div>
      </div>
    </footer>
  );
}
