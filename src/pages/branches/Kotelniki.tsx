import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Phone, MessageCircle, Send, Clock } from "lucide-react";
import ScheduleTable from "@/components/ScheduleTable";
import PriceCalculator from "@/components/PriceCalculator";
import YandexReviews from "@/components/YandexReviews";
import SEOHead from "@/components/SEOHead";
import { branchSEOData, generateBranchJsonLd } from "@/data/seoData";
import OptimizedImage from "@/components/OptimizedImage";
import { TeachersSection } from "@/components/TeachersSection";
import classroomImage from "@/assets/kotelniki-classroom.png";
import kotelnikiImage from "@/assets/kotelniki-branch.jpg";

export default function LocationKotelniki() {
  const seoData = branchSEOData.kotelniki;
  const jsonLd = generateBranchJsonLd('kotelniki');

  const handleWhatsApp = () => {
    const message = encodeURIComponent("Здравствуйте! Хочу узнать подробнее об обучении в филиале Котельники");
    window.open(`https://wa.me/79937073553?text=${message}`, '_blank');
  };

  const handlePhone = () => {
    window.open('tel:+74997073535', '_self');
  };

  const handleTelegram = () => {
    const message = encodeURIComponent("Здравствуйте! Хочу узнать подробнее об обучении в филиале Котельники");
    window.open(`https://t.me/79937073553?text=${message}`, '_blank');
  };

  return (
    <div className="min-h-screen py-20">
      <SEOHead 
        title={seoData.title}
        description={seoData.description}
        keywords={seoData.keywords}
        canonicalUrl="https://okeyenglish.ru/branches/kotelniki"
        jsonLd={jsonLd}
      />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl lg:text-5xl font-bold mb-4">
            Английский язык в <span className="text-gradient">Котельниках</span> - O'KEY ENGLISH
          </h1>
          <div className="flex items-center justify-center gap-2 text-lg text-muted-foreground mb-6">
            <MapPin className="w-5 h-5 text-primary" />
            <span>2-й Покровский проезд, 14к2</span>
          </div>
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
                <p className="text-lg font-medium">2-й Покровский проезд, 14к2</p>
                <p className="text-muted-foreground">г. Котельники, Московская область</p>
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

        {/* Photo Gallery */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">Наш филиал</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-0">
                <OptimizedImage
                  src={kotelnikiImage} 
                  alt="Интерьер филиала O'KEY English в Котельниках - зона ресепшн с брендингом" 
                  width={400}
                  height={384}
                  className="w-full h-96 object-cover rounded-lg"
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-0">
                <OptimizedImage
                  src={classroomImage} 
                  alt="Учебный класс в филиале Котельники" 
                  width={400}
                  height={384}
                  className="w-full h-96 object-cover rounded-lg"
                />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Teachers Section */}
        <TeachersSection branchName="Котельники" />

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
                  <h4 className="font-semibold mb-2">От метро Котельники:</h4>
                  <p className="text-muted-foreground">
                    (фиолетовая линия) пешком около 7–10 минут. Выйдите из последнего вагона из центра, двигайтесь к 2-му Покровскому проезду.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">На автобусе:</h4>
                  <p className="text-muted-foreground">
                    Также можно доехать на автобусах № 347, 169, 120, 471 и выйти на остановке «2-й Покровский проезд», далее пройти несколько минут пешком.
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
                    2-й Покровский проезд, д. 14, корп. 2.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Парковка:</h4>
                  <p className="text-muted-foreground">
                    Придомовая, есть свободные места возле здания.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Ориентиры:</h4>
                  <p className="text-muted-foreground">
                    Рядом ТЦ «Outlet Village Белая Дача» и Мега, удобный съезд с Новорязанского шоссе.
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
                    href="https://yandex.ru/maps/org/o_key_english/1599363543/?utm_medium=mapframe&utm_source=maps" 
                    className="absolute top-0 left-0 text-gray-200 text-xs z-10 bg-black/20 px-2 py-1 rounded-br"
                  >
                    O'key English
                  </a>
                  <a 
                    href="https://yandex.ru/maps/21651/kotelniki/category/foreign_language_courses/184106160/?utm_medium=mapframe&utm_source=maps" 
                    className="absolute top-4 left-0 text-gray-200 text-xs z-10 bg-black/20 px-2 py-1 rounded-br"
                  >
                    Курсы иностранных языков в Котельниках
                  </a>
                  <a 
                    href="https://yandex.ru/maps/21651/kotelniki/category/further_education/184106162/?utm_medium=mapframe&utm_source=maps" 
                    className="absolute top-8 left-0 text-gray-200 text-xs z-10 bg-black/20 px-2 py-1 rounded-br"
                  >
                    Дополнительное образование в Котельниках
                  </a>
                  <iframe 
                    src="https://yandex.ru/map-widget/v1/org/o_key_english/1599363543/?ll=37.856811%2C55.663538&z=16" 
                    width="100%" 
                    height="400" 
                    frameBorder="0" 
                    allowFullScreen
                    className="relative rounded-lg"
                    title="Карта филиала в Котельниках"
                  />
                </div>
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
          <PriceCalculator preSelectedBranch="kotelniki" />
        </div>

        {/* Schedule Section */}
        <div className="mt-16">
          <ScheduleTable branchName="Котельники" />
        </div>

        {/* Reviews from Yandex Maps */}
        <div className="mt-16">
          <h2 className="text-3xl font-bold text-center mb-8">Отзывы с Яндекс.Карт</h2>
          <YandexReviews 
            orgId="1599363543"
            orgUrl="https://yandex.ru/maps/org/1599363543"
            orgTitle="O'KEY ENGLISH Котельники на Яндекс.Картах"
            height={600}
            maxWidth={800}
          />
        </div>
      </div>
    </div>
  );
}