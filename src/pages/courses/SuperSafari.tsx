import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Play, 
  Users, 
  Clock, 
  Star, 
  Gift,
  Phone,
  MessageCircle,
  Send,
  GraduationCap,
  Heart,
  Shield,
  Award
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const branches = [
  "Котельники", "Новокосино", "Окская", "Стахановская", 
  "Солнцево", "Мытищи", "Люберцы-1", "Люберцы-2", "Онлайн школа"
];

export default function SuperSafari() {
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
    
    const message = `Здравствуйте! Хочу записать ребёнка на курс Super Safari (3-6 лет).
Имя: ${name}
Телефон: ${phone}
Филиал: ${branch}
Промокод: HAPPYENGLISH (скидка 5000₽)`;
    
    window.open(`https://wa.me/74997073535?text=${encodeURIComponent(message)}`, "_blank");
    
    toast({
      title: "Заявка отправлена!",
      description: "Мы свяжемся с вами в ближайшее время",
    });
  };

  const handleWhatsApp = () => {
    const message = "Здравствуйте! Интересует курс Super Safari для детей 3-6 лет. Хочу записаться на пробный урок.";
    window.open(`https://wa.me/74997073535?text=${encodeURIComponent(message)}`, "_blank");
  };

  const handleTelegram = () => {
    const message = "Здравствуйте! Интересует курс Super Safari для детей 3-6 лет. Хочу записаться на пробный урок.";
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
              <GraduationCap className="w-4 h-4 mr-1" />
              Возраст 3-6 лет
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
              <span className="text-gradient">Super Safari</span>
              <br />
              Английский для малышей
            </h1>
            <p className="text-xl lg:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Играем, поём, говорим — учим английский <strong className="text-primary">без зубрёжки и стресса</strong>
            </p>
            <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto">
              Ваш ребёнок естественно «впитывает» язык через игры, песни и сказочные истории по программе Cambridge
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Button variant="hero" size="lg" onClick={handleWhatsApp} className="flex items-center gap-2">
                <Play className="w-5 h-5" />
                Записаться на пробный урок
              </Button>
              <Button variant="outline" size="lg" onClick={handleCall} className="flex items-center gap-2">
                <Phone className="w-5 h-5" />
                Позвонить сейчас
              </Button>
            </div>

            <div className="flex flex-wrap justify-center items-center gap-8 text-center">
              <div className="flex items-center gap-2">
                <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center">
                  <Heart className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">Cambridge</div>
                  <div className="text-sm text-muted-foreground">программа</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">8 детей</div>
                  <div className="text-sm text-muted-foreground">в группе</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What Child Gets */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Что получает ребёнок
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Каждое занятие как мини-приключение с конкретным результатом
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="card-elevated">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center mb-4">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <CardTitle>Речь и понимание</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Знакомые темы: семья, игрушки, животные, цвета, еда. Ребёнок учится слышать и отвечать 
                  по-английски в бытовых ситуациях. Счёт и простые фразы вежливости.
                </p>
              </CardContent>
            </Card>

            <Card className="card-elevated">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center mb-4">
                  <Play className="w-6 h-6 text-white" />
                </div>
                <CardTitle>Мотивация через игру</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Активные задания, танцы, раскраски, загадки и аудирование. Каждое занятие — 
                  как мини-приключение, которое ребёнок ждёт с нетерпением.
                </p>
              </CardContent>
            </Card>

            <Card className="card-elevated">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center mb-4">
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
                <CardTitle>Подготовка к школе</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  В рамках курса начинаем знакомиться с чтением и письмом по возрасту. 
                  Развиваем внимание, память и логику.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Why O'KEY ENGLISH */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Почему O'KEY ENGLISH
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Cambridge Preparation Center с опытными педагогами
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="card-elevated text-center">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Award className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold mb-2">Cambridge-подход</h3>
                <p className="text-sm text-muted-foreground">
                  Учим по официальным материалам Cambridge
                </p>
              </CardContent>
            </Card>

            <Card className="card-elevated text-center">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold mb-2">Опытные педагоги</h3>
                <p className="text-sm text-muted-foreground">
                  Отбор по образованию и сертификатам
                </p>
              </CardContent>
            </Card>

            <Card className="card-elevated text-center">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold mb-2">Комплексный результат</h3>
                <p className="text-sm text-muted-foreground">
                  Развиваем все навыки без перегруза
                </p>
              </CardContent>
            </Card>

            <Card className="card-elevated text-center">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold mb-2">Комфорт и безопасность</h3>
                <p className="text-sm text-muted-foreground">
                  Пространство адаптировано для малышей
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <Badge variant="secondary" className="mb-4">
                <Gift className="w-4 h-4 mr-1" />
                Скидка 5000₽
              </Badge>
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">
                Записаться на пробный урок
              </h2>
              <p className="text-lg text-muted-foreground">
                Поможем выбрать уровень и первую группу, дадим рекомендации по домашним мини-играм
              </p>
            </div>

            <Card className="card-elevated">
              <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Имя ребёнка</Label>
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
                <strong>O'KEY ENGLISH</strong> — делаем первый английский любимым предметом
              </p>
              <p className="text-xs text-muted-foreground">
                Телефон: <a href="tel:+74997073535" className="text-primary">+7 (499) 707-35-35</a>
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}