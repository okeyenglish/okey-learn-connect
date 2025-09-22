import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GraduationCap, Users, Clock, Target, ArrowRight } from "lucide-react";
import OptimizedImage from "@/components/OptimizedImage";

// Import program images
import superSafariImg from "@/assets/super-safari.png";
import kidsBoxImg from "@/assets/kids-box.png";
import prepareImg from "@/assets/prepare.png";
import empowerImg from "@/assets/empower.png";

const programs = [
  {
    name: "Super Safari",
    ageCategory: "Дошкольникам 3-5 лет",
    age: "3–6 лет",
    level: "Starter",
    description: "Английский через игры, песни и сказки. Мягкое погружение в язык с первых шагов.",
    features: ["Игровая методика", "Развитие речи", "Подготовка к школе"],
    color: "bg-gradient-to-r from-pink-500 to-rose-500",
    image: superSafariImg,
    href: "/programs/supersafari"
  },
  {
    name: "Kid's Box",
    ageCategory: "Младшим школьникам 6-9 лет",
    age: "6–9 лет", 
    level: "A1–A2",
    description: "Читаем, говорим, понемногу пишем. Движемся к уверенному базовому уровню.",
    features: ["Cambridge материалы", "YLE подготовка", "Развитие навыков"],
    color: "bg-gradient-to-r from-blue-500 to-cyan-500",
    image: kidsBoxImg,
    href: "/programs/kidsbox"
  },
  {
    name: "Prepare",
    ageCategory: "Подросткам 10-17 лет",
    age: "10–17 лет",
    level: "A1–B2", 
    description: "Подростковые темы, уверенная речь, подготовка к KET/PET/FCE, ОГЭ/ЕГЭ.",
    features: ["7 уровней", "Экзамены Cambridge", "Speaking Club"],
    color: "bg-gradient-to-r from-purple-500 to-indigo-500",
    image: prepareImg,
    href: "/programs/prepare"
  },
  {
    name: "Empower",
    ageCategory: "Взрослым", 
    age: "Взрослые",
    level: "A1–C2",
    description: "Английский для жизни и работы. Комбинированный формат и speaking-клуб.",
    features: ["Для работы и жизни", "Гибкий график", "Workshop 56 ситуаций"],
    color: "bg-gradient-to-r from-emerald-500 to-teal-500",
    image: empowerImg,
    href: "/programs/empower"
  },
  {
    name: "Субботний мини-садик",
    ageCategory: "Дошкольникам 3-6 лет",
    age: "3–6 лет",
    level: "Pre-A1 (игровой)",
    description: "Весёлые занятия по субботам: игры, творчество, песни и сказки на английском.",
    features: ["Субботы утром", "Игровой формат", "Перекусы включены"],
    color: "bg-gradient-to-r from-orange-400 to-pink-500",
    image: superSafariImg, // Используем временно изображение Super Safari
    href: "/programs/minisadik"
  },
  {
    name: "Workshop",
    ageCategory: "Детям 7+, подросткам и взрослым",
    age: "7+ лет",
    level: "A1–B2+",
    description: "Живые мастер-классы по английскому. Разговорная практика через темы, задания и ролевые игры.",
    features: ["Оффлайн формат", "60 минут", "Тематические встречи", "Мини-группы"],
    color: "bg-gradient-to-r from-violet-500 to-purple-500",
    image: empowerImg, // Используем временно изображение Empower
    href: "/programs/workshop"
  },
  {
    name: "Speaking Club Online",
    ageCategory: "Детям 7+ и взрослым",
    age: "7+ лет",
    level: "A1–B2+",
    description: "Онлайн разговорный клуб с носителем языка. Живые дискуссии и темы Cambridge по субботам.",
    features: ["Онлайн формат", "Носитель языка", "Суббота 10:00-13:30 МСК", "Темы Cambridge"],
    color: "bg-gradient-to-r from-blue-500 to-indigo-500",
    image: empowerImg, // Используем временно изображение Empower
    href: "/programs/speaking-club"
  }
];

export default function Programs() {
  return (
    <div className="min-h-screen py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl lg:text-5xl font-bold mb-6">
            <span className="text-gradient">Программы обучения</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Cambridge-курсы для каждого возраста: от первых слов до свободного общения
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 text-center">
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">7</div>
                <div className="text-sm text-muted-foreground">программы</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">Pre-A1–C2</div>
                <div className="text-sm text-muted-foreground">уровни</div>
              </div>
            </div>
          </div>
        </div>

        {/* Programs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {programs.map((program) => (
            <Card key={program.name} className="card-elevated group hover:border-primary/50 transition-all overflow-hidden">
              <CardContent className="p-0">
                <div className="relative h-64">
                  <OptimizedImage
                    src={program.image} 
                    alt={`${program.name} - ${program.description}`}
                    width={400}
                    height={256}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-2">{program.ageCategory}</h3>
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="w-5 h-5 text-primary" />
                    <span className="font-semibold text-primary">{program.name} ({program.level})</span>
                  </div>
                  
                  <p className="text-muted-foreground mb-4">{program.description}</p>
                  
                  <ul className="space-y-2 mb-6">
                    {program.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-accent" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Link to={program.href}>
                    <Button className="w-full group-hover:bg-primary/90 transition-colors">
                      Подробнее о программе
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA Section */}
        <div className="text-center bg-muted/50 rounded-lg p-8">
          <h2 className="text-2xl font-bold mb-4">Не знаете, какая программа подойдет?</h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Пройдите бесплатный онлайн-тест или запишитесь на пробный урок — поможем определить уровень и подберем идеальную группу.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/test">
              <Button variant="outline" size="lg" className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Пройти тест уровня
              </Button>
            </Link>
            <Link to="/contacts">
              <Button size="lg" className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Записаться на пробный урок
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}