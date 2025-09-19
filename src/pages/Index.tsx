import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AnimatedLanguage from "@/components/AnimatedLanguage";
import { 
  GraduationCap, 
  Users, 
  MapPin, 
  Star, 
  CheckCircle, 
  ArrowRight,
  Play,
  MessageCircle,
  TestTube,
  UserCheck,
  Award,
  BookOpen,
  Target,
  Clock,
  Phone,
  Send,
  Video,
  Heart,
  BookMarked,
  Calendar,
  Globe,
  Laptop,
  Languages
} from "lucide-react";

const branches = [
  { 
    name: "Котельники", 
    address: "2-й Покровский проезд, 14к2", 
    slug: "kotelniki",
    workingHours: "Пн-Пт: 9:00-21:00, Сб-Вс: 10:00-18:00",
    activeGroups: 12,
    nextGroup: "Завтра 18:00"
  },
  { 
    name: "Новокосино", 
    address: "Реутов, Юбилейный проспект, 60", 
    slug: "novokosino",
    workingHours: "Пн-Пт: 9:00-21:00, Сб-Вс: 10:00-18:00",
    activeGroups: 8,
    nextGroup: "Сегодня 19:30"
  },
  { 
    name: "Окская/Кузьминки/Текстильщики", 
    address: "ул. Окская, д. 3, корп. 1", 
    slug: "okskaya",
    workingHours: "Пн-Пт: 9:00-21:00, Сб-Вс: 10:00-18:00",
    activeGroups: 10,
    nextGroup: "Завтра 17:00"
  },
  { 
    name: "Стахановская", 
    address: "2-й Грайвороновский пр-д, 42к1", 
    slug: "stakhanovskaya",
    workingHours: "Пн-Пт: 9:00-21:00, Сб-Вс: 10:00-18:00",
    activeGroups: 15,
    nextGroup: "Сегодня 18:30"
  },
  { 
    name: "Солнцево", 
    address: "ул. Богданова, 6к1", 
    slug: "solntsevo",
    workingHours: "Пн-Пт: 9:00-21:00, Сб-Вс: 10:00-18:00",
    activeGroups: 9,
    nextGroup: "Завтра 16:00"
  },
  { 
    name: "Мытищи", 
    address: "ул. Борисовка, 16А", 
    slug: "mytishchi",
    workingHours: "Пн-Пт: 9:00-21:00, Сб-Вс: 10:00-18:00",
    activeGroups: 11,
    nextGroup: "Сегодня 17:30"
  },
  { 
    name: "Люберцы", 
    address: "3 Почтовое отделение, 65к1", 
    slug: "lyubertsy-1",
    workingHours: "Пн-Пт: 9:00-21:00, Сб-Вс: 10:00-18:00",
    activeGroups: 7,
    nextGroup: "Завтра 19:00"
  },
  { 
    name: "Красная Горка", 
    address: "проспект Гагарина, 3/8", 
    slug: "lyubertsy-2",
    workingHours: "Пн-Пт: 9:00-21:00, Сб-Вс: 10:00-18:00",
    activeGroups: 13,
    nextGroup: "Сегодня 20:00"
  },
  { 
    name: "Онлайн школа", 
    address: "Cambridge One платформа", 
    slug: "online",
    workingHours: "24/7 доступ к материалам",
    activeGroups: 25,
    nextGroup: "Каждый час"
  },
];

