import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AnimatedLanguage from "@/components/AnimatedLanguage";
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
  Target,
  Clock,
  Phone,
  Send,
  Video,
  Heart,
  BookMarked,
  Calendar,
  Globe,
  Laptop,
  Languages
} from "lucide-react";

const branches = [
  { 
    name: "Котельники", 
    address: "2-й Покровский проезд, 14к2", 
    slug: "kotelniki",
    workingHours: "Пн-Пт: 9:00-21:00, Сб-Вс: 10:00-18:00",
    activeGroups: 12,
    nextGroup: "Завтра 18:00"
  },
  { 
    name: "Новокосино", 
    address: "Реутов, Юбилейный проспект, 60", 
    slug: "novokosino",
    workingHours: "Пн-Пт: 9:00-21:00, Сб-Вс: 10:00-18:00",
    activeGroups: 8,
    nextGroup: "Сегодня 19:30"
  },
  { 
    name: "Окская", 
    address: "ул. Окская, д. 3, корп. 1", 
    slug: "okskaya",
    workingHours: "Пн-Пт: 9:00-21:00, Сб-Вс: 10:00-18:00",
    activeGroups: 10,
    nextGroup: "Завтра 17:00"
  },
  { 
    name: "Стахановская", 
    address: "2-й Грайвороновский пр-д, 42к1", 
    slug: "stakhanovskaya",
    workingHours: "Пн-Пт: 9:00-21:00, Сб-Вс: 10:00-18:00",
    activeGroups: 15,
    nextGroup: "Сегодня 18:30"
  },
  { 
    name: "Солнцево", 
    address: "ул. Богданова, 6к1", 
    slug: "solntsevo",
    workingHours: "Пн-Пт: 9:00-21:00, Сб-Вс: 10:00-18:00",
    activeGroups: 9,
    nextGroup: "Завтра 16:00"
  },
  { 
    name: "Мытищи", 
    address: "ул. Борисовка, 16А", 
    slug: "mytishchi",
    workingHours: "Пн-Пт: 9:00-21:00, Сб-Вс: 10:00-18:00",
    activeGroups: 11,
    nextGroup: "Сегодня 17:30"
  },
  { 
    name: "Люберцы", 
    address: "3 Почтовое отделение, 65к1", 
    slug: "lyubertsy-1",
    workingHours: "Пн-Пт: 9:00-21:00, Сб-Вс: 10:00-18:00",
    activeGroups: 7,
    nextGroup: "Завтра 19:00"
  },
  { 
    name: "Красная горка", 
    address: "проспект Гагарина, 3/8", 
    slug: "lyubertsy-2",
    workingHours: "Пн-Пт: 9:00-21:00, Сб-Вс: 10:00-18:00",
    activeGroups: 13,
    nextGroup: "Сегодня 20:00"
  },
  { 
    name: "Онлайн школа", 
    address: "Cambridge One платформа", 
    slug: "online",
    workingHours: "24/7 доступ к материалам",
    activeGroups: 25,
    nextGroup: "Каждый час"
  },
];

const advantages = [
  {
    icon: Star,
    title: "Опытные преподаватели и носители",
    text: "Учителя с международными сертификатами и реальным опытом."
  },
  {
    icon: BookMarked,
    title: "Современные материалы",
    text: "Используем учебники Cambridge и интерактивные ресурсы."
  },
  {
    icon: Heart,
    title: "Атмосфера поддержки",
    text: "Мотивируем, создаём комфортную обстановку и помогаем поверить в себя."
  },
  {
    icon: MessageCircle,
    title: "Практика общения",
    text: "Ролевые игры, проекты, дискуссии и разговорные клубы."
  },
  {
    icon: Calendar,
    title: "Удобное расписание",
    text: "Филиалы рядом с домом и занятия онлайн."
  },
  {
    icon: BookMarked,
    title: "Лицензия на образование",
    text: "Обучение в O'KEY ENGLISH является структурированным, эффективным и безопасным."
  },
  {
    icon: Star,
    title: "Аккредитация Cambridge",
    text: "С 2019 года O'KEY ENGLISH получил аккредитацию Cambridge в связи с высокими результатами учеников."
  },
  {
    icon: Heart,
    title: "Используйте материнский капитал",
    text: "Оплачивайте обучение детей с гос.поддержкой."
  },
  {
    icon: Star,
    title: "Попробуйте бесплатно",
    text: "Запишитесь на пробный урок, чтобы ощутить все преимущества лично",
    isHighlighted: true
  }
];

