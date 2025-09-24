import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  BookOpen, 
  Clock, 
  ChevronDown,
  ArrowLeft,
  GraduationCap,
  Target,
  Play,
  Gamepad2,
  FileText,
  Music,
  Video,
  Users,
  Download,
  Calendar
} from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { InlineCourseMaterials } from "@/components/student/InlineCourseMaterials";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo } from "react";

// Типы для данных курса
interface Course {
  id: string;
  title: string;
  description: string;
  slug: string;
}

interface CourseUnit {
  id: string;
  unit_number: number;
  title: string;
  description: string;
  vocabulary: string;
  grammar: string;
  lessons_count: number;
  sort_order: number;
}

interface UnitLesson {
  id: string;
  unit_id: string;
  lesson_number: number;
  title: string;
  topics: any;
  materials: any;
  activities: any;
  grammar: any;
  vocabulary: any;
  sort_order: number;
}


// Типизация для детального плана урока
interface LessonDetail {
  date: string;
  title: string;
  unit: string;
  unitNumber: number;
  goals: string[];
  materials: string[];
  structure: Record<string, string>;
  homework: string;
}

// Данные детального планирования уроков (пример для Kid's Box 1)
const lessonDetailsData: Record<string, Record<number, LessonDetail>> = {
  'kids-box-1': {
    1: {
      date: "2025-09-01",
      title: "Meeting the Star family",
      unit: "Unit 1",
      unitNumber: 1,
      goals: ["приветствия", "имена персонажей", "числа/цвета"],
      materials: ["PB Unit 1", "AB Unit 1", "TB Unit 1", "Audio (song)", "KB1 интерактив"],
      structure: {
        "0-5": "ДЗ-чек/повтор (имена, цвета)",
        "5-15": "Разминка — ball name game; приветствие по кругу",
        "15-30": "Презентация — герои Star family (картинка/слайд), числа/цвета",
        "30-50": "Практика — bingo (числа/цвета), TPR «show the colour/number»",
        "50-70": "Коммуникативное — песня «Hello» + жесты; мини-диалоги «My name is…»",
        "70-80": "Закрепление — карточки с именами → сопоставить; объяснить ДЗ"
      },
      homework: "AB — раскрасить лист; выучить имена персонажей"
    },
    2: {
      date: "2025-09-04",
      title: "Where is it? (in/on/under)",
      unit: "Unit 1",
      unitNumber: 1,
      goals: ["предлоги места", "понимание инструкций"],
      materials: ["PB Unit 1", "AB Unit 1", "TB", "Audio (short dialogue)", "KB1 game"],
      structure: {
        "0-5": "ДЗ-чек (имена/цвета)",
        "5-15": "Разминка — «Simon says» с предметами класса",
        "15-30": "Презентация — in/on/under с реальными объектами/картинками",
        "30-50": "Практика — «Where's the teddy?» (прячем/находим); парная Q&A",
        "50-70": "Коммуникативное — мини-квест в классе по подсказкам учителя",
        "70-80": "Закрепление — краткий воркбук/AB упражнение; объяснить ДЗ"
      },
      homework: "Нарисовать свою комнату и подписать предметы (in/on/under)"
    },
    3: {
      date: "2025-09-08",
      title: "Family and age",
      unit: "Unit 1",
      unitNumber: 1,
      goals: ["семья", "How old are you?", "числа 1–10 повтор"],
      materials: ["PB/AB Unit 1", "TB", "Age cards", "KB1"],
      structure: {
        "0-5": "ДЗ-чек (комната/подписи)",
        "5-15": "Разминка — счёт по кругу, «clap on 5/10»",
        "15-30": "Презентация — семейные отношения; вопрос «How old are you?»",
        "30-50": "Практика — карточки возрастов; парные диалоги",
        "50-70": "Коммуникативное — «Find someone who» (роль в семье)",
        "70-80": "Закрепление — мини-рисунок «My family» + подписи; ДЗ"
      },
      homework: "AB — упражнение по семье/возрасту"
    },
    4: {
      date: "2025-09-11",
      title: "Classroom commands & objects",
      unit: "Unit 1",
      unitNumber: 1,
      goals: ["команды учителя", "предметы класса", "вежливые просьбы"],
      materials: ["PB/AB Unit 1", "TB", "Flashcards", "KB1"],
      structure: {
        "0-5": "ДЗ-чек",
        "5-15": "Разминка — chant с действиями: sit down, stand up, open your book",
        "15-30": "Презентация — предметы класса; this is a…",
        "30-50": "Практика — charades/flashcard race",
        "50-70": "Коммуникативное — парные инструкции «Please, open/close…»",
        "70-80": "Закрепление — короткий worksheet; ДЗ"
      },
      homework: "KB1 — игры Unit 1 (повтор слов)"
    }
  }
};

