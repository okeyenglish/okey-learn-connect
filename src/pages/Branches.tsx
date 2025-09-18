import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, 
  Clock, 
  Phone, 
  MessageCircle,
  Users,
  Star,
  UserCheck,
  ArrowRight
} from "lucide-react";

const branches = [
  { 
    id: "kotelniki",
    name: "Котельники", 
    address: "2-й Покровский проезд, 14к2",
    metro: "Котельники",
    workingHours: "Пн-Пт: 9:00-21:00, Сб-Вс: 10:00-18:00",
    image: "/placeholder-branch-1.jpg",
    features: ["Современные классы", "Интерактивные доски", "Детская зона"],
    activeGroups: 12,
    nextGroup: "Завтра 18:00"
  },
  { 
    id: "novokosino",
    name: "Новокосино", 
    address: "Реутов, Юбилейный проспект, 60",
    metro: "Новокосино",
    workingHours: "Пн-Пт: 9:00-21:00, Сб-Вс: 10:00-18:00",
    image: "/placeholder-branch-2.jpg",
    features: ["Просторные классы", "Парковка", "Кафе рядом"],
    activeGroups: 8,
    nextGroup: "Сегодня 19:30"
  },
  { 
    id: "okskaya",
    name: "Окская", 
    address: "ул. Окская, д. 3, корп. 1",
    metro: "Окская",
    workingHours: "Пн-Пт: 9:00-21:00, Сб-Вс: 10:00-18:00",
    image: "/placeholder-branch-3.jpg",
    features: ["Уютная атмосфера", "Библиотека", "Игровая комната"],
    activeGroups: 10,
    nextGroup: "Завтра 17:00"
  },
  { 
    id: "stakhanovskaya",
    name: "Стахановская", 
    address: "2-й Грайвороновский проезд, д. 42, корп. 1",
    metro: "Стахановская",
    workingHours: "Пн-Пт: 9:00-21:00, Сб-Вс: 10:00-18:00",
    image: "/placeholder-branch-4.jpg",
    features: ["Новый ремонт", "Мультимедиа", "Удобный подъезд"],
    activeGroups: 15,
    nextGroup: "Сегодня 18:30"
  },
  { 
    id: "solntsevo",
    name: "Солнцево", 
    address: "ул. Богданова, 6к1",
    metro: "Солнцево",
    workingHours: "Пн-Пт: 9:00-21:00, Сб-Вс: 10:00-18:00",
    image: "/placeholder-branch-5.jpg",
    features: ["Новые классы", "Удобная парковка", "Детская площадка"],
    activeGroups: 9,
    nextGroup: "Завтра 16:00"
  },
  { 
    id: "mytishchi",
    name: "Мытищи", 
    address: "ул. Борисовка, 16А",
    metro: "Мытищи (МЦД-1)",
    workingHours: "Пн-Пт: 9:00-21:00, Сб-Вс: 10:00-18:00",
    image: "/placeholder-branch-6.jpg",
    features: ["Просторные аудитории", "Техническое оснащение", "Буфет"],
    activeGroups: 11,
    nextGroup: "Сегодня 17:30"
  },
  { 
    id: "lyubertsy-1",
    name: "Люберцы", 
    address: "3 Почтовое отделение, 65к1",
    metro: "Люберцы (МЦД-1)",
    workingHours: "Пн-Пт: 9:00-21:00, Сб-Вс: 10:00-18:00",
    image: "/placeholder-branch-7.jpg",
    features: ["Комфортная обстановка", "Методические материалы", "Зона отдыха"],
    activeGroups: 7,
    nextGroup: "Завтра 19:00"
  },
  { 
    id: "lyubertsy-2",
    name: "Красная горка", 
    address: "проспект Гагарина, 3/8",
    metro: "Люберцы (МЦД-1)",
    workingHours: "Пн-Пт: 9:00-21:00, Сб-Вс: 10:00-18:00",
    image: "/placeholder-branch-8.jpg",
    features: ["Центральное расположение", "Современное оборудование", "Библиотека"],
    activeGroups: 13,
    nextGroup: "Сегодня 20:00"
  },
  { 
    id: "online",
    name: "Онлайн школа", 
    address: "Cambridge One платформа",
    metro: "По всей планете",
    workingHours: "24/7 доступ к материалам",
    image: "/placeholder-online.jpg",
    features: ["Cambridge One", "Интерактивные уроки", "Гибкое расписание"],
    activeGroups: 25,
    nextGroup: "Каждый час"
  }
];

