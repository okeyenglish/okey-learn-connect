import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import React from "react";
import { Button } from "@/components/ui/button";
import { Globe, Monitor, Headphones, Clock, Users, Award } from "lucide-react";
import ScheduleTable from "@/components/ScheduleTable";
import PriceCalculator from "@/components/PriceCalculator";
import { BranchPhotoGallery } from "@/components/branches/BranchPhotoGallery";
import SEOHead from "@/components/SEOHead";
import { branchSEOData, generateBranchJsonLd } from "@/data/seoData";

const LocationOnline = () => {
  const seoData = branchSEOData.online;
  
  return (
    <React.Fragment>
      <SEOHead
        title={seoData.title}
        description={seoData.description}
        keywords={seoData.keywords}
        canonicalUrl="https://okeyenglish.ru/branches/online"
        jsonLd={generateBranchJsonLd('online')}
      />
      <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="bg-primary/10 p-4 rounded-full">
              <Globe className="w-12 h-12 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-primary mb-4">
            <span className="text-gradient">Онлайн курсы английского</span> - O'KEY ENGLISH
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Изучайте английский язык из любой точки планеты на современной платформе Cambridge One
          </p>
        </div>

        {/* Photo Gallery */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">Фотографии онлайн школы</h2>
          <BranchPhotoGallery branchId="Онлайн школа" />
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <Card className="shadow-elegant">
            <CardHeader>
              <Monitor className="w-8 h-8 text-primary mb-2" />
              <CardTitle>Платформа Cambridge One</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Современная интерактивная платформа с мультимедийными материалами и адаптивным обучением
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="shadow-elegant">
            <CardHeader>
              <Users className="w-8 h-8 text-primary mb-2" />
              <CardTitle>Персональный подход</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Индивидуальные и групповые занятия с квалифицированными преподавателями
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="shadow-elegant">
            <CardHeader>
              <Clock className="w-8 h-8 text-primary mb-2" />
              <CardTitle>Гибкое расписание</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Занимайтесь в удобное время в любой точке мира, где есть интернет
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="shadow-elegant">
            <CardHeader>
              <Headphones className="w-8 h-8 text-primary mb-2" />
              <CardTitle>Качественная связь</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                HD-видео и кристально чистый звук для максимально эффективного обучения
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="shadow-elegant">
            <CardHeader>
              <Award className="w-8 h-8 text-primary mb-2" />
              <CardTitle>Сертификация</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Подготовка к международным экзаменам и получение сертификатов Cambridge
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="shadow-elegant">
            <CardHeader>
              <Globe className="w-8 h-8 text-primary mb-2" />
              <CardTitle>Мировое сообщество</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Общайтесь с учениками и преподавателями со всего мира в нашем онлайн-сообществе
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Platform Details */}
        <Card className="shadow-elevated mb-12">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Платформа Cambridge One</CardTitle>
            <CardDescription className="text-center text-lg">
              Передовые технологии для изучения английского языка
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-primary mb-2">Интерактивные уроки</h4>
                <p className="text-muted-foreground">
                  Современные мультимедийные материалы, видео, аудио и интерактивные упражнения
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-primary mb-2">Прогресс в реальном времени</h4>
                <p className="text-muted-foreground">
                  Отслеживайте свои достижения и получайте персональные рекомендации
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-primary mb-2">Мобильное приложение</h4>
                <p className="text-muted-foreground">
                  Продолжайте обучение на смартфоне или планшете в любое время
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-primary mb-2">Виртуальная классная комната</h4>
                <p className="text-muted-foreground">
                  Полноценные онлайн-уроки с интерактивной доской и групповыми активностями
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Price Calculator Section */}
        <div className="mb-12">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Рассчитайте стоимость обучения</h2>
            <p className="text-lg text-muted-foreground mb-8">
              Узнайте точную стоимость с учетом всех скидок и получите 2 подарка!
            </p>
          </div>
          <PriceCalculator preSelectedBranch="online" />
        </div>

        {/* Schedule Section */}
        <div className="mb-12">
          <ScheduleTable branchName="Онлайн" />
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <Card className="bg-gradient-primary text-white shadow-elevated max-w-2xl mx-auto">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold mb-4">
                Начните изучать английский уже сегодня!
              </h3>
              <p className="mb-6 opacity-90">
                Присоединяйтесь к тысячам студентов по всему миру и достигните своих целей в изучении английского языка
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="secondary" size="lg" className="bg-white text-primary hover:bg-white/90">
                  Записаться на пробный урок
                </Button>
                <Button variant="outline" size="lg" className="border-white text-white hover:bg-white/10">
                  Узнать больше
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Unique Content for Online Learning */}
        <div className="mt-16">
          <div className="container mx-auto px-4">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold mb-4 text-center">Дистанционное обучение английскому языку</h2>
                <div className="prose max-w-none text-muted-foreground">
                  <p className="mb-4">
                    Онлайн курсы английского языка O'KEY ENGLISH предлагают качественное дистанционное 
                    обучение для студентов из любой точки мира. Наши онлайн занятия английским 
                    проводятся с использованием интерактивных платформ и Cambridge методик, 
                    обеспечивая эффективность, сравнимую с очным обучением.
                  </p>
                  <p className="mb-4">
                    Английский через интернет в O'KEY ENGLISH включает индивидуальные и групповые 
                    занятия для детей и взрослых. Опытные преподаватели-носители языка 
                    и сертифицированные русскоязычные педагоги используют современные технологии 
                    для создания увлекательного процесса изучения языка онлайн.
                  </p>
                  <p>
                    Преимущества онлайн обучения: гибкое расписание, экономия времени на дорогу, 
                    индивидуальный подход и доступ к лучшим преподавателям независимо от географии. 
                    Запишитесь на бесплатный пробный онлайн урок уже сегодня!
                  </p>
                </div>
              </CardContent>
          </Card>
        </div>
      </div>
      </div>
    </div>
    </React.Fragment>
  );
};

export default LocationOnline;