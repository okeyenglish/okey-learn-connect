import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/typedClient";
import { branches, BranchWithSchedule } from "@/lib/branches";
import { BranchPhotoGallery } from "@/components/branches/BranchPhotoGallery";
import { usePublicBranches } from "@/hooks/usePublicBranches";
import { BranchesMap } from "@/components/branches/BranchesMap";
import { 
  MapPin, 
  Clock, 
  Phone, 
  MessageCircle,
  Users,
  Star,
  UserCheck,
  ArrowRight,
  Send
} from "lucide-react";

interface ScheduleItem {
  id: string;
  name: string;
  office_name: string;
  level: string;
  compact_days: string;
  compact_time: string;
  compact_classroom: string;
  compact_teacher: string;
  group_URL?: string | null;
  "Возраст": string;
  vacancies: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}


const languages = [
  { name: "Английский", icon: "🇬🇧" },
  { name: "Немецкий", icon: "🇩🇪" },
  { name: "Французский", icon: "🇫🇷" },
  { name: "Испанский", icon: "🇪🇸" },
  { name: "Русский", icon: "🇷🇺" },
  { name: "Итальянский", icon: "🇮🇹" },
  { name: "Греческий", icon: "🇬🇷" },
  { name: "Иврит", icon: "🇮🇱" },
  { name: "10+", icon: "🌍" }
];


