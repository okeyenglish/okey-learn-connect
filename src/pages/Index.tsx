import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  GraduationCap, 
  Users, 
  MapPin, 
  Star, 
  CheckCircle, 
  ArrowRight,
  Play,
  MessageCircle,
  TestTube,
  UserCheck,
  Award,
  BookOpen,
  Target
} from "lucide-react";

const branches = [
  { name: "Котельники", address: "2-й Покровский проезд, 14к2", slug: "kotelniki" },
  { name: "Новокосино", address: "Реутов, Юбилейный проспект, 60", slug: "novokosino" },
  { name: "Окская", address: "ул. Окская, д. 3, корп. 1", slug: "okskaya" },
  { name: "Стахановская", address: "2-й Грайвороновский пр-д, 42к1", slug: "stakhanovskaya" },
  { name: "Солнцево", address: "ул. Богданова, 6к1", slug: "solntsevo" },
  { name: "Мытищи", address: "ул. Борисовка, 16А", slug: "mytishchi" },
  { name: "Люберцы", address: "3 Почтовое отделение, 65к1", slug: "lyubertsy-1" },
  { name: "Красная горка", address: "проспект Гагарина, 3/8", slug: "lyubertsy-2" },
  { name: "Онлайн школа", address: "Cambridge One платформа", slug: "online" },
];

export default function Index() {
  const [quizStep] = useState(0);
  const [showQuizResult] = useState(false);

  const handleWhatsApp = (branch?: string) => {
    const message = branch 
      ? `Здравствуйте! Интересует обучение в филиале ${branch}.`
      : "Здравствуйте! Интересует обучение английскому языку.";
    window.open(`https://wa.me/79937073553?text=${encodeURIComponent(message)}`, "_blank");
  };

  return (
    <div className="min-h-screen">
      <section className="relative bg-gradient-subtle py-20 lg:py-32 overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
              <span className="text-gradient">Сильный английский</span>
              <br />
              для детей, подростков и взрослых
            </h1>
            <p className="text-xl lg:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              с <strong className="text-primary">гарантией прогресса</strong>
            </p>
            <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto">
              Подберём программу и расписание за 2 минуты. Пробный урок — бесплатно.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Link to="/test">
                <Button variant="hero" size="lg" className="flex items-center gap-2">
                  <TestTube className="w-5 h-5" />
                  Пройти онлайн-тест уровня
                </Button>
              </Link>
              <Link to="/contacts">
                <Button variant="outline" size="lg" className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5" />
                  Записаться на пробный урок
                </Button>
              </Link>
            </div>

            <div className="flex flex-wrap justify-center items-center gap-8 text-center">
              <div className="flex items-center gap-3 p-4 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 hover-scale">
                <div className="w-14 h-14 bg-gradient-primary rounded-full flex items-center justify-center shadow-lg">
                  <Award className="w-7 h-7 text-white" />
                </div>
                <div>
                  <div className="text-3xl font-black text-white drop-shadow-lg animate-pulse">10 лет</div>
                  <div className="text-sm text-white/80 font-medium">на рынке</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 hover-scale">
                <div className="w-14 h-14 bg-gradient-primary rounded-full flex items-center justify-center shadow-lg">
                  <GraduationCap className="w-7 h-7 text-white" />
                </div>
                <div>
                  <div className="text-3xl font-black text-white drop-shadow-lg animate-pulse">5000+</div>
                  <div className="text-sm text-muted-foreground">выпускников</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Филиалы и расписание
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              9 филиалов в удобных локациях + онлайн школа. Гибкое расписание, есть группы каждый день
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {branches.map((branch) => (
              <Card key={branch.slug} className="card-elevated hover:border-primary/50 transition-all">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">{branch.name}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{branch.address}</p>
                  
                  <div className="flex flex-col gap-2">
                    <Link to={`/branches/${branch.slug}`}>
                      <Button variant="outline" size="sm" className="w-full">
                        Посмотреть расписание
                      </Button>
                    </Link>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full"
                      onClick={() => handleWhatsApp(branch.name)}
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      WhatsApp
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-primary">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
            Готовы начать изучение английского?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Пройдите бесплатный тест уровня или запишитесь на пробный урок уже сегодня
          </p>
        </div>
      </section>
    </div>
  );
}