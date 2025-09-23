import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Star, Users, Award, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import YandexReviews from "@/components/YandexReviews";
import SEOHead from "@/components/SEOHead";
import { useState } from "react";
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem, 
  CarouselPrevious, 
  CarouselNext 
} from "@/components/ui/carousel";

// Данные для виджетов Яндекса по филиалам (в указанном порядке)
const yandexBranches = [
  {
    name: "Окская",
    orgId: "1276487501",
    orgUrl: "https://yandex.ru/maps/org/1276487501"
  },
  {
    name: "Котельники",
    orgId: "1599363543",
    orgUrl: "https://yandex.ru/maps/org/1599363543"
  },
  {
    name: "Стахановская",
    orgId: "228340951550",
    orgUrl: "https://yandex.ru/maps/org/228340951550"
  },
  {
    name: "Новокосино",
    orgId: "92516357375",
    orgUrl: "https://yandex.ru/sprav/92516357375/p/edit/main"
  },
  {
    name: "Мытищи", 
    orgId: "45748069943",
    orgUrl: "https://yandex.ru/sprav/45748069943/p/edit/main"
  },
  {
    name: "Солнцево",
    orgId: "178121909150", 
    orgUrl: "https://yandex.ru/maps/org/178121909150"
  }
];

// Отзывы студентов
const studentReviews = [
  {
    name: "Елена Петрова",
    course: "Prepare (A2-B1)",
    rating: 5,
    text: "Отличная школа! За 8 месяцев обучения значительно улучшила свой английский. Преподаватели очень внимательные и профессиональные. Особенно нравится интерактивная методика Cambridge.",
    branch: "Котельники",
    date: "Март 2024"
  },
  {
    name: "Дмитрий Соколов", 
    course: "Empower (B1-B2)",
    rating: 5,
    text: "Сын занимается уже год в группе Kids Box. Результат превзошел все ожидания! Ребенок с удовольствием ходит на занятия, дома постоянно практикует английский. Спасибо педагогам!",
    branch: "Мытищи",
    date: "Февраль 2024"
  },
  {
    name: "Анна Михайлова",
    course: "Speaking Club",
    rating: 5, 
    text: "Speaking Club - это именно то, что нужно для преодоления языкового барьера! Атмосфера очень дружелюбная, темы интересные. За полгода стала намного свободнее говорить по-английски.",
    branch: "Солнцево",
    date: "Январь 2024"
  },
  {
    name: "Игорь Васильев",
    course: "Онлайн курсы",
    rating: 5,
    text: "Занимаюсь онлайн уже 4 месяца. Очень удобно совмещать с работой. Платформа Cambridge One отличная, много интерактивных заданий. Преподаватель всегда на связи и готов помочь.",
    branch: "Онлайн",
    date: "Декабрь 2023"
  },
  {
    name: "Мария Кузнецова",
    course: "Super Safari (3-5 лет)", 
    rating: 5,
    text: "Дочка в восторге от занятий! Преподаватели умеют найти подход к малышам. Занятия проходят в игровой форме, но при этом ребенок действительно изучает язык. Очень рекомендую!",
    branch: "Новокосино",
    date: "Ноябрь 2023"
  },
  {
    name: "Александр Попов",
    course: "Workshop (Подготовка к ЕГЭ)",
    rating: 5,
    text: "Готовился к ЕГЭ по английскому в Workshop. Результат - 92 балла! Методика подготовки очень эффективная, разбирали все типы заданий, много практики. Поступил в МГУ!",
    branch: "Стахановская", 
    date: "Июнь 2023"
  }
];

