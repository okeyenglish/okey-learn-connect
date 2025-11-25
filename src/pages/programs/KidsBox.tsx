import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  Users, 
  Trophy, 
  Star, 
  Gift,
  Phone,
  MessageCircle,
  Send,
  GraduationCap,
  Home,
  Award,
  Target
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import { getBranchNamesForPrograms } from "@/lib/branches";

export default function KidsBox() {
  const branches = getBranchNamesForPrograms();
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
    
    const message = `Здравствуйте! Хочу записать ребёнка на курс Kid's Box (6-9 лет).
Имя: ${name}
Телефон: ${phone}
Филиал: ${branch}
Промокод: HAPPYENGLISH (скидка 5000₽)`;
    
    window.open(`https://wa.me/79937073553?text=${encodeURIComponent(message)}`, "_blank");
    
    toast({
      title: "Заявка отправлена!",
      description: "Мы свяжемся с вами в ближайшее время",
    });
  };

  const handleWhatsApp = () => {
    const message = "Здравствуйте! Интересует курс Kid's Box для детей 6-9 лет. Хочу записаться на пробный урок.";
    window.open(`https://wa.me/79937073553?text=${encodeURIComponent(message)}`, "_blank");
  };

  const handleTelegram = () => {
    const message = "Здравствуйте! Интересует курс Kid's Box для детей 6-9 лет. Хочу записаться на пробный урок.";
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
              <BookOpen className="w-4 h-4 mr-1" />
              Возраст 6-9 лет
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
              <span className="text-gradient">Kid's Box</span>
              <br />
              Cambridge English для детей
            </h1>
            <p className="text-xl lg:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Игровые уроки с серьёзным результатом: <strong className="text-primary">говорим, слушаем, читаем и пишем</strong>
            </p>
            <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto">
              Программа Cambridge для младших школьников — путь к уровням A1–A2 CEFR без зубрёжки и стресса
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Button variant="hero" size="lg" onClick={handleWhatsApp} className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
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
                  <Award className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">A1-A2</div>
                  <div className="text-sm text-muted-foreground">уровень CEFR</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">Cambridge YLE</div>
                  <div className="text-sm text-muted-foreground">подготовка</div>
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
              Что получит ребёнок
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Развитие всех навыков с учётом возраста и интересов младших школьников
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="card-elevated">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center mb-4">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <CardTitle>Развитие всех навыков</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Устная речь, аудирование, чтение, письмо, словарь, грамматика и произношение — 
                  с учётом возраста и внимания детей.
                </p>
              </CardContent>
            </Card>

            <Card className="card-elevated">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center mb-4">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <CardTitle>Понятные сюжеты</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Темы: семья, игрушки, школа, хобби. Движения, раскраски, мини-диалоги и песни — 
                  с закреплением после каждого блока.
                </p>
              </CardContent>
            </Card>

            <Card className="card-elevated">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center mb-4">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
                <CardTitle>Подготовка к экзаменам</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Шаг за шагом выходим на Pre A1 Starters и A1 Movers. 
                  Регулярные тренировки в формате Cambridge YLE.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Homework Section */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-6">
              <Home className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold mb-6">
              Домашка без слёз
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Наш фирменный курс <strong className="text-primary">Homework</strong> помогает ребёнку делать задания самостоятельно: 
              вся ключевая грамматика — в коротких видео-подсказках.
            </p>
            <p className="text-lg text-muted-foreground">
              Родителям — минимум объяснений, детям — максимум самостоятельности.
            </p>
          </div>
        </div>
      </section>

      {/* Why O'KEY ENGLISH */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Почему O'KEY ENGLISH
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Cambridge Preparation Center с международными сертификатами
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="card-elevated text-center">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Award className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold mb-2">Опытные преподаватели</h3>
                <p className="text-sm text-muted-foreground">
                  С международными сертификатами Cambridge
                </p>
              </CardContent>
            </Card>

            <Card className="card-elevated text-center">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold mb-2">Аккредитация Cambridge</h3>
                <p className="text-sm text-muted-foreground">
                  Официальный центр подготовки
                </p>
              </CardContent>
            </Card>

            <Card className="card-elevated text-center">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold mb-2">Удобные расписания</h3>
                <p className="text-sm text-muted-foreground">
                  Офлайн рядом с домом или онлайн
                </p>
              </CardContent>
            </Card>
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
                Скидка 5000₽
              </Badge>
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">
                Запишитесь на пробный урок
              </h2>
              <p className="text-lg text-muted-foreground">
                Поможем определить уровень и подобрать комфортную группу
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
                <strong>O'KEY ENGLISH</strong> — Cambridge Preparation Center
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