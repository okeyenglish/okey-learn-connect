import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Phone, MessageCircle, Send, Clock, UserCheck } from "lucide-react";
import ScheduleTable from "@/components/ScheduleTable";
import PriceCalculator from "@/components/PriceCalculator";
import YandexReviews from "@/components/YandexReviews";
import lyubertsyImage from "@/assets/lyubertsy-branch.jpg";
import SEOHead from "@/components/SEOHead";
import { branchSEOData, generateBranchJsonLd } from "@/data/seoData";

export default function LocationLyubertsy1() {
  const handleWhatsApp = () => {
    const message = encodeURIComponent("Здравствуйте! Хочу узнать подробнее об обучении в филиале Люберцы");
    window.open(`https://wa.me/79937073553?text=${message}`, '_blank');
  };

  const handlePhone = () => {
    window.open('tel:+74997073535', '_self');
  };

  const handleTelegram = () => {
    const message = encodeURIComponent("Здравствуйте! Хочу узнать подробнее об обучении в филиале Люберцы");
    window.open(`https://t.me/79937073553?text=${message}`, '_blank');
  };

  const seoData = branchSEOData.lyubertsy1;
  
  return (
    <React.Fragment>
      <SEOHead
        title={seoData.title}
        description={seoData.description}
        keywords={seoData.keywords}
        canonicalUrl="https://okeyenglish.ru/branches/lyubertsy1"
        jsonLd={generateBranchJsonLd('lyubertsy1')}
      />
      <div className="min-h-screen py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl lg:text-5xl font-bold mb-4">
            Английский язык в <span className="text-gradient">Люберцах</span> - O'KEY ENGLISH
          </h1>
          <div className="flex items-center justify-center gap-2 text-lg text-muted-foreground mb-6">
            <MapPin className="w-5 h-5 text-primary" />
            <span>3 Почтовое отделение, 65к1</span>
          </div>
        </div>

        {/* Branch Photo */}
        <div className="mb-16">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <img 
                src={lyubertsyImage} 
                alt="Учебный класс в филиале O'KEY English в Люберцах с современным дизайном в стиле Лондона"
                className="w-full h-[400px] object-cover"
              />
            </CardContent>
          </Card>
        </div>

        {/* Branch Info */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Адрес и контакты
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-lg font-medium">3 Почтовое отделение, 65к1</p>
                <p className="text-muted-foreground">г. Люберцы, Московская область</p>
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handlePhone}
                  className="flex items-center gap-2"
                >
                  <Phone className="w-4 h-4" />
                  +7 (499) 707-35-35
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleWhatsApp}
                  className="flex items-center gap-2 text-green-600 border-green-600 hover:bg-green-50"
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleTelegram}
                  className="flex items-center gap-2 text-blue-500 border-blue-500 hover:bg-blue-50"
                >
                  <Send className="w-4 h-4" />
                  Telegram
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Время работы
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Понедельник - Пятница:</span>
                  <span className="font-medium">09:00 - 21:00</span>
                </div>
                <div className="flex justify-between">
                  <span>Суббота:</span>
                  <span className="font-medium">09:00 - 15:00</span>
                </div>
                <div className="flex justify-between">
                  <span>Воскресенье:</span>
                  <span className="font-medium">09:00 - 15:00</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Map and Directions */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">Как добраться</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>На общественном транспорте</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Электричкой:</h4>
                  <p className="text-muted-foreground">
                    До станции Люберцы, затем пешком или на автобусе.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">На автобусе:</h4>
                  <p className="text-muted-foreground">
                    Автобусы до остановки "3 Почтовое отделение"
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>На автомобиле</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Парковка:</h4>
                  <p className="text-muted-foreground">
                    Бесплатная парковка возле здания
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Ориентиры:</h4>
                  <p className="text-muted-foreground">
                    Рядом с почтовым отделением, в жилом районе Люберцы
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8">
            <Card>
              <CardContent className="p-0">
                <iframe
                  src="https://yandex.ru/map-widget/v1/?um=constructor%3Ab8e1f4a7b3c0c5b6e5d4f3e2a1b9c8d7f6e5&amp;source=constructor"
                  width="100%"
                  height="400"
                  frameBorder="0"
                  className="rounded-lg"
                  title="Карта филиала в Люберцах"
                ></iframe>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Price Calculator Section */}
        <div className="mt-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Рассчитайте стоимость обучения</h2>
            <p className="text-lg text-muted-foreground mb-8">
              Узнайте точную стоимость с учетом всех скидок и получите 2 подарка!
            </p>
          </div>
          <PriceCalculator preSelectedBranch="lyubertsy-1" />
        </div>

        {/* Schedule Section */}
        <div className="mt-16">
          <ScheduleTable branchName="Люберцы" />
        </div>

        {/* Reviews from Yandex Maps */}
        <div className="mt-16">
          <h2 className="text-3xl font-bold text-center mb-8">Отзывы с Яндекс.Карт</h2>
          {/* TODO: Добавить ID организации для Люберцы-1 */}
          <div className="text-center text-muted-foreground">
            <p>Отзывы для этого филиала будут добавлены после получения ID организации на Яндекс.Картах</p>
          </div>
        </div>
        
        {/* Unique Content for Lyubertsy Branch */}
        <div className="mt-16">
          <div className="container mx-auto px-4">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold mb-4 text-center">Школа английского языка в Люберцах</h2>
                <div className="prose max-w-none text-muted-foreground">
                  <p className="mb-4">
                    Наш филиал в Люберцах расположен в удобном районе рядом с 3 Почтовым отделением. 
                    Школа O'KEY ENGLISH в Люберцах предлагает качественное изучение английского языка 
                    для жителей Московской области. Наши опытные преподаватели, включая носителей языка, 
                    помогут освоить английский быстро и эффективно.
                  </p>
                  <p className="mb-4">
                    Курсы английского в Люберцах доступны для всех возрастов: от малышей 3-6 лет 
                    до взрослых студентов. Мы используем современные методики Cambridge English, 
                    что гарантирует высокое качество образования. Удобная транспортная доступность 
                    и бесплатная парковка делают обучение комфортным для всей семьи.
                  </p>
                  <p>
                    Запишитесь на бесплатный пробный урок и убедитесь в эффективности нашей методики! 
                    Средняя стоимость занятия в филиале Люберцы - от 740 рублей.
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
}