// Carousel component for Yandex Reviews
function YandexReviewsCarousel() {
  return (
    <div className="max-w-7xl mx-auto px-4">
      <Carousel
        opts={{
          align: "start",
          slidesToScroll: 1,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-2 md:-ml-4">
          {yandexBranches.map((branch) => (
            <CarouselItem key={branch.name} className="pl-2 md:pl-4 md:basis-1/3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-center text-xl">{branch.name}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <YandexReviews 
                    orgId={branch.orgId}
                    orgUrl={branch.orgUrl}
                    orgTitle={`Отзывы о филиале ${branch.name}`}
                    height={400}
                    maxWidth={400}
                  />
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-2" />
        <CarouselNext className="right-2" />
      </Carousel>
      
      <div className="text-center mt-6">
        <p className="text-sm text-muted-foreground">
          Виджеты отзывов загружаются с Яндекс.Карт для обеспечения максимальной достоверности
        </p>
      </div>
    </div>
  );
}

const renderStars = (rating: number) => {
  return Array.from({ length: 5 }, (_, i) => (
    <Star 
      key={i} 
      className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-muted-foreground'}`} 
    />
  ));
};

export default function Reviews() {
  return (
    <>
      <SEOHead 
        title="Отзывы студентов O'KEY ENGLISH - Реальные отзывы о курсах английского языка"
        description="Читайте реальные отзывы студентов O'KEY ENGLISH. 10000+ довольных выпускников, высокие оценки качества обучения. Отзывы о курсах английского для детей и взрослых."
        keywords="отзывы, O'KEY ENGLISH, английский язык, курсы английского, отзывы студентов, школа английского языка"
      />
      
      <div className="min-h-screen py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-primary bg-clip-text text-transparent">
              Отзывы наших студентов
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              10000+ довольных выпускников со всего мира
            </p>
            
            {/* Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto mb-12">
              <div className="text-center">
                <div className="flex items-center justify-center w-16 h-16 mx-auto mb-3 rounded-full bg-primary/10">
                  <Users className="w-8 h-8 text-primary" />
                </div>
                <div className="text-2xl font-bold text-foreground">10000+</div>
                <div className="text-sm text-muted-foreground">Выпускников</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center w-16 h-16 mx-auto mb-3 rounded-full bg-primary/10">
                  <Star className="w-8 h-8 text-primary fill-current" />
                </div>
                <div className="text-2xl font-bold text-foreground">4.9</div>
                <div className="text-sm text-muted-foreground">Средняя оценка</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center w-16 h-16 mx-auto mb-3 rounded-full bg-primary/10">
                  <Award className="w-8 h-8 text-primary" />
                </div>
                <div className="text-2xl font-bold text-foreground">15</div>
                <div className="text-sm text-muted-foreground">Лет опыта</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center w-16 h-16 mx-auto mb-3 rounded-full bg-primary/10">
                  <TrendingUp className="w-8 h-8 text-primary" />
                </div>
                <div className="text-2xl font-bold text-foreground">95%</div>
                <div className="text-sm text-muted-foreground">Успешности</div>
              </div>
            </div>
          </div>

          {/* Yandex Reviews Widgets Carousel */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-center mb-12">
              Отзывы на Яндекс.Картах
            </h2>
            <YandexReviewsCarousel />
          </section>

          <Separator className="my-16" />

          {/* Student Reviews */}
          <section>
            <h2 className="text-3xl font-bold text-center mb-12">
              Отзывы наших студентов
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {studentReviews.map((review, index) => (
                <Card key={index} className="h-full hover:shadow-lg transition-shadow duration-300">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{review.name}</CardTitle>
                        <Badge variant="secondary" className="mt-2">
                          {review.course}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        {renderStars(review.rating)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4 line-clamp-4">
                      "{review.text}"
                    </p>
                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                      <span>{review.branch}</span>
                      <span>{review.date}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Call to Action */}
          <section className="text-center mt-16">
            <Card className="max-w-2xl mx-auto bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold mb-4">
                  Присоединяйтесь к нашим довольным студентам!
                </h3>
                <p className="text-muted-foreground mb-6">
                  Запишитесь на бесплатный пробный урок и убедитесь в качестве нашего обучения
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <a 
                    href="/test"
                    className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold"
                  >
                    Пройти тестирование
                  </a>
                  <a 
                    href="https://wa.me/79937073553?text=Здравствуйте!%20Хочу%20записаться%20на%20пробный%20урок"
                    className="inline-flex items-center justify-center px-6 py-3 border border-primary text-primary rounded-lg hover:bg-primary/10 transition-colors font-semibold"
                  >
                    Записаться на урок
                  </a>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </>
  );
}