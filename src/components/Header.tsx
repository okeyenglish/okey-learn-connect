import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Phone, MessageCircle, BookOpen, UserCheck } from "lucide-react";
import logoImage from "@/assets/okey-english-logo.jpg";

const navigation = [
  { name: "Главная", href: "/" },
  { name: "Программы", href: "/programs" },
  { name: "Филиалы", href: "/branches" },
  { name: "О школе", href: "/about" },
  { name: "Преподаватели", href: "/teachers" },
  { name: "Отзывы", href: "/reviews" },
  { name: "Цены", href: "/pricing" },
  { name: "Контакты", href: "/contacts" },
];

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const handleWhatsApp = () => {
    window.open("https://wa.me/79937073553", "_blank");
  };

  return (
    <>
      {/* Desktop Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-18 min-h-[72px]">
            {/* Logo and Phone */}
            <div className="flex items-center gap-4 flex-shrink-0 min-w-0 z-50">
              <Link to="/" className="relative flex items-center">
                <img 
                  src={logoImage} 
                  alt="O'KEY ENGLISH" 
                  className="h-[105px] w-[105px] rounded-full object-cover border-2 border-white shadow-lg absolute left-0 top-0"
                />
                {/* Invisible spacer to maintain layout space */}
                <div className="h-16 w-[105px]"></div>
              </Link>
              <div className="hidden sm:flex flex-col text-sm">
                <span className="text-muted-foreground text-xs">Звоните:</span>
                <a href="tel:+74997073535" className="font-semibold text-primary hover:underline">
                  +7 (499) 707-35-35
                </a>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden xl:flex items-center space-x-6 flex-1 justify-center mx-8">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`text-sm font-medium transition-colors hover:text-primary ${
                    location.pathname === item.href
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>

            {/* Desktop CTA Buttons */}
            <div className="hidden lg:flex items-center space-x-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleWhatsApp}
                className="flex items-center gap-1 px-3"
              >
                <MessageCircle className="w-4 h-4" />
                <span className="hidden xl:inline">WhatsApp</span>
              </Button>
              <Link to="/test">
                <Button variant="outline" size="sm" className="flex items-center gap-1 px-3">
                  <BookOpen className="w-4 h-4" />
                  <span className="hidden xl:inline">Тест</span>
                </Button>
              </Link>
              <Link to="/contacts">
                <Button className="btn-hero flex items-center gap-1 px-4">
                  <UserCheck className="w-4 h-4" />
                  <span className="text-sm">Пробный урок</span>
                </Button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="lg:hidden flex-shrink-0 ml-2">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <div className="flex flex-col space-y-4 mt-8">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`text-lg font-medium transition-colors hover:text-primary ${
                        location.pathname === item.href
                          ? "text-primary"
                          : "text-muted-foreground"
                      }`}
                    >
                      {item.name}
                    </Link>
                  ))}
                  <div className="pt-4 space-y-3">
                    <Button
                      variant="outline"
                      className="w-full justify-center gap-2"
                      onClick={handleWhatsApp}
                    >
                      <MessageCircle className="w-4 h-4" />
                      WhatsApp
                    </Button>
                    <Link to="/test" onClick={() => setIsOpen(false)}>
                      <Button variant="outline" className="w-full justify-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        Тест уровня (5 мин)
                      </Button>
                    </Link>
                    <Link to="/contacts" onClick={() => setIsOpen(false)}>
                      <Button className="btn-hero w-full justify-center gap-2">
                        <UserCheck className="w-4 h-4" />
                        Пробный урок
                      </Button>
                    </Link>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t">
        <div className="grid grid-cols-4 gap-1 p-2">
          <Button
            variant="ghost"
            size="sm"
            className="flex flex-col items-center gap-1 h-auto py-2"
            onClick={() => window.open("tel:+74997073535")}
          >
            <Phone className="w-5 h-5" />
            <span className="text-xs">Позвонить</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex flex-col items-center gap-1 h-auto py-2"
            onClick={handleWhatsApp}
          >
            <MessageCircle className="w-5 h-5" />
            <span className="text-xs">WhatsApp</span>
          </Button>
          <Link to="/test">
            <Button
              variant="ghost"
              size="sm"
              className="flex flex-col items-center gap-1 h-auto py-2 w-full"
            >
              <BookOpen className="w-5 h-5" />
              <span className="text-xs">Тест</span>
            </Button>
          </Link>
          <Link to="/contacts">
            <Button
              size="sm"
              className="btn-hero flex flex-col items-center gap-1 h-auto py-2"
            >
              <UserCheck className="w-5 h-5" />
              <span className="text-xs">Записаться</span>
            </Button>
          </Link>
        </div>
      </div>
    </>
  );
}