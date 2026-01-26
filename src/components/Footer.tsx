import { Link } from "react-router-dom";
import { Phone, Mail, MapPin, MessageCircle, Send, Clock } from "lucide-react";
import okeyLogo from "@/assets/okey-english-logo.jpg";
import OptimizedImage from "@/components/OptimizedImage";
import { getBranchesForFooter } from "@/lib/branches";
import { usePublicBranches } from "@/hooks/usePublicBranches";

const staticBranches = getBranchesForFooter();

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const { data: publicBranches } = usePublicBranches();
  
  // Используем данные из БД если есть, иначе статические
  const branches = publicBranches?.length 
    ? publicBranches.map(b => ({ name: b.name, address: b.address || '', slug: b.id, workingHours: b.working_hours_short }))
    : staticBranches.map(b => ({ ...b, workingHours: '' }));

  return (
    <footer className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <OptimizedImage
                src={okeyLogo} 
                alt="O'KEY ENGLISH - Школа английского языка" 
                width={48}
                height={48}
                className="w-12 h-12 object-cover rounded-full"
              />
              <span className="font-heading font-bold text-lg text-white">
                O'KEY ENGLISH
              </span>
            </div>
            <p className="text-sm text-white/70">
              Сильный английский для детей, подростков и взрослых с гарантией прогресса
            </p>
            <div className="flex items-center space-x-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">10 лет</div>
                <div className="text-xs text-white/60">на рынке</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">10000+</div>
                <div className="text-xs text-white/60">выпускников</div>
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h2 className="font-heading font-semibold text-white">Контакты</h2>
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
                href="https://wa.me/79937073553"
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
            <h2 className="font-heading font-semibold text-white">Филиалы</h2>
            <div className="space-y-2">
              {branches.map((branch) => (
                <Link
                  key={branch.slug}
                  to={`/branches/${branch.slug}`}
                  className="block text-sm hover:text-accent transition-colors"
                >
                  <div className="font-medium">{branch.name}</div>
                  <div className="text-xs text-white/50 flex items-center gap-1">
                    {branch.workingHours && (
                      <>
                        <Clock className="w-3 h-3" />
                        <span>{branch.workingHours}</span>
                        <span className="mx-1">•</span>
                      </>
                    )}
                    {branch.address}
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h2 className="font-heading font-semibold text-white">Разделы</h2>
            <div className="space-y-2">
              <Link
                to="/programs"
                className="block text-sm hover:text-accent transition-colors"
              >
                Программы
              </Link>
              <Link
                to="/test"
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
              <Link
                to="/about"
                className="block text-sm hover:text-accent transition-colors"
              >
                Лицензия на образование
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t border-white/20 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-sm text-white/50">
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