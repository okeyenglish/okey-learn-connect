import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Clock, 
  GraduationCap, 
  Star,
  CheckCircle,
  MessageCircle,
  UserCheck
} from "lucide-react";

const courses = [
  {
    id: "kids-4-6",
    title: "Kids 4–6",
    description: "Игровой английский для малышей",
    age: "4-6 лет",
    duration: "45 мин",
    groupSize: "6-8 детей",
    level: "A0-A1",
    price: "4 800₽/месяц",
    features: [
      "Игровая методика",
      "Развитие через творчество",
      "Мягкая адаптация",
      "Опытные детские педагоги"
    ]
  },
  {
    id: "kids-7-9", 
    title: "Kids 7–9",
    description: "Активный английский для школьников",
    age: "7-9 лет",
    duration: "60 мин",
    groupSize: "8-10 детей",
    level: "A1-A2",
    price: "5 200₽/месяц",
    features: [
      "Подготовка к школьной программе",
      "Интерактивные задания",
      "Развитие всех навыков",
      "Регулярные тесты прогресса"
    ]
  },
  {
    id: "teens",
    title: "Teens",
    description: "Современный английский для подростков",
    age: "10-17 лет", 
    duration: "80 мин",
    groupSize: "8-12 человек",
    level: "A2-B2",
    price: "6 400₽/месяц",
    features: [
      "Актуальные темы",
      "Подготовка к ОГЭ/ЕГЭ",
      "Разговорные клубы",
      "Проектная работа"
    ]
  },
  {
    id: "adults",
    title: "Adults General",
    description: "Общий английский для взрослых",
    age: "18+ лет",
    duration: "80 мин", 
    groupSize: "8-10 человек",
    level: "A1-C1",
    price: "7 200₽/месяц",
    features: [
      "Коммуникативная методика",
      "Практические ситуации",
      "Гибкое расписание",
      "Бизнес-модули"
    ]
  },
  {
    id: "ielts",
    title: "IELTS Preparation",
    description: "Подготовка к международному экзамену",
    age: "16+ лет",
    duration: "120 мин",
    groupSize: "6-8 человек", 
    level: "B1-C2",
    price: "9 600₽/месяц",
    features: [
      "Стратегии выполнения заданий",
      "Практика всех частей экзамена",
      "Пробные тесты",
      "Гарантия результата"
    ]
  },
  {
    id: "cambridge",
    title: "Cambridge Exams",
    description: "Подготовка к Кембриджским экзаменам",
    age: "12+ лет",
    duration: "120 мин",
    groupSize: "6-8 человек",
    level: "A2-C2", 
    price: "9 600₽/месяц",
    features: [
      "FCE, CAE, CPE подготовка",
      "Сертифицированные преподаватели", 
      "Аутентичные материалы",
      "Высокий процент сдачи"
     ]
  },
  {
    id: "minisadik",
    title: "Субботний мини-садик",
    description: "Игровой английский для дошкольников 3-6 лет по субботам утром",
    age: "3-6 лет",
    duration: "Субботы утром",
    groupSize: "Мини-группы",
    level: "Pre-A1 (игровой)",
    price: "от 2500₽/мес",
    features: [
      "Игры и творчество",
      "Песни и сказки",
      "Мягкая адаптация",
      "Перекусы включены"
    ]
  }
];

export default function Courses() {
  const handleWhatsApp = (course: string) => {
    const message = `Здравствуйте! Интересует курс "${course}".`;
    window.open(`https://wa.me/79937073553?text=${encodeURIComponent(message)}`, "_blank");
  };

  return (
    <div className="min-h-screen py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl lg:text-5xl font-bold mb-6">
            Курсы <span className="text-gradient">английского языка</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Программы для всех возрастов и уровней — от первых слов до международных экзаменов
          </p>
          
          <div className="flex flex-wrap justify-center gap-4">
            <Badge variant="outline" className="px-4 py-2">
              <Users className="w-4 h-4 mr-2" />
              Малые группы
            </Badge>
            <Badge variant="outline" className="px-4 py-2">
              <GraduationCap className="w-4 h-4 mr-2" />
              Сертифицированные преподаватели
            </Badge>
            <Badge variant="outline" className="px-4 py-2">
              <CheckCircle className="w-4 h-4 mr-2" />
              Гарантия прогресса
            </Badge>
          </div>
        </div>

        {/* Courses Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {courses.map((course) => (
            <Card key={course.id} className="card-elevated hover:border-primary/50 transition-all">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl mb-2">{course.title}</CardTitle>
                    <CardDescription className="text-base">
                      {course.description}
                    </CardDescription>
                  </div>
                  <Badge className="bg-gradient-primary text-white">
                    {course.level}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Course Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    <span>{course.age}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <span>{course.duration}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-primary" />
                    <span>{course.groupSize}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-accent" />
                    <span className="font-semibold text-primary">{course.price}</span>
                  </div>
                </div>

                {/* Features */}
                <div>
                  <h4 className="font-semibold mb-3">Особенности курса:</h4>
                  <ul className="space-y-2">
                    {course.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 pt-4">
                  <Link to="/contacts">
                    <Button variant="hero" className="w-full">
                      <UserCheck className="w-4 h-4 mr-2" />
                      Записаться на пробный
                    </Button>
                  </Link>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => handleWhatsApp(course.title)}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Узнать подробнее
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Corporate Programs */}
        <section className="bg-gradient-subtle rounded-2xl p-8 lg:p-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4">
              Корпоративное обучение
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Индивидуальные программы для компаний любого размера
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-semibold mb-2">Гибкие форматы</h3>
              <p className="text-sm text-muted-foreground">
                Групповые и индивидуальные занятия, онлайн и офлайн
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-semibold mb-2">Удобное время</h3>
              <p className="text-sm text-muted-foreground">
                Занятия в рабочее время или после работы
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <GraduationCap className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-semibold mb-2">Специализация</h3>
              <p className="text-sm text-muted-foreground">
                Программы по отраслям и должностям
              </p>
            </div>
          </div>

          <div className="text-center">
            <Link to="/contacts">
              <Button variant="hero" size="lg" className="mr-4">
                Получить предложение
              </Button>
            </Link>
            <Button variant="outline" size="lg">
              Скачать презентацию
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}