import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Globe, Users, Laptop, GraduationCap, Star, BookMarked, Heart, MessageCircle, Calendar, Phone, Send } from "lucide-react";

export default function About() {
  const handleWhatsApp = () => {
    window.open('https://wa.me/79999999999', '_blank');
  };

  const handleTelegram = () => {
    window.open('https://t.me/your_telegram_handle', '_blank');
  };

  const features1 = [
    {
      icon: BookOpen,
      title: "Курсы английского A1–C2",
      text: "Для начинающих и продвинутых — по международной системе уровней CEFR."
    },
    {
      icon: Globe,
      title: "Другие языки",
      text: "Испанский, немецкий, французский, итальянский, китайский и другие."
    },
    {
      icon: Users,
      title: "Для всех возрастов",
      text: "Дети от 3 лет, школьники, подростки, взрослые и корпоративное обучение."
    },
    {
      icon: Laptop,
      title: "Разные форматы",
      text: "Групповые и индивидуальные занятия, онлайн и офлайн, интенсивы и разговорные клубы."
    },
    {
      icon: GraduationCap,
      title: "Подготовка к экзаменам",
      text: "ОГЭ, ЕГЭ, Cambridge Exams, IELTS, TOEFL."
    }
  ];

  const features2 = [
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

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-primary text-white py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              O'KEY ENGLISH — сеть языковых центров
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-white/90">
              Изучайте английский и другие иностранные языки для детей и взрослых
            </p>
            <Button 
              onClick={handleWhatsApp}
              size="lg" 
              variant="secondary"
              className="text-lg px-8 py-4"
            >
              Записаться на пробный урок
            </Button>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Наша миссия</h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Мы уверены, что знание языков открывает новые горизонты: учёба за границей, путешествия без границ, 
              престижная работа, новые друзья и интересные знакомства. Наша задача — сделать изучение английского 
              и других языков доступным, увлекательным и эффективным.
            </p>
          </div>
        </div>
      </section>

      {/* What We Offer */}
      <section className="py-16 bg-secondary/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Что мы предлагаем</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features1.map((feature, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <feature.icon className="w-12 h-12 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Choose Your Option */}
      <section className="py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Подберите свой вариант</h2>
            <p className="text-xl text-muted-foreground mb-12">
              Выберите удобный для себя формат и график
            </p>
            
            <div className="flex justify-center gap-4 mb-8">
              <Button 
                onClick={handleWhatsApp}
                variant="outline"
                size="lg"
                className="flex items-center gap-2"
              >
                <Phone className="w-5 h-5 text-green-600" />
                WhatsApp
              </Button>
              <Button 
                onClick={handleTelegram}
                variant="outline"
                size="lg"
                className="flex items-center gap-2"
              >
                <Send className="w-5 h-5 text-blue-500" />
                Telegram
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Our Advantages */}
      <section className="py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Наши преимущества</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features2.map((feature, index) => (
              <Card key={index} className={`text-center hover:shadow-lg transition-shadow ${
                feature.isHighlighted ? 'bg-gradient-primary text-white' : ''
              }`}>
                <CardContent className="p-6">
                  <feature.icon className={`w-12 h-12 mx-auto mb-4 ${
                    feature.isHighlighted ? 'text-white' : 'text-primary'
                  }`} />
                  <h3 className={`text-xl font-semibold mb-3 ${
                    feature.isHighlighted ? 'text-white' : ''
                  }`}>{feature.title}</h3>
                  <p className={feature.isHighlighted ? 'text-white/90' : 'text-muted-foreground'}>
                    {feature.text}
                  </p>
                  {feature.isHighlighted && (
                    <Button 
                      onClick={handleWhatsApp}
                      variant="secondary"
                      className="mt-4 bg-white text-primary hover:bg-white/90"
                    >
                      Записаться
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Who We're For */}
      <section className="py-16 bg-secondary/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-8">Для кого мы подходим</h2>
            <div className="space-y-4 text-lg">
              <p className="flex items-start gap-3">
                <span className="text-primary font-semibold">—</span>
                <span>Родителям, которые хотят, чтобы ребёнок уверенно владел английским и другими языками.</span>
              </p>
              <p className="flex items-start gap-3">
                <span className="text-primary font-semibold">—</span>
                <span>Подросткам для подготовки к экзаменам и поступлению.</span>
              </p>
              <p className="flex items-start gap-3">
                <span className="text-primary font-semibold">—</span>
                <span>Взрослым, которые хотят свободно говорить для работы, учёбы и путешествий.</span>
              </p>
              <p className="flex items-start gap-3">
                <span className="text-primary font-semibold">—</span>
                <span>Компаниям для корпоративного обучения сотрудников.</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Results */}
      <section className="py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-8">Наши результаты</h2>
            <div className="space-y-4 text-lg">
              <p className="flex items-start gap-3">
                <span className="text-primary font-semibold">—</span>
                <span>Более 10 лет на рынке образовательных услуг.</span>
              </p>
              <p className="flex items-start gap-3">
                <span className="text-primary font-semibold">—</span>
                <span>Сотни учеников ежегодно сдают международные экзамены.</span>
              </p>
              <p className="flex items-start gap-3">
                <span className="text-primary font-semibold">—</span>
                <span>Тысячи детей и взрослых уже говорят на английском и других языках уверенно.</span>
              </p>
            </div>
          </div>
        </div>
      </section>


      {/* Final CTA */}
      <section className="py-20 bg-secondary/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Сделайте первый шаг</h2>
            <p className="text-xl mb-8 text-muted-foreground">
              Запишитесь на бесплатный пробный урок — и уже через несколько занятий почувствуете результат!
            </p>
            <Button 
              onClick={handleWhatsApp}
              size="lg" 
              variant="default"
              className="text-lg px-8 py-4"
            >
              Записаться
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}