export default function Locations() {
  const [branchesWithSchedule, setBranchesWithSchedule] = useState<BranchWithSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { data: publicBranches } = usePublicBranches();

  // Создаём карту рабочих часов из БД
  const workingHoursMap = useMemo(() => {
    const map = new Map<string, string>();
    publicBranches?.forEach((pb) => {
      map.set(pb.name, pb.working_hours_formatted);
    });
    return map;
  }, [publicBranches]);

  useEffect(() => {
    fetchScheduleData();
  }, []);

  const fetchScheduleData = async () => {
    try {
      const { data: allScheduleData, error: scheduleError } = await supabase.rpc(
        'get_public_schedule', { branch_name: null }
      );

      if (scheduleError) {
        console.error('Error fetching schedule:', scheduleError);
        setBranchesWithSchedule(branches.map(branch => ({
          ...branch,
          activeGroups: 30,
          nextGroup: "Завтра в 10:00",
          availableSpots: 3
        })));
        setIsLoading(false);
        return;
      }

      const normalize = (s: string) => s?.toLowerCase().trim();
      const getMatchingNames = (displayName: string): string[] => {
        switch (displayName) {
          case 'Люберцы':
            return ['Люберцы', 'Люберцы/Жулебино'];
          case 'Красная горка':
            return ['Красная Горка', 'Красная горка', 'Красная горка/Некрасовка'];
          case 'Окская':
            return ['Окская'];
          case 'Онлайн школа':
            return ['Онлайн школа', 'Онлайн', 'Online'];
          default:
            return [displayName];
        }
      };

      const parseDays = (daysStr: string): number[] => {
        const tokens = daysStr.toLowerCase().split('/').map(d => d.trim());
        const map: Record<string, number> = { 'вс': 0, 'пн': 1, 'вт': 2, 'ср': 3, 'чт': 4, 'пт': 5, 'сб': 6 };
        const result: number[] = [];
        for (const t of tokens) {
          if (map[t] !== undefined) result.push(map[t]);
        }
        return result;
      };

      const getNextOccurrence = (schedule: ScheduleItem): { date: Date; daysDiff: number; timeStart: string } | null => {
        const timeStart = schedule.compact_time.split('-')[0];
        const [hh, mm] = timeStart.split(':').map(Number);
        const days = parseDays(schedule.compact_days);
        if (!days.length || isNaN(hh) || isNaN(mm)) return null;

        const now = new Date();
        for (let i = 0; i < 7; i++) {
          const d = new Date(now);
          d.setDate(now.getDate() + i);
          if (days.includes(d.getDay())) {
            d.setHours(hh, mm, 0, 0);
            if (i > 0 || d.getTime() > now.getTime()) {
              return { date: d, daysDiff: i, timeStart };
            }
          }
        }
        return null;
      };

      const formatFromOccurrence = (occ: { date: Date; daysDiff: number; timeStart: string } | null): string => {
        if (!occ) return "Завтра в 10:00";
        if (occ.daysDiff === 0) return `Сегодня в ${occ.timeStart}`;
        if (occ.daysDiff === 1) return `Завтра в ${occ.timeStart}`;
        
        const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
        const dayName = days[occ.date.getDay()];
        return `${dayName} в ${occ.timeStart}`;
      };

      const processedBranches = branches.map(branch => {
        const matchNames = getMatchingNames(branch.name).map(normalize);
        const branchSchedules = (allScheduleData || []).filter((schedule: ScheduleItem) => 
          matchNames.includes(normalize(schedule.office_name))
        );

        const activeGroups = branchSchedules.length;
        const totalVacancies = branchSchedules.reduce((sum: number, schedule: ScheduleItem) => 
          sum + schedule.vacancies, 0
        );

        const occurrences = (branchSchedules
          .map((s) => ({ schedule: s, occ: getNextOccurrence(s) }))
          .filter((x) => !!x.occ) as { schedule: ScheduleItem; occ: { date: Date; daysDiff: number; timeStart: string } }[])
          .sort((a, b) => a.occ.date.getTime() - b.occ.date.getTime());

        const best = occurrences[0] ?? null;
        const bestOcc = best?.occ ?? null;
        const nextGroup = formatFromOccurrence(bestOcc);
        const availableSpots = best ? (best.schedule.vacancies ?? 0) : 0;

        return {
          ...branch,
          activeGroups: Math.max(activeGroups, 30),
          nextGroup,
          availableSpots
        };
      });

      setBranchesWithSchedule(processedBranches);
    } catch (error) {
      console.error('Error processing schedule data:', error);
      setBranchesWithSchedule(branches.map(branch => ({
        ...branch,
        activeGroups: 30,
        nextGroup: "Завтра в 10:00",
        availableSpots: 3
      })));
    } finally {
      setIsLoading(false);
    }
  };
  const handleWhatsApp = (branchName: string) => {
    const message = `Здравствуйте! Интересует обучение в филиале ${branchName}.`;
    window.open(`https://wa.me/79937073553?text=${encodeURIComponent(message)}`, "_blank");
  };

  const handleTelegram = (branchName: string) => {
    const message = `Здравствуйте! Интересует обучение в филиале ${branchName}.`;
    window.open(`https://t.me/englishmanager?start=${encodeURIComponent(message)}`, "_blank");
  };

  const handleCall = () => {
    window.open("tel:+74997073535", "_blank");
  };

  return (
    <div className="min-h-screen py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl lg:text-5xl font-bold mb-6">
            Наши <span className="text-gradient">филиалы</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            8 удобных локаций в Москве и Подмосковье + онлайн школа с современными классами и опытными преподавателями
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

        {/* Quick Navigation */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-9 gap-4 mb-16">
          {branches.map((branch) => (
            <Link 
              key={branch.id}
              to={`/branches/${branch.id}`}
              className="text-center p-4 rounded-lg border hover:border-primary/50 hover:bg-muted/50 transition-all"
            >
              <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-3">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <div className="font-semibold">{branch.name}</div>
              <div className="text-sm text-muted-foreground">{branch.metro}</div>
            </Link>
          ))}
        </div>

        {/* Branches Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          {isLoading ? (
            // Loading skeleton
            Array.from({ length: 9 }).map((_, index) => (
              <Card key={index} className="card-elevated overflow-hidden">
                <div className="aspect-[16/9] bg-muted animate-pulse"></div>
                <CardHeader>
                  <div className="h-6 bg-muted animate-pulse rounded"></div>
                  <div className="h-4 bg-muted animate-pulse rounded w-3/4"></div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="h-4 bg-muted animate-pulse rounded"></div>
                  <div className="h-20 bg-muted animate-pulse rounded"></div>
                </CardContent>
              </Card>
            ))
          ) : (
            branchesWithSchedule.map((branch) => (
            <Card key={branch.id} className="card-elevated hover:border-primary/50 transition-all overflow-hidden">
              <Link to={`/branches/${branch.id}`} className="block">
                <div className="rounded-xl overflow-hidden bg-gradient-subtle">
                  <BranchPhotoGallery branchId={branch.name} showMainOnly fallbackImage={branch.image} />
                </div>
              </Link>
              
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-primary" />
                      <Link to={`/branches/${branch.id}`} className="hover:text-primary transition-colors cursor-pointer">
                        {branch.name}
                      </Link>
                    </CardTitle>
                    <CardDescription className="mt-2">
                      {branch.address}
                    </CardDescription>
                  </div>
                  <Badge className="bg-gradient-primary text-white">
                    {branch.activeGroups} групп
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Working Hours */}
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>{workingHoursMap.get(branch.name) || branch.workingHours}</span>
                </div>

                {/* Available Languages */}
                <div>
                  <h4 className="font-semibold mb-3">Доступные языки:</h4>
                  <div className="flex flex-wrap gap-2">
                    {languages.map((language, index) => (
                      <div key={index} className="flex items-center gap-1 bg-muted px-3 py-1.5 rounded-lg text-xs">
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
                        {branch.availableSpots === 0 
                          ? 'Группа набрана' 
                          : `${branch.availableSpots} ${branch.availableSpots === 1 ? 'место' : branch.availableSpots < 5 ? 'места' : 'мест'}`
                        }
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3">
                  <Link to={`/branches/${branch.id}`}>
                    <Button variant="hero" className="w-full">
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Подробнее о филиале
                    </Button>
                  </Link>
                  
                  <div className="flex justify-center gap-3">
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={handleCall}
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
                      onClick={() => handleTelegram(branch.name)}
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

        {/* General Schedule Info */}
        <section className="bg-gradient-subtle rounded-2xl p-8 lg:p-12 mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4">
              Общее расписание
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Во всех филиалах действует гибкое расписание с группами каждый день недели
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-semibold mb-2">Удобное время</h3>
              <p className="text-sm text-muted-foreground">
                Утренние, дневные и вечерние группы. Занятия в будни и выходные
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-semibold mb-2">Малые группы</h3>
              <p className="text-sm text-muted-foreground">
                6-12 человек в группе для максимально эффективного обучения
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-semibold mb-2">Все уровни</h3>
              <p className="text-sm text-muted-foreground">
                От начинающих A1 до продвинутых C2. Регулярный набор новых групп
              </p>
            </div>
          </div>
        </section>

        {/* Map Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">Все филиалы на карте</h2>
          <BranchesMap />
        </section>

        {/* CTA Section */}
        <section className="bg-primary rounded-2xl p-8 lg:p-12 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">
            Выберите удобный филиал
          </h2>
          <p className="text-xl text-primary-foreground mb-8 max-w-2xl mx-auto">
            Запишитесь на бесплатный пробный урок в любом из наших филиалов
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/contacts">
              <Button variant="secondary" size="lg" className="flex items-center gap-2">
                <UserCheck className="w-5 h-5" />
                Записаться на пробный урок
              </Button>
            </Link>
            <Button 
              variant="outline" 
              size="lg"
              className="border-white text-white hover:bg-white hover:text-primary"
              onClick={() => handleWhatsApp("ближайшем")}
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              Выбрать в WhatsApp
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}