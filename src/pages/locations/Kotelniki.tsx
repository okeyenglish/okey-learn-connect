import { useState, useEffect } from "react";
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
  Calendar,
  Star,
  UserCheck,
  Filter
} from "lucide-react";

interface ScheduleItem {
  branch: string;
  course: string;
  level: string;
  days_mask: string;
  time: string;
  is_online: boolean;
  vacancies: number;
}

export default function LocationKotelniki() {
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    online: false,
    level: "",
    course: ""
  });

  useEffect(() => {
    // Fetch schedule data
    const fetchSchedule = async () => {
      try {
        // Replace with actual URL when available
        // const response = await fetch('{{SCHEDULE_JSON_URL}}');
        // const data = await response.json();
        
        // Demo data for now
        const demoData: ScheduleItem[] = [
          {
            branch: "Котельники",
            course: "Kids 7–9",
            level: "A1",
            days_mask: "Пн/Ср",
            time: "17:00–18:00",
            is_online: false,
            vacancies: 3
          },
          {
            branch: "Котельники", 
            course: "Teens",
            level: "B1",
            days_mask: "Вт/Чт",
            time: "18:30–20:10",
            is_online: false,
            vacancies: 5
          },
          {
            branch: "Котельники",
            course: "Adults General",
            level: "A2",
            days_mask: "Пн/Ср/Пт",
            time: "19:00–20:20",
            is_online: true,
            vacancies: 2
          },
          {
            branch: "Котельники",
            course: "IELTS Prep",
            level: "B2",
            days_mask: "Сб",
            time: "10:00–12:30",
            is_online: false,
            vacancies: 10
          }
        ];
        
        setSchedule(demoData);
      } catch (error) {
        console.error('Error fetching schedule:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, []);

  const filteredSchedule = schedule.filter(item => {
    if (filters.online && !item.is_online) return false;
    if (filters.level && item.level !== filters.level) return false;
    if (filters.course && item.course !== filters.course) return false;
    return true;
  });

  const getVacancyText = (vacancies: number) => {
    if (vacancies === 10) return "Формируется";
    if (vacancies === 0) return "Нет мест";
    return `Свободно ${vacancies} мест`;
  };

  const getVacancyColor = (vacancies: number) => {
    if (vacancies === 10) return "bg-accent";
    if (vacancies === 0) return "bg-destructive";
    if (vacancies <= 2) return "bg-orange-500";
    return "bg-green-500";
  };

  const handleWhatsApp = () => {
    const message = "Здравствуйте! Интересует обучение в филиале Котельники.";
    window.open(`https://wa.me/74997073535?text=${encodeURIComponent(message)}`, "_blank");
  };

  const handleEnroll = (course: string, time: string) => {
    const message = `Здравствуйте! Хочу записаться на курс "${course}" в ${time} в филиале Котельники.`;
    window.open(`https://wa.me/74997073535?text=${encodeURIComponent(message)}`, "_blank");
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
          
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-primary" />
              <span>Пн-Пт: 9:00-21:00, Сб-Вс: 10:00-18:00</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={() => window.open("tel:+74997073535")} className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Позвонить
            </Button>
            <Button variant="outline" onClick={handleWhatsApp} className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </Button>
            <Link to="/contacts">
              <Button variant="hero" className="flex items-center gap-2">
                <UserCheck className="w-4 h-4" />
                Пробный урок
              </Button>
            </Link>
          </div>
        </div>

        {/* Gallery - placeholder */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6">Наши классы</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="aspect-[4/3] bg-gradient-subtle rounded-lg flex items-center justify-center">
                <span className="text-muted-foreground">Фото класса {i}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Map */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6">Как добраться</h2>
          <Card className="card-elevated">
            <CardContent className="p-0">
              <div className="aspect-[16/9] bg-gradient-subtle rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="w-12 h-12 text-primary mx-auto mb-4" />
                  <p className="text-lg font-semibold">Интерактивная карта</p>
                  <p className="text-sm text-muted-foreground">2-й Покровский проезд, 14к2</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Schedule */}
        <section className="mb-16">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Расписание занятий</h2>
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Фильтры
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p>Загружаем расписание...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredSchedule.map((item, index) => (
                <Card key={index} className="card-elevated">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{item.course}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">{item.level}</Badge>
                          {item.is_online && <Badge className="bg-blue-500">Онлайн</Badge>}
                        </CardDescription>
                      </div>
                      <Badge 
                        className={`${getVacancyColor(item.vacancies)} text-white`}
                      >
                        {getVacancyText(item.vacancies)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-primary" />
                          <span>{item.days_mask}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-primary" />
                          <span className="font-medium">{item.time}</span>
                        </div>
                      </div>

                      <Button 
                        className="w-full"
                        variant={item.vacancies === 0 ? "outline" : "hero"}
                        disabled={item.vacancies === 0}
                        onClick={() => handleEnroll(item.course, item.time)}
                      >
                        {item.vacancies === 0 ? "Лист ожидания" : "Записаться"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Reviews */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6">Отзывы учеников филиала</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <Card key={i} className="card-elevated">
                <CardContent className="p-6">
                  <div className="flex items-center gap-1 mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="w-4 h-4 fill-accent text-accent" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-4">
                    "Отличный филиал! Удобное расположение, современные классы и отличные преподаватели. Мой ребенок с удовольствием ходит на занятия."
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">М</span>
                    </div>
                    <div>
                      <div className="font-medium">Мария Иванова</div>
                      <div className="text-sm text-muted-foreground">Мама ученика</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Quick Enrollment */}
        <section className="bg-gradient-primary rounded-2xl p-8 text-center text-white">
          <h2 className="text-2xl font-bold mb-4">Записаться в филиал Котельники</h2>
          <p className="text-white/90 mb-6 max-w-2xl mx-auto">
            Оставьте заявку, и мы подберем подходящую группу и расписание специально для вас
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/contacts">
              <Button variant="secondary" size="lg">
                Оставить заявку
              </Button>
            </Link>
            <Button 
              variant="outline" 
              size="lg"
              className="border-white text-white hover:bg-white hover:text-primary"
              onClick={handleWhatsApp}
            >
              Написать в WhatsApp
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}