// Материалы курса
const courseMaterials = [
  {
    name: "Pupil's Book",
    description: "Основной учебник для ученика",
    icon: BookOpen
  },
  {
    name: "Activity Book", 
    description: "Рабочая тетрадь с упражнениями",
    icon: FileText
  },
  {
    name: "Teacher's Book",
    description: "Методическое пособие для учителя", 
    icon: Users
  },
  {
    name: "Аудиоматериалы",
    description: "Песни, истории, упражнения на слух",
    icon: Music
  },
  {
    name: "Видеоматериалы", 
    description: "Обучающие видео и мультфильмы",
    icon: Video
  },
  {
    name: "Интерактивы",
    description: "Интерактивные игры и упражнения",
    icon: Gamepad2
  }
];

// Список доступных курсов для переключения
const availableCourses = [
  { name: "Super Safari 1", slug: "super-safari-1" },
  { name: "Super Safari 2", slug: "super-safari-2" },
  { name: "Super Safari 3", slug: "super-safari-3" },
  { name: "Kid's Box Starter", slug: "kids-box-starter" },
  { name: "Kid's Box 1", slug: "kids-box-1" },
  { name: "Kid's Box 2", slug: "kids-box-2" },
  { name: "Kid's Box 3+4", slug: "kids-box-3-4" },
  { name: "Kid's Box 5", slug: "kids-box-5" },
  { name: "Kid's Box 6", slug: "kids-box-6" },
  { name: "Prepare 1", slug: "prepare-1" },
  { name: "Prepare 2", slug: "prepare-2" },
  { name: "Prepare 3", slug: "prepare-3" },
  { name: "Prepare 4", slug: "prepare-4" },
  { name: "Prepare 5", slug: "prepare-5" },
  { name: "Prepare 6", slug: "prepare-6" },
  { name: "Prepare 7", slug: "prepare-7" },
  { name: "Empower 1", slug: "empower-1" },
  { name: "Empower 2", slug: "empower-2" },
  { name: "Empower 3", slug: "empower-3" },
  { name: "Empower 4", slug: "empower-4" },
  { name: "Empower 5", slug: "empower-5" },
  { name: "Empower 6", slug: "empower-6" }
];

