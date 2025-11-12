import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Phone, MessageCircle, Send, Clock, UserCheck } from "lucide-react";
import ScheduleTable from "@/components/ScheduleTable";
import PriceCalculator from "@/components/PriceCalculator";
import YandexReviews from "@/components/YandexReviews";
import { TeachersSection } from "@/components/TeachersSection";
import { BranchPhotoCarousel } from "@/components/branches/BranchPhotoCarousel";
import SEOHead from "@/components/SEOHead";
import { branchSEOData, generateBranchJsonLd } from "@/data/seoData";
import stakhanovskayaImage from "@/assets/stakhanovskaya-branch-new.webp";

export default function LocationStakhanovskaya() {
  const seoData = branchSEOData.stakhanovskaya;
  const jsonLd = generateBranchJsonLd('stakhanovskaya');
  const handleWhatsApp = () => {
    const message = encodeURIComponent("Здравствуйте! Хочу узнать подробнее об обучении в филиале Стахановская");
    window.open(`https://wa.me/79937073553?text=${message}`, '_blank');
  };

  const handlePhone = () => {
    window.open('tel:+74997073535', '_self');
  };

  const handleTelegram = () => {
    window.open('https://t.me/englishmanager', '_blank');
  };

  return (
    <div className="min-h-screen py-20">
      <SEOHead 
        title={seoData.title}
        description={seoData.description}
        keywords={seoData.keywords}
        canonicalUrl="https://okeyenglish.ru/branches/stakhanovskaya"
        jsonLd={jsonLd}
      />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl lg:text-5xl font-bold mb-4">
            Английский язык на <span className="text-gradient">Стахановской</span> - O'KEY ENGLISH
          </h1>
          <div className="flex items-center justify-center gap-2 text-lg text-muted-foreground mb-6">
            <MapPin className="w-5 h-5 text-primary" />
            <span>2-й Грайвороновский пр-д, 42к1</span>
          </div>
        </div>

        {/* Branch Photo Carousel */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">Наш филиал</h2>
          <BranchPhotoCarousel branchId="Стахановская" />
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
                <p className="text-lg font-medium">2-й Грайвороновский пр-д, 42к1</p>
                <p className="text-muted-foreground">г. Москва, метро Стахановская</p>
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
                  <h4 className="font-semibold mb-2">От метро Стахановская:</h4>
                  <p className="text-muted-foreground">
                    (розовая Некрасовская линия) пешком около 6–8 минут. Выйдите из метро к 2-му Грайвороновскому проезду, двигайтесь прямо до дома 42к1.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">На автобусе:</h4>
                  <p className="text-muted-foreground">
                    Также удобно подъехать автобусами № 30, 159, 725 до остановки «2-й Грайвороновский проезд».
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
                  <h4 className="font-semibold mb-2">Адрес:</h4>
                  <p className="text-muted-foreground">
                    2-й Грайвороновский проезд, д. 42, корп. 1.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Парковка:</h4>
                  <p className="text-muted-foreground">
                    Бесплатные карманы вдоль проезда, рядом с домом.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Ориентиры:</h4>
                  <p className="text-muted-foreground">
                    Напротив бизнес-центра, недалеко от ТТК.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8">
            <Card>
              <CardContent className="p-0">
                <div className="relative overflow-hidden rounded-lg">
                  <a 
                    href="https://yandex.ru/maps/org/o_key_english/228340951550/?utm_medium=mapframe&utm_source=maps" 
                    className="absolute top-0 left-0 text-gray-200 text-xs z-10 bg-black/20 px-2 py-1 rounded-br"
                  >
                    O'key English
                  </a>
                  <a 
                    href="https://yandex.ru/maps/213/moscow/category/foreign_language_courses/184106160/?utm_medium=mapframe&utm_source=maps" 
                    className="absolute top-4 left-0 text-gray-200 text-xs z-10 bg-black/20 px-2 py-1 rounded-br"
                  >
                    Курсы иностранных языков в Москве
                  </a>
                  <a 
                    href="https://yandex.ru/maps/213/moscow/category/further_education/184106162/?utm_medium=mapframe&utm_source=maps" 
                    className="absolute top-8 left-0 text-gray-200 text-xs z-10 bg-black/20 px-2 py-1 rounded-br"
                  >
                    Дополнительное образование в Москве
                  </a>
                  <iframe 
                    src="https://yandex.ru/map-widget/v1/org/o_key_english/228340951550/?ll=37.743067%2C55.724728&z=16" 
                    width="100%" 
                    height="400" 
                    frameBorder="0" 
                    allowFullScreen
                    className="relative rounded-lg"
                    title="Карта филиала на Стахановской"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Teachers Section */}
        <TeachersSection branchName="Стахановская" />

        {/* Price Calculator Section */}
        <div className="mt-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Рассчитайте стоимость обучения</h2>
            <p className="text-lg text-muted-foreground mb-8">
              Узнайте точную стоимость с учетом всех скидок и получите 2 подарка!
            </p>
          </div>
          <PriceCalculator preSelectedBranch="stakhanovskaya" />
        </div>

        {/* Schedule Section */}
        <div className="mt-16">
          <ScheduleTable branchName="Стахановская" />
        </div>

        {/* Reviews from Yandex Maps */}
        <div className="mt-16">
          <h2 className="text-3xl font-bold text-center mb-8">Отзывы с Яндекс.Карт</h2>
          <YandexReviews 
            orgId="228340951550"
            orgUrl="https://yandex.ru/maps/org/228340951550"
            orgTitle="O'KEY ENGLISH Стахановская на Яндекс.Картах"
            height={600}
            maxWidth={800}
          />
        </div>

        {/* Unique Content for Stakhanovskaya Branch */}
        <div className="mt-16">
          <div className="container mx-auto px-4">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold mb-4 text-center">Английский язык на Стахановской - метро Некрасовская линия</h2>
                <div className="prose max-w-none text-muted-foreground">
                  <p className="mb-4">
                    Школа английского O'KEY ENGLISH на Стахановской расположена в 6–8 минутах ходьбы 
                    от метро Стахановская (розовая Некрасовская линия) по адресу 2-й Грайвороновский проезд, 42к1. 
                    Наш филиал находится в районе Метрогородок в ВАО Москвы, недалеко от ТТК, что обеспечивает 
                    отличную доступность для жителей восточных районов столицы.
                  </p>
                  <p className="mb-4">
                    Курсы английского языка на Стахановской включают программы для детей дошкольного возраста, 
                    школьников и взрослых. Мы используем проверенные Cambridge методики и коммуникативный подход, 
                    который помогает быстро преодолеть языковой барьер и начать говорить на английском с первых 
                    занятий. Бесплатная парковка вдоль проезда делает посещение уроков максимально удобным 
                    для автомобилистов.
                  </p>
                  <p className="mb-4">
                    Филиал на Стахановской оборудован современными классами в бизнес-центре напротив 
                    офисных зданий. Удобное расположение рядом с новой станцией метро Некрасовской линии 
                    делает школу доступной для жителей Балашихи, Реутова, районов Новокосино, Вешняки 
                    и Перово.
                  </p>
                  <p>
                    Опытные преподаватели с международными сертификатами TKT и CELTA создают дружелюбную 
                    атмосферу для эффективного изучения английского языка. Запишитесь на бесплатное пробное 
                    занятие и получите персональную программу обучения! Звоните +7 (499) 707-35-35 или 
                    пишите в WhatsApp.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}