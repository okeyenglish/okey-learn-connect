import { Link } from "react-router-dom";
import { Phone, Mail, MapPin, MessageCircle, Send } from "lucide-react";
import okeyLogo from "@/assets/okey-english-logo.jpg";

const branches = [
  { name: "Котельники", address: "2-й Покровский проезд, 14к2", slug: "kotelniki" },
  { name: "Новокосино", address: "Реутов, Юбилейный проспект, 60", slug: "novokosino" },
  { name: "Окская", address: "ул. Окская, д. 3, корп. 1", slug: "okskaya" },
  { name: "Стахановская", address: "2-й Грайвороновский проезд, д. 42, корп. 1", slug: "stakhanovskaya" },
  { name: "Солнцево", address: "Богданова, 6к1", slug: "solntsevo" },
  { name: "Мытищи", address: "Борисовка, 16А", slug: "mytishchi" },
  { name: "Люберцы", address: "3 Почтовое отделение, 65к1", slug: "lyubertsy-1" },
  { name: "Красная горка", address: "проспект Гагарина, 3/8", slug: "lyubertsy-2" },
  { name: "Онлайн школа", address: "По всей планете", slug: "online" },
];

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-secondary text-secondary-foreground">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <img 
                src={okeyLogo} 
                alt="O'KEY ENGLISH" 
                className="w-12 h-12 object-contain"
              />
              <span className="font-heading font-bold text-lg text-white">
                O'KEY ENGLISH
              </span>
            </div>
            <p className="text-sm text-secondary-foreground/80">
              Сильный английский для детей, подростков и взрослых с гарантией прогресса
            </p>
            <div className="flex items-center space-x-4">
              <div className="text-sm">
                <div className="text-accent font-semibold">10 лет</div>
                <div className="text-xs">на рынке</div>
              </div>
              <div className="text-sm">
                <div className="text-accent font-semibold">5000+</div>
                <div className="text-xs">выпускников</div>
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h4 className="font-heading font-semibold text-white">Контакты</h4>
            <div className="space-y-3">
              <a
                href="tel:+74997073535"
                className="flex items-center space-x-2 text-sm hover:text-accent transition-colors"
              >
                <Phone className="w-4 h-4" />
                <span>+7 (499) 707-35-35</span>
              </a>
              <a
                href="mailto:hello@okeyenglish.ru"
                className="flex items-center space-x-2 text-sm hover:text-accent transition-colors"
              >
                <Mail className="w-4 h-4" />
                <span>hello@okeyenglish.ru</span>
              </a>
              <a
                href="https://wa.me/74997073535"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-sm hover:text-accent transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp</span>
              </a>
              <a
                href="https://t.me/englishmanager"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-sm hover:text-accent transition-colors"
              >
                <Send className="w-4 h-4" />
                <span>@englishmanager</span>
              </a>
            </div>
          </div>

          {/* Branches */}
          <div className="space-y-4">
            <h4 className="font-heading font-semibold text-white">Филиалы</h4>
            <div className="space-y-2">
              {branches.map((branch) => (
                <Link
                  key={branch.slug}
                  to={`/locations/${branch.slug}`}
                  className="block text-sm hover:text-accent transition-colors"
                >
                  <div className="font-medium">{branch.name}</div>
                  <div className="text-xs text-secondary-foreground/60">
                    {branch.address}
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="font-heading font-semibold text-white">Разделы</h4>
            <div className="space-y-2">
              <Link
                to="/courses"
                className="block text-sm hover:text-accent transition-colors"
              >
                Курсы
              </Link>
              <Link
                to="/placement-test"
                className="block text-sm hover:text-accent transition-colors"
              >
                Тест уровня
              </Link>
              <Link
                to="/teachers"
                className="block text-sm hover:text-accent transition-colors"
              >
                Преподаватели
              </Link>
              <Link
                to="/reviews"
                className="block text-sm hover:text-accent transition-colors"
              >
                Отзывы
              </Link>
              <Link
                to="/pricing"
                className="block text-sm hover:text-accent transition-colors"
              >
                Цены
              </Link>
              <Link
                to="/faq"
                className="block text-sm hover:text-accent transition-colors"
              >
                FAQ
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t border-secondary-foreground/20 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-sm text-secondary-foreground/60">
              © {currentYear} O'KEY ENGLISH. Все права защищены.
            </div>
            <div className="flex space-x-6 text-sm">
              <Link
                to="/privacy"
                className="hover:text-accent transition-colors"
              >
                Политика конфиденциальности
              </Link>
              <Link
                to="/terms"
                className="hover:text-accent transition-colors"
              >
                Условия использования
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}