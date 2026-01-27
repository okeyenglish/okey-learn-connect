import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import SEOHead from "@/components/SEOHead";
import { 
  Building2, 
  GraduationCap, 
  Users, 
  ArrowRight,
  Globe,
  Shield,
  Zap,
  MessageSquare
} from "lucide-react";

const MainLanding = () => {
  return (
    <>
      <SEOHead 
        title="AcademyOS — CRM для образовательных центров"
        description="Современная платформа для управления учебными центрами. Автоматизация работы с клиентами, расписание, мессенджеры и аналитика."
      />
      
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        {/* Hero Section */}
        <header className="container mx-auto px-4 py-8">
          <nav className="flex items-center justify-between mb-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <GraduationCap className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">AcademyOS</span>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/auth">
                <Button variant="ghost">Войти</Button>
              </Link>
              <Link to="/auth">
                <Button>Начать</Button>
              </Link>
            </div>
          </nav>
          
          <div className="text-center max-w-4xl mx-auto py-16">
            <Badge variant="secondary" className="mb-6">
              CRM для образования
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Управляйте учебным центром эффективно
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Единая платформа для работы с клиентами, расписанием, преподавателями и финансами. 
              Интеграция с WhatsApp, Telegram и телефонией.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth">
                <Button size="lg" className="gap-2">
                  Попробовать бесплатно
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/okeyenglish">
                <Button size="lg" variant="outline" className="gap-2">
                  <Building2 className="h-4 w-4" />
                  Пример школы
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Features */}
        <section className="container mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Всё для управления школой</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Инструменты, которые помогают образовательным центрам расти
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-0 shadow-lg">
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Мессенджеры</h3>
                <p className="text-sm text-muted-foreground">
                  WhatsApp, Telegram и чат на сайте в одном окне
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg">
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Клиенты и группы</h3>
                <p className="text-sm text-muted-foreground">
                  Карточки клиентов, группы, расписание и посещаемость
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg">
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Автоматизация</h3>
                <p className="text-sm text-muted-foreground">
                  Напоминания, рассылки и автоответы
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg">
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                  <Globe className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Сайт-визитка</h3>
                <p className="text-sm text-muted-foreground">
                  Готовый сайт для вашей школы с филиалами и курсами
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA */}
        <section className="container mx-auto px-4 py-16">
          <Card className="bg-primary text-primary-foreground border-0">
            <CardContent className="py-12 text-center">
              <Shield className="h-12 w-12 mx-auto mb-6 opacity-80" />
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                Готовы автоматизировать вашу школу?
              </h2>
              <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
                Начните использовать AcademyOS бесплатно. Без ограничений по времени.
              </p>
              <Link to="/auth">
                <Button size="lg" variant="secondary" className="gap-2">
                  Создать аккаунт
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </section>

        {/* Footer */}
        <footer className="container mx-auto px-4 py-8 border-t">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <GraduationCap className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">AcademyOS</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} AcademyOS. Все права защищены.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default MainLanding;