const advantages = [
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

const languages = [
  { name: "Английский", icon: "🇬🇧" },
  { name: "Французский", icon: "🇫🇷" },
  { name: "Испанский", icon: "🇪🇸" },
  { name: "Русский", icon: "🇷🇺" },
  { name: "Итальянский", icon: "🇮🇹" },
  { name: "Греческий", icon: "🇬🇷" },
  { name: "Иврит", icon: "🇮🇱" },
  { name: "10+", icon: "🌍" }
];

interface ScheduleItem {
  id: string;
  name: string;
  office_name: string;
  level: string;
  compact_days: string;
  compact_time: string;
  compact_classroom: string;
  compact_teacher: string;
  "Возраст": string;
  vacancies: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface BranchWithSchedule {
  name: string;
  address: string;
  slug: string;
  workingHours: string;
  activeGroups: number;
  nextGroup: string;
  availableSpots: number;
}

export default function Index() {
  const [quizStep] = useState(0);
  const [showQuizResult] = useState(false);
  const [branchesWithSchedule, setBranchesWithSchedule] = useState<BranchWithSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchScheduleData();
  }, []);

  const fetchScheduleData = async () => {
    try {
      // Fetch schedule data for all branches by calling the function for each branch
      const allScheduleData: ScheduleItem[] = [];
      
      for (const branch of branches) {
        try {
          const { data: branchData, error } = await supabase.rpc('get_public_schedule', {
            branch_name: branch.name
          });
          
          if (error) {
            console.error(`Error fetching schedule for ${branch.name}:`, error);
            continue;
          }
          
          if (branchData) {
            allScheduleData.push(...branchData);
          }
        } catch (branchError) {
          console.error(`Error processing ${branch.name}:`, branchError);
        }
      }

      console.log('Fetched schedule data:', allScheduleData);

      // Process schedule data and merge with branch info
      const processedBranches = branches.map(branch => {
        const branchSchedules = allScheduleData.filter((schedule: ScheduleItem) => 
          schedule.office_name === branch.name
        ) || [];

        const activeGroups = branchSchedules.length;
        const totalVacancies = branchSchedules.reduce((sum: number, schedule: ScheduleItem) => 
          sum + schedule.vacancies, 0
        );

        console.log(`Branch ${branch.name}: ${activeGroups} groups, ${totalVacancies} total vacancies`);

        // Helper function to generate fallback schedule when no data available
        const generateFallbackSchedule = (): string => {
          const now = new Date();
          const currentHour = now.getHours();
          const currentMinute = now.getMinutes();
          
          // If after 21:30, show tomorrow at 09:00
          if (currentHour > 21 || (currentHour === 21 && currentMinute >= 30)) {
            return "Завтра в 09:00";
          }
          
          // Add 30 minutes to current time
          const futureTime = new Date(now.getTime() + 30 * 60 * 1000);
          const futureHour = futureTime.getHours();
          const futureMinute = futureTime.getMinutes();
          
          // Format time as HH:MM
          const timeString = `${futureHour.toString().padStart(2, "0")}:${futureMinute.toString().padStart(2, "0")}`;
          
          return `Сегодня в ${timeString}`;
        };

        // Helper function to format schedule display
        const formatScheduleDisplay = (schedule: ScheduleItem): string => {
          const days = schedule.compact_days.toLowerCase();
          const timeStart = schedule.compact_time.split('-')[0]; // Get start time only
          
          const currentDate = new Date();
          const currentDay = currentDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
          
          // Map Russian day abbreviations to day numbers
          const dayMap: { [key: string]: number[] } = {
            'пн': [1], // Monday
            'вт': [2], // Tuesday  
            'ср': [3], // Wednesday
            'чт': [4], // Thursday
            'пт': [5], // Friday
            'сб': [6], // Saturday
            'вс': [0], // Sunday
            'пн/ср': [1, 3],
            'вт/чт': [2, 4],
            'пн/пт': [1, 5],
            'ср/пт': [3, 5],
            'сб/вс': [6, 0]
          };

          const scheduleDays = dayMap[days] || [];
          
          // Find next occurrence
          for (let i = 0; i < 7; i++) {
            const checkDay = (currentDay + i) % 7;
            if (scheduleDays.includes(checkDay)) {
              if (i === 0) return `Сегодня в ${timeStart}`;
              if (i === 1) return `Завтра в ${timeStart}`;
              
              // For other days, show day name
              const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
              return `${dayNames[checkDay]} в ${timeStart}`;
            }
          }
          
          return `${schedule.compact_days} ${timeStart}`;
        };

        // Find next available group with vacancies > 0
        const nextAvailableGroup = branchSchedules.find((schedule: ScheduleItem) => 
          schedule.vacancies > 0
        );

        // If no groups with vacancies, find any group to show schedule
        const anyGroup = branchSchedules.length > 0 ? branchSchedules[0] : null;

        const nextGroup = nextAvailableGroup 
          ? formatScheduleDisplay(nextAvailableGroup)
          : anyGroup 
            ? formatScheduleDisplay(anyGroup) 
            : generateFallbackSchedule(); // Use dynamic fallback instead of hardcoded

        // Show at least 1 spot available if there are active groups but database shows 0
        const availableSpots = totalVacancies > 0 
          ? totalVacancies 
          : activeGroups > 0 
            ? 1 // Show minimum 1 spot if groups exist but database shows 0
            : 3; // Default fallback

        return {
          ...branch,
          activeGroups: activeGroups || branch.activeGroups,
          nextGroup,
          availableSpots
        };
      });

      setBranchesWithSchedule(processedBranches);
    } catch (error) {
      console.error('Error processing schedule data:', error);
      // Fallback to original data
      setBranchesWithSchedule(branches.map(branch => ({
        ...branch,
        availableSpots: 3
      })));
    } finally {
      setIsLoading(false);
    }
  };

  const handleWhatsApp = (branch?: string) => {
    const message = branch 
      ? `Здравствуйте! Интересует обучение в филиале ${branch}.`
      : "Здравствуйте! Интересует обучение английскому языку.";
    window.open(`https://wa.me/79937073553?text=${encodeURIComponent(message)}`, "_blank");
  };

  return (
    <div className="min-h-screen">
      <section className="relative bg-gradient-subtle py-20 lg:py-32 overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
              <span className="inline-flex items-baseline justify-center gap-2">
                <AnimatedLanguage />
              </span>
              <br />
              для детей, подростков и взрослых
            </h1>
            <p className="text-xl lg:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              с <strong className="text-primary">гарантией прогресса</strong>
            </p>
            <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto">
              Подберём программу и расписание за 2 минуты. Пробный урок — бесплатно.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 px-4">
              <Link to="/test" className="w-full sm:w-auto">
                <Button variant="hero" size="lg" className="flex items-center justify-center gap-2 w-full sm:w-auto">
                  <BookOpen className="w-5 h-5" />
                  Пройти онлайн-тест уровня
                </Button>
              </Link>
              <Link to="/contacts" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="flex items-center justify-center gap-2 w-full sm:w-auto">
                  <UserCheck className="w-5 h-5" />
                  Записаться на пробный урок
                </Button>
              </Link>
            </div>

            <div className="flex flex-wrap justify-center items-center gap-6 text-center">
              <div className="flex items-center gap-3 p-4 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 hover-scale">
                <div className="w-14 h-14 bg-gradient-primary rounded-full flex items-center justify-center shadow-lg">
                  <Award className="w-7 h-7 text-white" />
                </div>
                <div>
                  <div className="text-3xl font-black text-primary drop-shadow-lg">10 лет</div>
                  <div className="text-sm text-primary/80 font-medium">на рынке</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 hover-scale">
                <div className="w-14 h-14 bg-gradient-primary rounded-full flex items-center justify-center shadow-lg">
                  <GraduationCap className="w-7 h-7 text-white" />
                </div>
                <div>
                  <div className="text-3xl font-black text-primary drop-shadow-lg">10000+</div>
                  <div className="text-sm text-primary/80 font-medium">выпускников</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 hover-scale">
                <div className="w-14 h-14 bg-gradient-primary rounded-full flex items-center justify-center shadow-lg">
                  <BookOpen className="w-7 h-7 text-white" />
                </div>
                <div>
                  <div className="text-3xl font-black text-primary drop-shadow-lg">10+</div>
                  <div className="text-sm text-primary/80 font-medium">языков преподаём</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Advantages */}
      <section className="py-20 bg-secondary/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Наши преимущества</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {advantages.map((advantage, index) => (
              <Card key={index} className={`text-center hover:shadow-lg transition-shadow ${
                advantage.isHighlighted ? 'bg-gradient-primary text-white' : ''
              }`}>
                <CardContent className="p-6">
                  <advantage.icon className={`w-12 h-12 mx-auto mb-4 ${
                    advantage.isHighlighted ? 'text-white' : 'text-primary'
                  }`} />
                  <h3 className={`text-xl font-semibold mb-3 ${
                    advantage.isHighlighted ? 'text-white' : ''
                  }`}>{advantage.title}</h3>
                  <p className={advantage.isHighlighted ? 'text-white/90' : 'text-muted-foreground'}>
                    {advantage.text}
                  </p>
                  {advantage.isHighlighted && (
                    <Link to="/contacts" className="inline-block mt-4">
                      <Button 
                        variant="secondary"
                        className="bg-white text-primary hover:bg-white/90"
                      >
                        Записаться
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Филиалы и расписание
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              8 филиалов в удобных локациях + онлайн школа. Гибкое расписание, есть группы каждый день
            </p>
            
            <div className="flex flex-wrap justify-center gap-4">
              <Badge variant="outline" className="px-4 py-2">
                <MapPin className="w-4 h-4 mr-2" />
                8 филиалов
              </Badge>
              <Badge variant="outline" className="px-4 py-2">
                <Users className="w-4 h-4 mr-2" />
                110+ активных групп
              </Badge>
              <Badge variant="outline" className="px-4 py-2">
                <Clock className="w-4 h-4 mr-2" />
                Гибкое расписание
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 8 }).map((_, index) => (
                <Card key={index} className="card-elevated overflow-hidden">
                  <div className="aspect-[16/9] bg-muted animate-pulse"></div>
                  <CardContent className="p-6 space-y-4">
                    <div className="h-6 bg-muted animate-pulse rounded"></div>
                    <div className="h-4 bg-muted animate-pulse rounded w-3/4"></div>
                    <div className="h-20 bg-muted animate-pulse rounded"></div>
                  </CardContent>
                </Card>
              ))
            ) : (
              branchesWithSchedule.map((branch) => (
                <Card key={branch.slug} className="card-elevated hover:border-primary/50 transition-all overflow-hidden">
                  <div className="aspect-[16/9] bg-gradient-subtle flex items-center justify-center">
                    <span className="text-muted-foreground">Фото филиала {branch.name}</span>
                  </div>
                  
                  <CardContent className="p-6 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-5 h-5 text-primary" />
                          <h3 className="font-semibold text-xl">{branch.name}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">{branch.address}</p>
                      </div>
                      <Badge className="bg-gradient-primary text-white">
                        {branch.activeGroups} групп
                      </Badge>
                    </div>

                    {/* Working Hours */}
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-primary" />
                      <span>{branch.workingHours}</span>
                    </div>

                    {/* Available Languages */}
                    <div>
                      <h4 className="font-semibold mb-3">Доступные языки:</h4>
                      <div className="flex flex-wrap gap-2">
                        {languages.map((language, index) => (
                          <div key={index} className="flex items-center gap-1 bg-muted px-2 py-1 rounded-full text-xs">
                            <span className="text-sm">{language.icon}</span>
                            <span>{language.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Next Group */}
                    <div className="bg-gradient-subtle p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-sm text-muted-foreground">Ближайшая группа:</div>
                          <div className="font-medium">{branch.nextGroup}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">Свободно:</div>
                          <div className="text-primary font-semibold">
                            {branch.availableSpots} {branch.availableSpots === 1 ? 'место' : branch.availableSpots < 5 ? 'места' : 'мест'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-3">
                      <Link to={`/branches/${branch.slug}`}>
                        <Button variant="hero" className="w-full">
                          <ArrowRight className="w-4 h-4 mr-2" />
                          Подробнее о филиале
                        </Button>
                      </Link>
                      
                      <div className="flex justify-center gap-3">
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => window.open("tel:+74997073535", "_blank")}
                          className="rounded-full"
                        >
                          <Phone className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => handleWhatsApp(branch.name)}
                          className="rounded-full"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => {
                            const message = `Здравствуйте! Интересует обучение в филиале ${branch.name}.`;
                            window.open(`https://t.me/okeyenglish_bot?start=${encodeURIComponent(message)}`, "_blank");
                          }}
                          className="rounded-full"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="py-20 bg-primary">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
            Готовы начать изучение английского?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Пройдите бесплатный тест уровня или запишитесь на пробный урок уже сегодня
          </p>
        </div>
      </section>
    </div>
  );
}