export default function CourseDetails() {
  const { courseSlug } = useParams<{ courseSlug: string }>();
  const navigate = useNavigate();
  const [selectedLesson, setSelectedLesson] = useState<UnitLesson | null>(null);
  const [expandedUnits, setExpandedUnits] = useState<Set<number>>(new Set());

  // Получение данных о курсе
  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: ['course', courseSlug],
    queryFn: async () => {
      if (!courseSlug) throw new Error('Course slug is required');
      
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('slug', courseSlug)
        .single();
        
      if (error) throw error;
      return data as Course;
    },
    enabled: !!courseSlug
  });

  // Получение юнитов курса
  const { data: units, isLoading: unitsLoading } = useQuery({
    queryKey: ['course-units', course?.id],
    queryFn: async () => {
      if (!course?.id) return [];
      const { data, error } = await supabase
        .from('course_units')
        .select('*')
        .eq('course_id', course.id)
        .order('sort_order');
      if (error) throw error;
      return data as CourseUnit[];
    },
    enabled: !!course?.id
  });

  // Карты для быстрого доступа
  const unitById = useMemo(() => {
    const m: Record<string, CourseUnit> = {};
    (units ?? []).forEach(u => { m[u.id] = u as CourseUnit; });
    return m;
  }, [units]);

  // Получение уроков юнитов для текущего курса
  const unitIds = (units ?? []).map(u => u.id);
  const { data: lessons, isLoading: lessonsLoading } = useQuery({
    queryKey: ['unit-lessons', unitIds],
    queryFn: async () => {
      if (!unitIds.length) return [] as UnitLesson[];
      const { data, error } = await supabase
        .from('unit_lessons')
        .select('*')
        .in('unit_id', unitIds)
        .order('sort_order', { ascending: true })
        .order('lesson_number', { ascending: true });
      if (error) throw error;
      return (data as unknown) as UnitLesson[];
    },
    enabled: unitIds.length > 0,
  });

  const lessonsByUnitId = useMemo(() => {
    const map: Record<string, UnitLesson[]> = {};
    (lessons ?? []).forEach((l) => {
      if (!map[l.unit_id]) map[l.unit_id] = [];
      map[l.unit_id].push(l);
    });
    return map;
  }, [lessons]);

  // Функция для переключения между курсами
  const handleCourseChange = (newCourseSlug: string) => {
    navigate(`/programs/course-details/${newCourseSlug}`);
  };

  // Закрытие модального окна урока
  const closeDialog = () => {
    setSelectedLesson(null);
  };

  // Переключение раскрытия юнита
  const toggleUnit = (unitNumber: number) => {
    const next = new Set(expandedUnits);
    if (next.has(unitNumber)) next.delete(unitNumber); else next.add(unitNumber);
    setExpandedUnits(next);
  };

  // Получение уроков для конкретного юнита
  const getUnitLessons = (unitId: string) => {
    return lessonsByUnitId[unitId] || [];
  };

  // Определение цвета для юнита
  const getUnitColor = (unitNumber: number) => {
    const colors = [
      "bg-blue-50 border-blue-200",
      "bg-green-50 border-green-200", 
      "bg-purple-50 border-purple-200",
      "bg-red-50 border-red-200",
      "bg-yellow-50 border-yellow-200",
      "bg-pink-50 border-pink-200",
      "bg-indigo-50 border-indigo-200",
      "bg-orange-50 border-orange-200",
      "bg-teal-50 border-teal-200",
      "bg-cyan-50 border-cyan-200",
      "bg-lime-50 border-lime-200",
      "bg-emerald-50 border-emerald-200"
    ];
    return colors[(unitNumber - 1) % colors.length];
  };

  if (courseLoading || unitsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600">Загрузка курса...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-gray-900">Курс не найден</h1>
          <p className="text-gray-600">Запрошенный курс не существует</p>
          <Button onClick={() => navigate('/programs')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Вернуться к курсам
          </Button>
        </div>
      </div>
    );
  }

  // Найти текущий курс в списке доступных
  const currentCourse = availableCourses.find(c => c.slug === courseSlug);

  return (
    <>
      <SEOHead
        title={`${course.title} - Детали курса`}
        description={course.description}
        keywords={`${course.title}, английский для детей, обучение английскому`}
      />
      
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-12">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-4 mb-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/programs')}
                className="text-white border-white hover:bg-white hover:text-blue-600"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Назад
              </Button>
              
              {/* Переключатель курсов */}
              <div className="ml-auto">
                <Select value={courseSlug} onValueChange={handleCourseChange}>
                  <SelectTrigger className="w-64 bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Выберите курс" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCourses.map((course) => (
                      <SelectItem key={course.slug} value={course.slug}>
                        {course.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex items-center gap-4 mb-4">
              <GraduationCap className="h-12 w-12" />
              <div>
                <h1 className="text-4xl font-bold">{course.title}</h1>
                <p className="text-xl text-blue-100">{course.description}</p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-4 mt-6">
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
                <BookOpen className="h-5 w-5" />
                <span>{units?.length || 0} юнитов</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
                <Clock className="h-5 w-5" />
                <span>{units?.reduce((total, unit) => total + unit.lessons_count, 0) || 0} уроков</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-8">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Обзор</TabsTrigger>
              <TabsTrigger value="template">Шаблон урока</TabsTrigger>
              <TabsTrigger value="trainers">Тренажёры</TabsTrigger>
              <TabsTrigger value="materials">Материалы</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-6 w-6 text-blue-600" />
                    Структура курса
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {units?.map((unit) => (
                      <Collapsible 
                        key={unit.id} 
                        open={expandedUnits.has(unit.unit_number)}
                        onOpenChange={() => toggleUnit(unit.unit_number)}
                      >
                        <CollapsibleTrigger asChild>
                          <Card className={`cursor-pointer transition-all hover:shadow-md ${getUnitColor(unit.unit_number)}`}>
                            <CardContent className="p-6">
                              <div className="flex items-center justify-between">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-3">
                                    <Badge variant="secondary">
                                      Юнит {unit.unit_number}
                                    </Badge>
                                    <h3 className="text-lg font-semibold">{unit.title}</h3>
                                  </div>
                                  <p className="text-gray-600">{unit.description}</p>
                                  <div className="flex items-center gap-4 text-sm text-gray-500">
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-4 w-4" />
                                      {unit.lessons_count} уроков
                                    </span>
                                  </div>
                                </div>
                                <ChevronDown className="h-5 w-5 text-gray-400" />
                              </div>
                            </CardContent>
                          </Card>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <Card className="mt-2">
                            <CardContent className="p-6 space-y-4">
                              <div>
                                <h4 className="font-semibold text-green-600 mb-2">📚 Лексика:</h4>
                                <p className="text-gray-700">{unit.vocabulary}</p>
                              </div>
                              <div>
                                <h4 className="font-semibold text-blue-600 mb-2">⚙️ Грамматика:</h4>
                                <p className="text-gray-700">{unit.grammar}</p>
                              </div>

                              {/* Уроки внутри юнита */}
                              {getUnitLessons(unit.unit_number).length > 0 && (
                                <div className="mt-6">
                                  <h4 className="font-semibold text-purple-600 mb-3">📖 Уроки:</h4>
                                  <div className="grid gap-3">
                                    {getUnitLessons(unit.unit_number).map((lesson) => (
                                      <Card
                                        key={lesson.lessonNumber}
                                        className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-blue-500"
                                        onClick={() => setSelectedLesson(lesson.lessonNumber)}
                                      >
                                        <CardContent className="p-4">
                                          <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                              <Badge variant="outline" className="text-xs">
                                                Урок {lesson.lessonNumber}
                                              </Badge>
                                              <span className="text-xs text-muted-foreground">{lesson.date}</span>
                                            </div>
                                          </div>
                                          <h5 className="font-medium text-sm mb-2">{lesson.title}</h5>
                                          <div className="space-y-2">
                                            <div>
                                              <p className="text-xs font-medium text-gray-600">Цели:</p>
                                              <p className="text-xs text-gray-500">{lesson.goals.join(", ")}</p>
                                            </div>
                                            <div>
                                              <p className="text-xs font-medium text-gray-600">ДЗ:</p>
                                              <p className="text-xs text-gray-500 line-clamp-1">{lesson.homework}</p>
                                            </div>
                                          </div>
                                        </CardContent>
                                      </Card>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                  </div>
                </CardContent>
              </Card>
             </TabsContent>

            {/* Template Tab */}
            <TabsContent value="template" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-6 h-6" />
                    Шаблон урока (80 минут)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-muted-foreground mb-6">
                      Используйте эту структуру на всех занятиях для максимальной эффективности:
                    </p>
                    
                    <div className="grid gap-4">
                      <div className="flex items-center gap-4 p-4 border rounded-lg">
                        <Badge variant="secondary" className="min-w-[3rem] justify-center">5′</Badge>
                        <div>
                          <h4 className="font-medium">Проверка ДЗ / повторение</h4>
                          <p className="text-sm text-muted-foreground">Краткая проверка домашнего задания</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 p-4 border rounded-lg">
                        <Badge variant="secondary" className="min-w-[3rem] justify-center">10′</Badge>
                        <div>
                          <h4 className="font-medium">Разминка</h4>
                          <p className="text-sm text-muted-foreground">Песня/ритуал приветствия/игра</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 p-4 border rounded-lg">
                        <Badge variant="secondary" className="min-w-[3rem] justify-center">15′</Badge>
                        <div>
                          <h4 className="font-medium">Презентация нового</h4>
                          <p className="text-sm text-muted-foreground">Лексика/грамматика/фонетика</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 p-4 border rounded-lg">
                        <Badge variant="secondary" className="min-w-[3rem] justify-center">20′</Badge>
                        <div>
                          <h4 className="font-medium">Практика</h4>
                          <p className="text-sm text-muted-foreground">Карточки, пары/группы, задания из PB/AB</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 p-4 border rounded-lg">
                        <Badge variant="secondary" className="min-w-[3rem] justify-center">20′</Badge>
                        <div>
                          <h4 className="font-medium">Коммуникативное задание</h4>
                          <p className="text-sm text-muted-foreground">Диалоги, ролевые игры, story acting</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 p-4 border rounded-lg">
                        <Badge variant="secondary" className="min-w-[3rem] justify-center">10′</Badge>
                        <div>
                          <h4 className="font-medium">Закрепление + ДЗ</h4>
                          <p className="text-sm text-muted-foreground">Подведение итогов и объяснение домашки</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 p-4 bg-primary/5 rounded-lg">
                      <h4 className="font-medium mb-2">Единый ритуал урока:</h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>• Приветствие → «Circle time» 2–3 минуты</li>
                        <li>• «Слово дня» или «быстрый повтор»</li>
                        <li>• Песня/джингл по теме юнита</li>
                        <li>• В конце: «Exit ticket» (1 вопрос/микро-задание)</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Trainers Tab */}
            <TabsContent value="trainers" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gamepad2 className="w-6 h-6 text-green-600" />
                    Тренажёры и интерактивы
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {courseMaterials.map((material, index) => (
                      <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer">
                        <CardContent className="p-6 text-center">
                          <material.icon className="w-12 h-12 mx-auto mb-4 text-primary" />
                          <h4 className="font-medium mb-2">{material.name}</h4>
                          <p className="text-sm text-muted-foreground mb-4">{material.description}</p>
                          <Button variant="outline" size="sm" className="w-full">
                            <Play className="w-4 h-4 mr-2" />
                            Открыть
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="mt-8 space-y-4">
                    <h4 className="font-semibold">Интерактивные тренажёры:</h4>
                    <div className="grid gap-3">
                      <div className="p-3 border rounded-lg flex items-center justify-between">
                        <div>
                          <span className="font-medium">Vocabulary Flashcards:</span>
                          <p className="text-sm text-muted-foreground">Интерактивные карточки для изучения новых слов</p>
                        </div>
                        <Button variant="outline" size="sm">
                          <Play className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="p-3 border rounded-lg flex items-center justify-between">
                        <div>
                          <span className="font-medium">Grammar Quiz:</span>
                          <p className="text-sm text-muted-foreground">Интерактивные упражнения по грамматике</p>
                        </div>
                        <Button variant="outline" size="sm">
                          <Play className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="p-3 border rounded-lg flex items-center justify-between">
                        <div>
                          <span className="font-medium">Listening Activities:</span>
                          <p className="text-sm text-muted-foreground">Упражнения на аудирование с интерактивными заданиями</p>
                        </div>
                        <Button variant="outline" size="sm">
                          <Play className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="p-3 border rounded-lg flex items-center justify-between">
                        <div>
                          <span className="font-medium">Speaking Practice:</span>
                          <p className="text-sm text-muted-foreground">Ролевые игры и диалоги для развития речи</p>
                        </div>
                        <Button variant="outline" size="sm">
                          <Play className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Materials Tab */}
            <TabsContent value="materials" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-6 w-6 text-blue-600" />
                    Учебные материалы
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <InlineCourseMaterials selectedCourse={course.slug} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Модальное окно с детальным планом урока */}
      {selectedLessonData && (
        <Dialog open={!!selectedLesson} onOpenChange={closeDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Урок {selectedLesson}: {selectedLessonData.title}
              </DialogTitle>
              <DialogDescription>
                {selectedLessonData.unit} • {selectedLessonData.date}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Цели урока */}
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Цели урока:
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedLessonData.goals.map((goal, index) => (
                    <Badge key={index} variant="secondary">{goal}</Badge>
                  ))}
                </div>
              </div>
              
              {/* Материалы */}
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Материалы:
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedLessonData.materials.map((material, index) => (
                    <Badge key={index} variant="outline">{material}</Badge>
                  ))}
                </div>
              </div>
              
              {/* Структура урока */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Структура урока (80 минут):
                </h4>
                <div className="space-y-3">
                  {Object.entries(selectedLessonData.structure).map(([time, activity]) => (
                    <div key={time} className="flex items-start gap-4 p-3 border rounded-lg">
                      <Badge variant="secondary" className="min-w-[4rem] justify-center">
                        {time}′
                      </Badge>
                      <p className="text-sm flex-1">{activity}</p>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Домашнее задание */}
              <div>
                <h4 className="font-semibold mb-2">Домашнее задание:</h4>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm">{selectedLessonData.homework}</p>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}