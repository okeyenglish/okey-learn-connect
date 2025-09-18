import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Briefcase, 
  Users, 
  Trophy, 
  Star, 
  Gift,
  Phone,
  MessageCircle,
  Send,
  GraduationCap,
  Globe,
  Award,
  BookOpen,
  Calendar,
  UserCheck,
  TrendingUp
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const branches = [
  "Котельники", "Новокосино", "Окская", "Стахановская", 
  "Солнцево", "Мытищи", "Люберцы-1", "Люберцы-2", "Онлайн школа"
];

export default function Empower() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [branch, setBranch] = useState("");
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !branch) {
      toast({
        title: "Заполните все поля",
        description: "Пожалуйста, укажите имя, телефон и филиал",
        variant: "destructive",
      });
      return;
    }
    
    const message = `Здравствуйте! Хочу записаться на курс Empower для взрослых.
Имя: ${name}
Телефон: ${phone}
Филиал: ${branch}
Промокод: HAPPYENGLISH (скидка 5000₽ + 1 месяц в подарок)`;
    
    window.open(`https://wa.me/74997073535?text=${encodeURIComponent(message)}`, "_blank");
    
    toast({
      title: "Заявка отправлена!",
      description: "Мы свяжемся с вами в ближайшее время",
    });
  };

  const handleWhatsApp = () => {
    const message = "Здравствуйте! Интересует курс Empower для взрослых. Хочу записаться на консультацию.";
    window.open(`https://wa.me/74997073535?text=${encodeURIComponent(message)}`, "_blank");
  };

  const handleTelegram = () => {
    const message = "Здравствуйте! Интересует курс Empower для взрослых. Хочу записаться на консультацию.";
    window.open(`https://t.me/englishmanager?text=${encodeURIComponent(message)}`, "_blank");
  };

  const handleCall = () => {
    window.open("tel:+74997073535", "_blank");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative bg-gradient-subtle py-20 lg:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <Badge variant="secondary" className="mb-4">
              <Briefcase className="w-4 h-4 mr-1" />
              Для взрослых 18+
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
              <span className="text-gradient">Empower</span>
              <br />
              Cambridge English для взрослых
            </h1>
            <p className="text-xl lg:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Уверенно говорите по-английски <strong className="text-primary">в жизни и на работе</strong>
            </p>
            <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto">
              Современный курс A1–C2 с онлайн-компонентом и ежемесячным контролем прогресса
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Button variant="hero" size="lg" onClick={handleWhatsApp} className="flex items-center gap-2">
                <UserCheck className="w-5 h-5" />
                Записаться на консультацию
              </Button>
              <Button variant="outline" size="lg" onClick={handleCall} className="flex items-center gap-2">
                <Phone className="w-5 h-5" />
                Позвонить сейчас
              </Button>
            </div>

            <div className="flex flex-wrap justify-center items-center gap-8 text-center">
              <div className="flex items-center gap-2">
                <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center">
                  <Award className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">A1-C2</div>
                  <div className="text-sm text-muted-foreground">все уровни</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">45+</div>
                  <div className="text-sm text-muted-foreground">вариантов расписания</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What You Get */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Что вы получите
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Навыки для карьеры и личной жизни от поездок до рабочих встреч
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="card-elevated">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center mb-4">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <CardTitle>Свободную речь и уверенность</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  В реальных ситуациях — от поездок до рабочих встреч. 
                  Преодолеем языковой барьер и научим говорить естественно.
                </p>
              </CardContent>
            </Card>

            <Card className="card-elevated">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <CardTitle>Soft skills на английском</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Лидерство, командная работа, аргументация — то, что заметят коллеги и эйчары. 
                  Навыки для карьерного роста.
                </p>
              </CardContent>
            </Card>

            <Card className="card-elevated">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center mb-4">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
                <CardTitle>Путь к экзаменам Cambridge</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  KET, PET, FCE, CAE, IELTS — учитесь по международным стандартам 
                  и сдавайте экзамены в наших центрах.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How We Study */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Как построено обучение
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Комбинированный формат с акцентом на практику и реальные ситуации
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="card-elevated text-center">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Globe className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold mb-2">Комбинированный формат</h3>
                <p className="text-sm text-muted-foreground">
                  Очные занятия + онлайн-практика — учитесь там, где удобно
                </p>
              </CardContent>
            </Card>

            <Card className="card-elevated text-center">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold mb-2">Авторский онлайн-курс</h3>
                <p className="text-sm text-muted-foreground">
                  По грамматике от O'KEY ENGLISH — повторяйте в удобное время
                </p>
              </CardContent>
            </Card>

            <Card className="card-elevated text-center">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold mb-2">Speaking Club</h3>
                <p className="text-sm text-muted-foreground">
                  С носителем — регулярно «раскачиваем» разговорную речь
                </p>
              </CardContent>
            </Card>

            <Card className="card-elevated text-center">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Briefcase className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold mb-2">Workshop</h3>
                <p className="text-sm text-muted-foreground">
                  56 жизненных ситуаций за границей
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Schedule */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-6">
              <Calendar className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold mb-6">
              Расписание и форматы
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Ежедневно доступно <strong className="text-primary">больше 45 вариантов расписания</strong> — 
              выберите утро, день или вечер; офлайн в школе или онлайн.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <Badge variant="secondary" className="mb-4">
                <Gift className="w-4 h-4 mr-1" />
                Скидка 5000₽ + 1 месяц в подарок
              </Badge>
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">
                Запишитесь на консультацию
              </h2>
              <p className="text-lg text-muted-foreground">
                Поможем определить уровень и подобрать удобную группу под ваши задачи
              </p>
            </div>

            <Card className="card-elevated">
              <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Имя</Label>
                    <Input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Введите имя"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Телефон</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+7 (999) 123-45-67"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="branch">Филиал</Label>
                    <Select value={branch} onValueChange={setBranch} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите филиал" />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.map((b) => (
                          <SelectItem key={b} value={b}>
                            {b}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button type="submit" className="w-full" size="lg">
                    <Send className="w-4 h-4 mr-2" />
                    Отправить заявку
                  </Button>
                </form>

                <div className="mt-6 pt-6 border-t">
                  <p className="text-center text-sm text-muted-foreground mb-4">
                    Или свяжитесь с нами напрямую:
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button variant="outline" className="flex-1" onClick={handleWhatsApp}>
                      <MessageCircle className="w-4 h-4 mr-2" />
                      WhatsApp
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={handleTelegram}>
                      <Send className="w-4 h-4 mr-2" />
                      Telegram
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={handleCall}>
                      <Phone className="w-4 h-4 mr-2" />
                      Позвонить
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="text-center mt-8">
              <p className="text-sm text-muted-foreground mb-2">
                <strong>O'KEY ENGLISH</strong> — Cambridge Preparation Center
              </p>
              <p className="text-xs text-muted-foreground">
                Телефон: <a href="tel:+74997073535" className="text-primary">+7 (499) 707-35-35</a> 
                | Промокод: <strong>HAPPYENGLISH</strong>
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                <em>Мы — Cambridge Preparation Center. У нас можно подготовиться и сдать международные экзамены прямо в школе O'KEY ENGLISH.</em>
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}