export default function Locations() {
  const handleWhatsApp = (branchName: string) => {
    const message = `Здравствуйте! Интересует обучение в филиале ${branchName}.`;
    window.open(`https://wa.me/79937073553?text=${encodeURIComponent(message)}`, "_blank");
  };

  return (
    <div className="min-h-screen py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl lg:text-5xl font-bold mb-6">
            Наши <span className="text-gradient">филиалы</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            9 удобных локаций в Москве и Подмосковье + онлайн школа с современными классами и опытными преподавателями
          </p>
          
          <div className="flex flex-wrap justify-center gap-4">
            <Badge variant="outline" className="px-4 py-2">
              <MapPin className="w-4 h-4 mr-2" />
              9 филиалов
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

        {/* Quick Navigation */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-9 gap-4 mb-16">
          {branches.map((branch) => (
            <Link 
              key={branch.id}
              to={`/branches/${branch.id}`}
              className="text-center p-4 rounded-lg border hover:border-primary/50 hover:bg-muted/50 transition-all"
            >
              <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-3">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <div className="font-semibold">{branch.name}</div>
              <div className="text-sm text-muted-foreground">{branch.metro}</div>
            </Link>
          ))}
        </div>

        {/* Branches Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          {branches.map((branch) => (
            <Card key={branch.id} className="card-elevated hover:border-primary/50 transition-all overflow-hidden">
              <div className="aspect-[16/9] bg-gradient-subtle flex items-center justify-center">
                <span className="text-muted-foreground">Фото филиала {branch.name}</span>
              </div>
              
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-primary" />
                      {branch.name}
                    </CardTitle>
                    <CardDescription className="mt-2">
                      {branch.address}
                    </CardDescription>
                  </div>
                  <Badge className="bg-gradient-primary text-white">
                    {branch.activeGroups} групп
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Working Hours */}
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>{branch.workingHours}</span>
                </div>

                {/* Features */}
                <div>
                  <h4 className="font-semibold mb-3">Особенности филиала:</h4>
                  <div className="flex flex-wrap gap-2">
                    {branch.features.map((feature, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {feature}
                      </Badge>
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
                  <Link to={`/branches/${branch.id}`}>
                    <Button variant="hero" className="w-full">
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Подробнее о филиале
                    </Button>
                  </Link>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open("tel:+74997073535")}
                    >
                      <Phone className="w-4 h-4 mr-2" />
                      Позвонить
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleWhatsApp(branch.name)}
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      WhatsApp
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* General Schedule Info */}
        <section className="bg-gradient-subtle rounded-2xl p-8 lg:p-12 mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4">
              Общее расписание
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Во всех филиалах действует гибкое расписание с группами каждый день недели
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-semibold mb-2">Удобное время</h3>
              <p className="text-sm text-muted-foreground">
                Утренние, дневные и вечерние группы. Занятия в будни и выходные
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-semibold mb-2">Малые группы</h3>
              <p className="text-sm text-muted-foreground">
                6-12 человек в группе для максимально эффективного обучения
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-semibold mb-2">Все уровни</h3>
              <p className="text-sm text-muted-foreground">
                От начинающих A1 до продвинутых C2. Регулярный набор новых групп
              </p>
            </div>
          </div>
        </section>

        {/* Map Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">Все филиалы на карте</h2>
          <Card className="card-elevated">
            <CardContent className="p-0">
              <div className="aspect-[16/9] bg-gradient-subtle rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="w-16 h-16 text-primary mx-auto mb-4" />
                  <p className="text-lg font-semibold">Интерактивная карта</p>
                  <p className="text-sm text-muted-foreground">9 филиалов O'KEY ENGLISH в Москве и Подмосковье + онлайн</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* CTA Section */}
        <section className="bg-primary rounded-2xl p-8 lg:p-12 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">
            Выберите удобный филиал
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Запишитесь на бесплатный пробный урок в любом из наших филиалов
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/contacts">
              <Button variant="secondary" size="lg" className="flex items-center gap-2">
                <UserCheck className="w-5 h-5" />
                Записаться на пробный урок
              </Button>
            </Link>
            <Button 
              variant="outline" 
              size="lg"
              className="border-white text-white hover:bg-white hover:text-primary"
              onClick={() => handleWhatsApp("ближайшем")}
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              Выбрать в WhatsApp
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}