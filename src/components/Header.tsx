import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Menu, Phone, MessageCircle, BookOpen, UserCheck, Send, Gift, MapPin } from "lucide-react";
import logoImage from "@/assets/okey-english-logo.jpg";
import { getBranchesForSelect } from "@/lib/branches";

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
  const navigate = useNavigate();
  const branchesForSelect = getBranchesForSelect();

  const handleWhatsApp = () => {
    window.open("https://wa.me/79937073553", "_blank");
  };

  const handleTelegram = () => {
    window.open("https://t.me/okeyenglish", "_blank");
  };

  const handleCall = () => {
    window.open("tel:+74997073535", "_blank");
  };

  const handleBranchSelect = (branchId: string) => {
    navigate(`/branches/${branchId}`);
  };

  return (
    <>
      {/* Desktop Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-18 min-h-[72px]">
            {/* Logo */}
            <Link to="/" className="relative flex items-center flex-shrink-0 min-w-0 z-50">
              <img 
                src={logoImage} 
                alt="O'KEY ENGLISH" 
                className="h-[105px] w-[105px] rounded-full object-cover border-2 border-white shadow-lg absolute left-0 top-0"
              />
              {/* Invisible spacer to maintain layout space */}
              <div className="h-16 w-[105px]"></div>
            </Link>

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

            {/* Mobile Branch Selector and Menu Button */}
            <div className="flex items-center space-x-2 lg:hidden">
              <Select onValueChange={handleBranchSelect}>
                <SelectTrigger className="w-[140px] h-9 text-xs">
                  <MapPin className="w-3 h-3 mr-1" />
                  <SelectValue placeholder="Филиал" />
                </SelectTrigger>
                <SelectContent>
                  {branchesForSelect.map((branch) => (
                        <SelectItem key={branch.value} value={branch.value}>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{branch.label}</span>
                            <span className="text-xs opacity-70">{branch.address}</span>
                          </div>
                        </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex-shrink-0">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80">
                  <div className="flex flex-col h-full">
                    {/* Navigation Links */}
                    <div className="flex flex-col space-y-3 mt-6">
                      {navigation.map((item) => (
                        <Link
                          key={item.name}
                          to={item.href}
                          onClick={() => setIsOpen(false)}
                          className={`text-base font-medium transition-colors hover:text-primary py-1 ${
                            location.pathname === item.href
                              ? "text-primary"
                              : "text-muted-foreground"
                          }`}
                        >
                          {item.name}
                        </Link>
                      ))}
                    </div>
                    
                    {/* Contact buttons */}
                    <div className="mt-6 pt-4 border-t">
                      <div className="grid grid-cols-3 gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex flex-col items-center gap-1 py-2 h-auto bg-muted/30 hover:bg-muted/50"
                          onClick={handleWhatsApp}
                        >
                          <MessageCircle className="w-4 h-4 text-green-600" />
                          <span className="text-xs">WhatsApp</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex flex-col items-center gap-1 py-2 h-auto bg-muted/30 hover:bg-muted/50"
                          onClick={handleTelegram}
                        >
                          <Send className="w-4 h-4 text-blue-500" />
                          <span className="text-xs">Telegram</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex flex-col items-center gap-1 py-2 h-auto bg-muted/30 hover:bg-muted/50"
                          onClick={handleCall}
                        >
                          <Phone className="w-4 h-4 text-orange-500" />
                          <span className="text-xs">Позвонить</span>
                        </Button>
                      </div>
                    </div>
                        
                    {/* Main action buttons */}
                    <div className="mt-6 pt-4 border-t">
                      <div className="flex flex-col gap-3">
                        <Link to="/test" onClick={() => setIsOpen(false)}>
                          <Button variant="outline" className="w-full justify-center gap-2 h-10">
                            <BookOpen className="w-4 h-4" />
                            Тест уровня (5 мин)
                          </Button>
                        </Link>
                        <Link to="/contacts" onClick={() => setIsOpen(false)}>
                          <Button className="btn-hero w-full justify-center gap-2 h-10">
                            <UserCheck className="w-4 h-4" />
                            Пробный урок
                          </Button>
                        </Link>
                        <Button className="w-full justify-center gap-2 h-10 bg-gradient-to-r from-primary to-primary/80 text-white">
                          <Gift className="w-4 h-4" />
                          Купон 5000₽
                        </Button>
                      </div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
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