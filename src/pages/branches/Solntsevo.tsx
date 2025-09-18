import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Phone, MessageCircle, Clock, Users, CheckCircle } from "lucide-react";

export default function LocationSolntsevo() {
  const [scheduleData, setScheduleData] = useState([]);
  const [filteredSchedule, setFilteredSchedule] = useState([]);
  const [searchLevel, setSearchLevel] = useState("all");
  const [searchDays, setSearchDays] = useState("all");

  const handleWhatsApp = () => {
    const message = "Здравствуйте! Интересует обучение в филиале Солнцево.";
    window.open(`https://wa.me/74997073535?text=${encodeURIComponent(message)}`, "_blank");
  };

  const handleBooking = (course: string, time: string) => {
    const message = `Здравствуйте! Хочу записаться на курс "${course}" в ${time} в филиале Солнцево.`;
    window.open(`https://wa.me/74997073535?text=${encodeURIComponent(message)}`, "_blank");
  };

  useEffect(() => {
    // Demo schedule data - replace with real API call
    const demoData = [
      {"branch":"Солнцево","course":"Kids 4-6","level":"Beginner","days_mask":"Пн/Ср","time":"16:00–17:00","is_online":false,"vacancies":8},
      {"branch":"Солнцево","course":"Kids 7-9","level":"A1","days_mask":"Вт/Чт","time":"17:00–18:20","is_online":false,"vacancies":5},
      {"branch":"Солнцево","course":"Teens","level":"A2","days_mask":"Пн/Ср","time":"18:30–19:50","is_online":false,"vacancies":3},
      {"branch":"Солнцево","course":"Adults General","level":"B1","days_mask":"Вт/Чт","time":"19:00–20:20","is_online":false,"vacancies":7},
      {"branch":"Солнцево","course":"Adults General","level":"B2","days_mask":"Сб","time":"10:00–12:30","is_online":false,"vacancies":4},
    ];
    
    setScheduleData(demoData);
    setFilteredSchedule(demoData);
  }, []);

  useEffect(() => {
    let filtered = scheduleData.filter(item => item.branch === "Солнцево");
    
    if (searchLevel !== "all") {
      filtered = filtered.filter(item => item.level === searchLevel);
    }
    
    if (searchDays !== "all") {
      if (searchDays === "weekdays") {
        filtered = filtered.filter(item => !item.days_mask.includes("Сб") && !item.days_mask.includes("Вс"));
      } else if (searchDays === "weekends") {
        filtered = filtered.filter(item => item.days_mask.includes("Сб") || item.days_mask.includes("Вс"));
      }
    }
    
    setFilteredSchedule(filtered);
  }, [scheduleData, searchLevel, searchDays]);

  const getVacancyText = (vacancies: number) => {
    if (vacancies === 10) return "Формируется";
    if (vacancies === 0) return "Нет мест";
    return `Свободно ${vacancies} мест`;
  };

  const getVacancyColor = (vacancies: number) => {
    if (vacancies === 10) return "secondary";
    if (vacancies === 0) return "destructive";
    return vacancies <= 3 ? "orange" : "green";
  };

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Филиал Солнцево</h1>
          <p className="text-xl text-muted-foreground mb-2">ул. Богданова, 6к1</p>
          <p className="text-lg text-muted-foreground mb-6">Ежедневно с 9:00 до 21:00</p>
          
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <Button onClick={() => window.open("tel:+74997073535")} className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              +7 (499) 707-35-35
            </Button>
            <Button variant="outline" onClick={handleWhatsApp} className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </Button>
          </div>
        </div>

        {/* Schedule Section */}
        <div className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4">Расписание групп</h2>
            <p className="text-lg text-muted-foreground">
              Актуальное расписание занятий в филиале Солнцево
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6 justify-center">
            <Select value={searchLevel} onValueChange={setSearchLevel}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Выберите уровень" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все уровни</SelectItem>
                <SelectItem value="Beginner">Beginner</SelectItem>
                <SelectItem value="A1">A1</SelectItem>
                <SelectItem value="A2">A2</SelectItem>
                <SelectItem value="B1">B1</SelectItem>
                <SelectItem value="B2">B2</SelectItem>
                <SelectItem value="C1">C1</SelectItem>
              </SelectContent>
            </Select>

            <Select value={searchDays} onValueChange={setSearchDays}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Выберите дни" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все дни</SelectItem>
                <SelectItem value="weekdays">Будни</SelectItem>
                <SelectItem value="weekends">Выходные</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Schedule Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredSchedule.map((item, index) => (
              <Card key={index} className="card-elevated">
                <CardHeader>
                  <CardTitle className="text-lg">{item.course}</CardTitle>
                  <Badge variant="outline" className="w-fit">
                    Уровень: {item.level}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>{item.days_mask} • {item.time}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <Badge variant={getVacancyColor(item.vacancies) as any}>
                      {getVacancyText(item.vacancies)}
                    </Badge>
                  </div>
                  {item.is_online && (
                    <Badge variant="secondary" className="w-fit">
                      Онлайн формат
                    </Badge>
                  )}
                  <Button 
                    className="w-full"
                    onClick={() => handleBooking(item.course, item.time)}
                    disabled={item.vacancies === 0}
                  >
                    {item.vacancies === 0 ? "Нет мест" : "Записаться"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Contact and Map Section */}
        <div className="grid md:grid-cols-2 gap-8">
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Контакты и адрес
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Адрес:</h4>
                <p className="text-muted-foreground">ул. Богданова, 6к1, Солнцево</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Телефон:</h4>
                <p className="text-muted-foreground">+7 (499) 707-35-35</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Режим работы:</h4>
                <p className="text-muted-foreground">Ежедневно с 9:00 до 21:00</p>
              </div>
              <div className="space-y-2">
                <Button className="w-full" onClick={handleWhatsApp}>
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Написать в WhatsApp
                </Button>
                <Button variant="outline" className="w-full" onClick={() => window.open("tel:+74997073535")}>
                  <Phone className="w-4 h-4 mr-2" />
                  Позвонить
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardHeader>
              <CardTitle>Как добраться</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted rounded-lg h-64 flex items-center justify-center">
                <p className="text-muted-foreground">Карта будет загружена</p>
              </div>
              <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                <p>🚇 Ближайшие станции метро:</p>
                <p>• Солнцево (5 мин пешком)</p>
                <p>• Боровское шоссе (10 мин пешком)</p>
                <p>🚌 Остановка "Богданова" (автобусы 611, 611к, т11)</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}