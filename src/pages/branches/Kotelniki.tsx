import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Phone, MessageCircle, Send, Clock, Star } from "lucide-react";
import ScheduleTable from "@/components/ScheduleTable";
import PriceCalculator from "@/components/PriceCalculator";
import classroomImage from "@/assets/kotelniki-classroom.png";
import teacherMale1 from "@/assets/teacher-male-1.png";
import teacherMale2 from "@/assets/teacher-male-2.png";
import teacherFemale1 from "@/assets/teacher-female-1.png";

export default function LocationKotelniki() {

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
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl lg:text-5xl font-bold mb-4">
            Филиал <span className="text-gradient">Котельники</span>
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
          <div className="grid md:grid-cols-1 gap-6">
            <Card>
              <CardContent className="p-0">
                <img 
                  src={classroomImage} 
                  alt="Учебный класс в филиале Котельники" 
                  className="w-full h-96 object-cover rounded-lg"
                />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Teachers */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">Наши преподаватели</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6 text-center">
                <img 
                  src={teacherMale1} 
                  alt="Преподаватель английского языка" 
                  className="w-32 h-32 rounded-full mx-auto mb-4 object-cover"
                />
                <h3 className="text-xl font-semibold mb-2">Дмитрий</h3>
                <p className="text-muted-foreground">Опытный преподаватель с международными сертификатами</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <img 
                  src={teacherMale2} 
                  alt="Преподаватель английского языка" 
                  className="w-32 h-32 rounded-full mx-auto mb-4 object-cover"
                />
                <h3 className="text-xl font-semibold mb-2">Александр</h3>
                <p className="text-muted-foreground">Специалист по подготовке к международным экзаменам</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <img 
                  src={teacherFemale1} 
                  alt="Преподаватель английского языка" 
                  className="w-32 h-32 rounded-full mx-auto mb-4 object-cover"
                />
                <h3 className="text-xl font-semibold mb-2">Анна</h3>
                <p className="text-muted-foreground">Методист с опытом работы с детьми и взрослыми</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Reviews */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">Отзывы родителей</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-current" />
                    ))}
                  </div>
                </div>
                <p className="text-muted-foreground mb-4">
                  "Отличная школа! Мой сын с удовольствием ходит на занятия. Преподаватели очень внимательные, 
                  всегда готовы помочь. За полгода обучения заметен значительный прогресс."
                </p>
                <p className="font-semibold">Мария, мама ученика 8 лет</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-current" />
                    ))}
                  </div>
                </div>
                <p className="text-muted-foreground mb-4">
                  "Дочка начала говорить на английском уже через несколько месяцев. Очень довольны подходом 
                  к обучению и атмосферой в школе. Рекомендуем всем!"
                </p>
                <p className="font-semibold">Алексей, папа ученицы 10 лет</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-current" />
                    ))}
                  </div>
                </div>
                <p className="text-muted-foreground mb-4">
                  "Современные методики, интерактивные занятия, индивидуальный подход к каждому ребенку. 
                  Сын с нетерпением ждет каждого урока!"
                </p>
                <p className="font-semibold">Ольга, мама ученика 7 лет</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-current" />
                    ))}
                  </div>
                </div>
                <p className="text-muted-foreground mb-4">
                  "Прекрасное расположение, удобно добираться. Качество обучения на высоте, 
                  дочка уже участвует в олимпиадах по английскому языку."
                </p>
                <p className="font-semibold">Игорь, папа ученицы 12 лет</p>
              </CardContent>
            </Card>
          </div>
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
                  <h4 className="font-semibold mb-2">От метро Котельники:</h4>
                  <p className="text-muted-foreground">
                    Пешком 5 минут. Выйти из метро в сторону ул. Кузьминская, 
                    повернуть направо на 2-й Покровский проезд.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">На автобусе:</h4>
                  <p className="text-muted-foreground">
                    Автобусы №347, №348 до остановки "2-й Покровский проезд"
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
                    Рядом с торговым центром "Остров Мечты", 
                    недалеко от станции метро Котельники
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
                  title="Карта филиала в Котельниках"
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
          <PriceCalculator preSelectedBranch="kotelniki" />
        </div>

        {/* Schedule Section */}
        <div className="mt-16">
          <ScheduleTable branchName="Котельники" />
        </div>
      </div>
    </div>
  );
}