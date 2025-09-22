import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Phone, MessageCircle, Send, Clock, UserCheck } from "lucide-react";
import ScheduleTable from "@/components/ScheduleTable";
import PriceCalculator from "@/components/PriceCalculator";
import YandexReviews from "@/components/YandexReviews";
import mytishchiImage from "@/assets/mytishchi-branch.jpg";
import SEOHead from "@/components/SEOHead";
import { branchSEOData, generateBranchJsonLd } from "@/data/seoData";

export default function LocationMytishchi() {
  const handleWhatsApp = () => {
    const message = encodeURIComponent("Здравствуйте! Хочу узнать подробнее об обучении в филиале Мытищи");
    window.open(`https://wa.me/79937073553?text=${message}`, '_blank');
  };

  const handlePhone = () => {
    window.open('tel:+74997073535', '_self');
  };

  const handleTelegram = () => {
    const message = encodeURIComponent("Здравствуйте! Хочу узнать подробнее об обучении в филиале Мытищи");
    window.open(`https://t.me/79937073553?text=${message}`, '_blank');
  };

  const seoData = branchSEOData.mytishchi;
  
  return (
    <>
      <SEOHead 
        title={seoData.title}
        description={seoData.description}
        keywords={seoData.keywords}
        canonicalUrl="https://okeyenglish.ru/branches/mytishchi"
        jsonLd={generateBranchJsonLd('mytishchi')}
      />
      <div className="min-h-screen py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl lg:text-5xl font-bold mb-4">
            Английский язык в <span className="text-gradient">Мытищах</span> - O'KEY ENGLISH
          </h1>
          <div className="flex items-center justify-center gap-2 text-lg text-muted-foreground mb-6">
            <MapPin className="w-5 h-5 text-primary" />
            <span>ул. Борисовка, 16А</span>
          </div>
          
          <Button variant="hero" className="flex items-center gap-2">
            <UserCheck className="w-4 h-4" />
            Пробный урок
          </Button>
        </div>

        {/* Branch Photo */}
        <div className="mb-16">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <img 
                src={mytishchiImage} 
                alt="Детский класс в филиале O'KEY English в Мытищах с яркими стенами и игровой зоной"
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
                <p className="text-lg font-medium">ул. Борисовка, 16А</p>
                <p className="text-muted-foreground">г. Мытищи, Московская область</p>
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
                    До станции Мытищи, затем пешком или на автобусе до ул. Борисовка, 16А.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">На автобусе:</h4>
                  <p className="text-muted-foreground">
                    Автобусы до остановки "ул. Борисовка"
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
                    Рядом с железнодорожной станцией Мытищи, в центре города
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
                  title="Карта филиала в Мытищах"
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
          <PriceCalculator preSelectedBranch="mytishchi" />
        </div>

        {/* Schedule Section */}
        <div className="mt-16">
          <ScheduleTable branchName="Мытищи" />
        </div>

        {/* Reviews from Yandex Maps */}
        <div className="mt-16">
          <h2 className="text-3xl font-bold text-center mb-8">Отзывы с Яндекс.Карт</h2>
          <YandexReviews 
            orgId="45748069943"
            orgUrl="https://yandex.ru/sprav/45748069943/p/edit/main"
            orgTitle="O'KEY ENGLISH Мытищи на Яндекс.Картах"
            height={600}
            maxWidth={800}
          />
        </div>
        
        {/* Unique Content for Mytishchi Branch */}
        <div className="mt-16">
          <div className="container mx-auto px-4">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold mb-4 text-center">Школа английского языка в Мытищах</h2>
                <div className="prose max-w-none text-muted-foreground">
                  <p className="mb-4">
                    Курсы английского языка в Мытищах от O'KEY ENGLISH расположены в центре города 
                    по адресу ул. Борисовка, 16А. Наша школа английского в Мытищах предлагает 
                    жителям Московской области качественное образование с применением современных 
                    методик Cambridge English Assessment.
                  </p>
                  <p className="mb-4">
                    Филиал в Мытищах оснащен яркими детскими классами и современным оборудованием 
                    для эффективного изучения английского языка. Близкое расположение к 
                    железнодорожной станции Мытищи делает нашу школу доступной для студентов 
                    из разных районов города и области.
                  </p>
                  <p>
                    Преподаватели нашего филиала в Мытищах имеют международные сертификаты 
                    и многолетний опыт работы. Приводите детей на пробный урок и убедитесь 
                    в качестве нашего обучения! Удобная парковка и гибкое расписание.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}