const languages = [
  { name: "Английский", icon: "🇬🇧" },
  { name: "Французский", icon: "🇫🇷" },
  { name: "Испанский", icon: "🇪🇸" },
  { name: "Русский", icon: "🇷🇺" },
  { name: "Итальянский", icon: "🇮🇹" },
  { name: "Греческий", icon: "🇬🇷" },
  { name: "Иврит", icon: "🇮🇱" },
  { name: "10+", icon: "🌍" }
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
              <span className="inline-flex items-baseline justify-center gap-2">
                <AnimatedLanguage />
              </span>
              <br />
              для детей, подростков и взрослых
            </h1>
            <p className="text-xl lg:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              с <strong className="text-primary">гарантией прогресса</strong>
            </p>
            <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto">
              Подберём программу и расписание за 2 минуты. Пробный урок — бесплатно.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 px-4">
              <Link to="/test" className="w-full sm:w-auto">
                <Button variant="hero" size="lg" className="flex items-center justify-center gap-2 w-full sm:w-auto">
                  <BookOpen className="w-5 h-5" />
                  Пройти онлайн-тест уровня
                </Button>
              </Link>
              <Link to="/contacts" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="flex items-center justify-center gap-2 w-full sm:w-auto">
                  <UserCheck className="w-5 h-5" />
                  Записаться на пробный урок
                </Button>
              </Link>
            </div>

            <div className="flex flex-wrap justify-center items-center gap-6 text-center">
              <div className="flex items-center gap-3 p-4 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 hover-scale">
                <div className="w-14 h-14 bg-gradient-primary rounded-full flex items-center justify-center shadow-lg">
                  <Award className="w-7 h-7 text-white" />
                </div>
                <div>
                  <div className="text-3xl font-black text-primary drop-shadow-lg">10 лет</div>
                  <div className="text-sm text-primary/80 font-medium">на рынке</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 hover-scale">
                <div className="w-14 h-14 bg-gradient-primary rounded-full flex items-center justify-center shadow-lg">
                  <GraduationCap className="w-7 h-7 text-white" />
                </div>
                <div>
                  <div className="text-3xl font-black text-primary drop-shadow-lg">10000+</div>
                  <div className="text-sm text-primary/80 font-medium">выпускников</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 hover-scale">
                <div className="w-14 h-14 bg-gradient-primary rounded-full flex items-center justify-center shadow-lg">
                  <BookOpen className="w-7 h-7 text-white" />
                </div>
                <div>
                  <div className="text-3xl font-black text-primary drop-shadow-lg">10+</div>
                  <div className="text-sm text-primary/80 font-medium">языков преподаём</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Advantages */}
      <section className="py-20 bg-secondary/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Наши преимущества</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {advantages.map((advantage, index) => (
              <Card key={index} className={`text-center hover:shadow-lg transition-shadow ${
                advantage.isHighlighted ? 'bg-gradient-primary text-white' : ''
              }`}>
                <CardContent className="p-6">
                  <advantage.icon className={`w-12 h-12 mx-auto mb-4 ${
                    advantage.isHighlighted ? 'text-white' : 'text-primary'
                  }`} />
                  <h3 className={`text-xl font-semibold mb-3 ${
                    advantage.isHighlighted ? 'text-white' : ''
                  }`}>{advantage.title}</h3>
                  <p className={advantage.isHighlighted ? 'text-white/90' : 'text-muted-foreground'}>
                    {advantage.text}
                  </p>
                  {advantage.isHighlighted && (
                    <Link to="/contacts" className="inline-block mt-4">
                      <Button 
                        variant="secondary"
                        className="bg-white text-primary hover:bg-white/90"
                      >
                        Записаться
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Филиалы и расписание
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              8 филиалов в удобных локациях + онлайн школа. Гибкое расписание, есть группы каждый день
            </p>
            
            <div className="flex flex-wrap justify-center gap-4">
              <Badge variant="outline" className="px-4 py-2">
                <MapPin className="w-4 h-4 mr-2" />
                8 филиалов
              </Badge>
              <Badge variant="outline" className="px-4 py-2">
                <Users className="w-4 h-4 mr-2" />
                110+ активных групп
              </Badge>
              <Badge variant="outline" className="px-4 py-2">
                <Clock className="w-4 h-4 mr-2" />
                Гибкое расписание
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {branches.map((branch) => (
              <Card key={branch.slug} className="card-elevated hover:border-primary/50 transition-all overflow-hidden">
                <div className="aspect-[16/9] bg-gradient-subtle flex items-center justify-center">
                  <span className="text-muted-foreground">Фото филиала {branch.name}</span>
                </div>
                
                <CardContent className="p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-primary" />
                        <h3 className="font-semibold text-xl">{branch.name}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">{branch.address}</p>
                    </div>
                    <Badge className="bg-gradient-primary text-white">
                      {branch.activeGroups} групп
                    </Badge>
                  </div>

                  {/* Working Hours */}
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-primary" />
                    <span>{branch.workingHours}</span>
                  </div>

                  {/* Available Languages */}
                  <div>
                    <h4 className="font-semibold mb-3">Доступные языки:</h4>
                    <div className="flex flex-wrap gap-2">
                      {languages.map((language, index) => (
                        <div key={index} className="flex items-center gap-1 bg-muted px-2 py-1 rounded-full text-xs">
                          <span className="text-sm">{language.icon}</span>
                          <span>{language.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Next Group */}
                  <div className="bg-gradient-subtle p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-sm text-muted-foreground">Ближайшая группа:</div>
                        <div className="font-medium">{branch.nextGroup}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Свободно:</div>
                        <div className="text-primary font-semibold">3 места</div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-3">
                    <Link to={`/branches/${branch.slug}`}>
                      <Button variant="hero" className="w-full">
                        <ArrowRight className="w-4 h-4 mr-2" />
                        Подробнее о филиале
                      </Button>
                    </Link>
                    
                    <div className="flex justify-center gap-3">
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => window.open("tel:+74997073535", "_blank")}
                        className="rounded-full"
                      >
                        <Phone className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => handleWhatsApp(branch.name)}
                        className="rounded-full"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => {
                          const message = `Здравствуйте! Интересует обучение в филиале ${branch.name}.`;
                          window.open(`https://t.me/okeyenglish_bot?start=${encodeURIComponent(message)}`, "_blank");
                        }}
                        className="rounded-full"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
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