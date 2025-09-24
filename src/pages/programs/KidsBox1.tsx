import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  BookOpen, 
  Download, 
  FolderOpen, 
  Play, 
  Clock, 
  Users, 
  Calendar,
  CheckCircle,
  ChevronDown,
  ExternalLink,
  FileText,
  Music,
  Video,
  Gamepad2,
  Target,
  Award,
  MessageCircle,
  Search,
  Home
} from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { CourseMaterialsLibrary } from "@/components/student/CourseMaterialsLibrary";

// Данные детального планирования уроков
const lessonDetails = {
  1: {
    date: "2025-09-01",
    title: "Meeting the Star family",
    unit: "Unit 1",
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
  },
  5: {
    date: "2025-09-15",
    title: "Colours & numbers (revision)",
    unit: "Unit 1",
    goals: ["систематизация цветов/чисел", "аудирование/игры"],
    materials: ["PB/AB", "TB", "Audio (songs)", "KB1"],
    structure: {
      "0-5": "ДЗ-чек",
      "5-15": "Разминка — colour song + TPR",
      "15-30": "Презентация — code puzzles (число+цвет)",
      "30-50": "Практика — station games (счёт/цвет)",
      "50-70": "Коммуникативное — human number line, команды «Stand at 7»",
      "70-80": "Закрепление — мини-квиз; ДЗ"
    },
    homework: "KB1 — интерактивное упражнение"
  },
  6: {
    date: "2025-09-18",
    title: "Story: Toys in the toy box",
    unit: "Unit 1",
    goals: ["аудирование истории", "последовательность", "роли"],
    materials: ["Story Unit 1", "masks", "KB1 Stories", "AB"],
    structure: {
      "0-5": "ДЗ-чек",
      "5-15": "Разминка — «story words» (предварительная лексика)",
      "15-30": "Презентация — просмотр/прослушивание истории",
      "30-50": "Практика — расставить кадры по порядку; true/false",
      "50-70": "Коммуникативное — acting с масками (короткие роли)",
      "70-80": "Закрепление — AB story sequence; ДЗ"
    },
    homework: "Повторить лексику/песни на KB1"
  },
  7: {
    date: "2025-09-22",
    title: "Unit 1 Revision & Assessment",
    unit: "Unit 1",
    goals: ["проверка понимания", "игровое повторение"],
    materials: ["Mini-test", "flashcards", "KB1 games"],
    structure: {
      "0-5": "ДЗ-чек",
      "5-15": "Разминка — «quiz warm-up»",
      "15-30": "Презентация — нет нового (инструктаж к тесту)",
      "30-50": "Практика — мини-тест (слова/структуры)",
      "50-70": "Коммуникативное — «create a dialogue» (greetings+in/on/under)",
      "70-80": "Закрепление — фидбек, цель следующего юнита; ДЗ"
    },
    homework: "нет (готовимся к Unit 2)"
  },
  8: {
    date: "2025-09-25",
    title: "School objects; this/that",
    unit: "Unit 2",
    goals: ["лексика школьных предметов", "this/that"],
    materials: ["PB/AB Unit 2", "TB", "реальные предметы", "KB1"],
    structure: {
      "0-5": "ДЗ-чек",
      "5-15": "Разминка — «guess in the bag»",
      "15-30": "Презентация — pen/pencil/book/ruler/rubber; this/that",
      "30-50": "Практика — pelmanism (пары картинок/слов)",
      "50-70": "Коммуникативное — «What's this/that?» вокруг класса",
      "70-80": "Закрепление — AB страница; ДЗ"
    },
    homework: "Нарисовать pencil case и подписать"
  },
  9: {
    date: "2025-09-29",
    title: "Numbers 11–20; plurals",
    unit: "Unit 2",
    goals: ["11–20", "множественное число", "написание"],
    materials: ["PB/AB", "TB", "number cards", "KB1"],
    structure: {
      "0-5": "ДЗ-чек",
      "5-15": "Разминка — счёт с хлопками/прыжками",
      "15-30": "Презентация — number chant; plural -s",
      "30-50": "Практика — упорядочить карточки; «count the objects»",
      "50-70": "Коммуникативное — «shop role-play» (цены/кол-во)",
      "70-80": "Закрепление — мини-квиз; ДЗ"
    },
    homework: "Практика чисел на KB1"
  },
  10: {
    date: "2025-10-02",
    title: "Subjects; timetable",
    unit: "Unit 2",
    goals: ["предметы (maths, art…)", "дни", "чтение расписания"],
    materials: ["PB timetable", "AB", "TB", "song (days)"],
    structure: {
      "0-5": "ДЗ-чек",
      "5-15": "Разминка — песня «Days of the week»",
      "15-30": "Презентация — предметы; «What's on Monday?»",
      "30-50": "Практика — составить мини-расписание класса",
      "50-70": "Коммуникативное — опрос «Favourite subject» + график-наклейки",
      "70-80": "Закрепление — AB; ДЗ"
    },
    homework: "Нарисовать своё недельное расписание"
  },
  11: {
    date: "2025-10-06",
    title: "Prepositions; classroom map",
    unit: "Unit 2",
    goals: ["next to/behind/in front of", "ориентация"],
    materials: ["PB/AB", "TB", "план-карта класса", "стикеры", "KB1"],
    structure: {
      "0-5": "ДЗ-чек",
      "5-15": "Разминка — TPR с предлогами",
      "15-30": "Презентация — карта класса; примеры",
      "30-50": "Практика — расставить стикеры по инструкциям",
      "50-70": "Коммуникативное — парная навигация «Give directions»",
      "70-80": "Закрепление — AB mapping; ДЗ"
    },
    homework: "Онлайн-практика предлогов (KB1)"
  },
  12: {
    date: "2025-10-09",
    title: "Story: The magic school",
    unit: "Unit 2",
    goals: ["понимание истории", "реплики по ролям"],
    materials: ["Story Unit 2", "masks/roles", "AB", "KB1 Stories"],
    structure: {
      "0-5": "ДЗ-чек",
      "5-15": "Разминка — пред-лексика (school words)",
      "15-30": "Презентация — просмотр/прослушивание",
      "30-50": "Практика — порядок кадров; вопросы по сюжету",
      "50-70": "Коммуникативное — ролевая сценка (2–3 реплики)",
      "70-80": "Закрепление — AB story; ДЗ"
    },
    homework: "Посмотреть story дома, выучить 3 реплики"
  },
  13: {
    date: "2025-10-13",
    title: "Revision & project: My dream school",
    unit: "Unit 2",
    goals: ["творческий постер", "презентации", "мини-квиз"],
    materials: ["ватман/стикеры", "PB/AB", "KB1"],
    structure: {
      "0-5": "ДЗ-чек",
      "5-15": "Разминка — «quick review» (карточки)",
      "15-30": "Презентация — задание на постер/требования",
      "30-50": "Практика — работа в группах над постером",
      "50-70": "Коммуникативное — презентация по 30–60 сек/группа",
      "70-80": "Закрепление — мини-квиз; фидбек; ДЗ"
    },
    homework: "нет"
  },
  14: {
    date: "2025-10-16",
    title: "Unit 2 Assessment",
    unit: "Unit 2",
    goals: ["контроль лексики/структур", "говорение"],
    materials: ["Mini-test", "speaking prompts", "KB1"],
    structure: {
      "0-5": "ДЗ-чек",
      "5-15": "Разминка — light quiz",
      "15-30": "Презентация — инструкции к тесту",
      "30-50": "Практика — письменный/устный мини-тест",
      "50-70": "Коммуникативное — парные диалоги по карточкам",
      "70-80": "Закрепление — фидбек; план Unit 3; ДЗ"
    },
    homework: "нет"
  }
  // ... (continue with other lessons as needed)
};

const units = [
  {
    id: 1,
    title: "Unit 1 — Hello!",
    description: "Знакомство с семьей Star, приветствия, предлоги места",
    color: "bg-blue-50 border-blue-200",
    lessons: 7,
    vocabulary: "Семья, числа, цвета, предлоги in/on/under",
    grammar: "What's your name? How old are you? Where is…?"
  },
  {
    id: 2,
    title: "Unit 2 — My school",
    description: "Школьные предметы, числа 11-20, дни недели",
    color: "bg-green-50 border-green-200", 
    lessons: 7,
    vocabulary: "Школьные предметы, числа 11-20, дни недели",
    grammar: "This is a... I have got... What day is it?"
  },
  {
    id: 3,
    title: "Unit 3 — Favourite toys",
    description: "Игрушки, предпочтения, описания",
    color: "bg-purple-50 border-purple-200",
    lessons: 7,
    vocabulary: "Игрушки, цвета, прилагательные big/small",
    grammar: "I like/don't like, притяжательные прилагательные"
  },
  {
    id: 4,
    title: "Unit 4 — My family",
    description: "Семья, профессии, дни рождения",
    color: "bg-red-50 border-red-200",
    lessons: 7,
    vocabulary: "Члены семьи, профессии, месяцы",
    grammar: "Притяжательный 's, When's your birthday?"
  },
  {
    id: 5,
    title: "Unit 5 — Our pet",
    description: "Питомцы, уход, еда для животных",
    color: "bg-yellow-50 border-yellow-200",
    lessons: 7,
    vocabulary: "Животные, еда, прилагательные описания",
    grammar: "Have got/has got"
  },
  {
    id: 6,
    title: "Unit 6 — My face",
    description: "Части тела, внешность, описания людей",
    color: "bg-pink-50 border-pink-200",
    lessons: 6,
    vocabulary: "Части лица, прилагательные внешности",
    grammar: "Have got (внешность), описания"
  }
  // ... (continue with other units as needed)
];

const materials = [
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
    name: "KB1 Интерактивы",
    description: "Интерактивные игры и упражнения",
    icon: Gamepad2
  }
];

export default function KidsBox1() {
  const [searchLessonNumber, setSearchLessonNumber] = useState('');
  const [selectedLesson, setSelectedLesson] = useState<number | null>(null);
  const [openUnits, setOpenUnits] = useState<Record<number, boolean>>({});

  const handleSearchLesson = () => {
    const lessonNum = parseInt(searchLessonNumber);
    if (lessonNum >= 1 && lessonNum <= 28) {
      setSelectedLesson(lessonNum);
    }
  };

  const toggleUnit = (unitId: number) => {
    setOpenUnits(prev => ({
      ...prev,
      [unitId]: !prev[unitId]
    }));
  };

  const closeDialog = () => {
    setSelectedLesson(null);
  };

  const selectedLessonData = selectedLesson ? lessonDetails[selectedLesson as keyof typeof lessonDetails] : null;

  return (
    <>
      <SEOHead 
        title="Kid's Box 1 - Детальное планирование | Okey English"
        description="Полный план курса Kid's Box 1 с детальным описанием каждого урока, целями, материалами и структурой занятий"
        keywords="Kids Box 1, планирование уроков, английский для детей, Cambridge English, методика преподавания"
      />
      
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
        {/* Заголовок страницы */}
        <section className="relative pt-20 pb-12 bg-gradient-to-r from-blue-600 to-purple-600 text-white overflow-hidden">
          <div className="absolute inset-0 bg-black/20"></div>
          
          <div className="relative container mx-auto px-4 text-center">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-100">
                Kid's Box 1 - Детальное планирование
              </h1>
              <p className="text-xl md:text-2xl text-blue-100 mb-8">
                Полный план курса с пошаговыми инструкциями для каждого урока
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
                <Badge variant="secondary" className="text-lg px-4 py-2 bg-white/20 text-white border-white/30">
                  28 уроков
                </Badge>
                <Badge variant="secondary" className="text-lg px-4 py-2 bg-white/20 text-white border-white/30">
                  6 юнитов
                </Badge>
                <Badge variant="secondary" className="text-lg px-4 py-2 bg-white/20 text-white border-white/30">
                  Возраст 6-8 лет
                </Badge>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" variant="secondary" className="bg-white text-blue-600 hover:bg-blue-50">
                  <BookOpen className="w-5 h-5 mr-2" />
                  Pupil's Book PDF
                </Button>
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                  <FileText className="w-5 h-5 mr-2" />
                  Activity Book PDF
                </Button>
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                  <ExternalLink className="w-5 h-5" />
                  KB1 интерактивы
                </Button>
              </div>
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 py-12">
          <Tabs defaultValue="schedule" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="schedule">Календарь</TabsTrigger>
              <TabsTrigger value="lessons">Юниты</TabsTrigger>
              <TabsTrigger value="template">Шаблон урока</TabsTrigger>
              <TabsTrigger value="materials">Материалы</TabsTrigger>
              <TabsTrigger value="assessment">Оценка</TabsTrigger>
            </TabsList>

            {/* Календарь и ритм */}
            <TabsContent value="schedule">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-6 h-6" />
                    Календарь и ритм курса
                  </CardTitle>
                  <p className="text-muted-foreground">
                    Планирование на учебный год с учетом каникул и праздников
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Card className="border-blue-200">
                      <CardContent className="p-4">
                        <h4 className="font-semibold text-blue-700 mb-2">Сентябрь - Октябрь</h4>
                        <p className="text-sm text-muted-foreground mb-2">Units 1-2 (14 уроков)</p>
                        <ul className="text-sm space-y-1">
                          <li>• Знакомство и приветствие</li>
                          <li>• Школьные предметы</li>
                          <li>• Базовые числа и цвета</li>
                        </ul>
                      </CardContent>
                    </Card>
                    
                    <Card className="border-green-200">
                      <CardContent className="p-4">
                        <h4 className="font-semibold text-green-700 mb-2">Ноябрь - Декабрь</h4>
                        <p className="text-sm text-muted-foreground mb-2">Units 3-4 (14 уроков)</p>
                        <ul className="text-sm space-y-1">
                          <li>• Семья и дом</li>
                          <li>• Игрушки и любимые вещи</li>
                          <li>• Рождественская тема</li>
                        </ul>
                      </CardContent>
                    </Card>

                    <Card className="border-purple-200">
                      <CardContent className="p-4">
                        <h4 className="font-semibold text-purple-700 mb-2">Январь - Май</h4>
                        <p className="text-sm text-muted-foreground mb-2">Units 5-6 + Review</p>
                        <ul className="text-sm space-y-1">
                          <li>• Животные и природа</li>
                          <li>• Еда и напитки</li>
                          <li>• Повторение всего курса</li>
                        </ul>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="mt-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-semibold text-blue-800 mb-4">Рекомендуемый ритм</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="font-medium mb-2">Для групп 2 раза в неделю:</p>
                        <ul className="text-sm space-y-1">
                          <li>• Каждый юнит = 3-4 недели</li>
                          <li>• 1 урок = 1 академический час</li>
                          <li>• Тест в конце каждого юнита</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-medium mb-2">Для групп 1 раз в неделю:</p>
                        <ul className="text-sm space-y-1">
                          <li>• Каждый юнит = 6-7 недель</li>
                          <li>• Больше времени на повторение</li>
                          <li>• Акцент на speaking в классе</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 text-center">
                    <Button variant="outline" className="w-full md:w-auto">
                      <Download className="w-4 h-4 mr-2" />
                      Скачать подробный план с датами
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Объединенная вкладка: Юниты + Детальные уроки */}
            <TabsContent value="lessons">
              <div className="space-y-6">
                {/* Поиск урока */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Search className="w-5 h-5" />
                      Поиск урока по номеру
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Номер урока (1-28)"
                        value={searchLessonNumber}
                        onChange={(e) => setSearchLessonNumber(e.target.value)}
                        min="1"
                        max="28"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      <Button onClick={handleSearchLesson}>
                        <Search className="w-4 h-4 mr-2" />
                        Найти урок
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Сетка уроков */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(lessonDetails).map(([lessonNum, lesson]) => (
                    <Card 
                      key={lessonNum} 
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setSelectedLesson(parseInt(lessonNum))}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline">Урок {lessonNum}</Badge>
                          <Badge variant="secondary">{lesson.unit}</Badge>
                        </div>
                        <CardTitle className="text-base leading-tight">{lesson.title}</CardTitle>
                        <p className="text-xs text-muted-foreground">{lesson.date}</p>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          <div>
                            <p className="text-sm font-medium">Цели:</p>
                            <p className="text-xs text-muted-foreground">
                              {lesson.goals.join(", ")}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">ДЗ:</p>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {lesson.homework}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
              
              {/* Unit Navigator - объединенная секция */}
              <div className="space-y-4 mt-8">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold mb-2">Unit Navigator</h3>
                  <p className="text-muted-foreground">Кликните на юнит для просмотра подробностей</p>
                </div>
                
                {units.map((unit) => (
                  <Card key={unit.id} className={unit.color}>
                    <Collapsible open={openUnits[unit.id]} onOpenChange={() => toggleUnit(unit.id)}>
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-left">{unit.title}</CardTitle>
                              <p className="text-muted-foreground text-left">{unit.description}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{unit.lessons} уроков</Badge>
                              <ChevronDown className={`w-4 h-4 transition-transform ${openUnits[unit.id] ? 'rotate-180' : ''}`} />
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                              <div>
                                <h4 className="font-medium mb-2">Ключевая лексика:</h4>
                                <p className="text-sm text-muted-foreground">{unit.vocabulary}</p>
                              </div>
                              <div>
                                <h4 className="font-medium mb-2">Грамматика:</h4>
                                <p className="text-sm text-muted-foreground">{unit.grammar}</p>
                              </div>
                            </div>
                            <div className="space-y-3">
                              <Button variant="outline" size="sm" className="w-full justify-start">
                                <Music className="w-4 h-4 mr-2" />
                                Аудио/Песни
                              </Button>
                              <Button variant="outline" size="sm" className="w-full justify-start">
                                <Video className="w-4 h-4 mr-2" />
                                Stories/Видео
                              </Button>
                              <Button variant="outline" size="sm" className="w-full justify-start">
                                <Gamepad2 className="w-4 h-4 mr-2" />
                                KB1 интерактивы
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Шаблон урока */}
            <TabsContent value="template">
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
            
            {/* Материалы урока */}
            <TabsContent value="materials">
              <div className="space-y-6">
                <CourseMaterialsLibrary />
                
                <Card>
                  <CardHeader>
                    <CardTitle>Материалы урока</CardTitle>
                    <p className="text-muted-foreground">Все необходимые ресурсы для проведения занятий</p>
                  </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {materials.map((material, index) => (
                      <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer">
                        <CardContent className="p-6 text-center">
                          <material.icon className="w-12 h-12 mx-auto mb-4 text-primary" />
                          <h4 className="font-medium mb-2">{material.name}</h4>
                          <p className="text-sm text-muted-foreground">{material.description}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="mt-8 space-y-4">
                    <h4 className="font-semibold">Роли материалов:</h4>
                    <div className="grid gap-3">
                      <div className="p-3 border rounded-lg">
                        <span className="font-medium">Pupil's Book (PB):</span> ввод и отработка нового языка
                      </div>
                      <div className="p-3 border rounded-lg">
                        <span className="font-medium">Activity Book (AB):</span> закрепление, письменные задания, ДЗ
                      </div>
                      <div className="p-3 border rounded-lg">
                        <span className="font-medium">Teacher's Book (TB):</span> поурочные подсказки, скрипты, ответы
                      </div>
                      <div className="p-3 border rounded-lg">
                        <span className="font-medium">Kids Box At Home:</span> интерактивы для разминки и домашки
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Как загружать PDF файлы</CardTitle>
                  <p className="text-muted-foreground">
                    Инструкция по работе с PDF материалами в системе
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">Загрузка через CRM</h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>• Перейдите в CRM → выберите чат с учеником/группой</li>
                        <li>• Нажмите на скрепку (📎) для загрузки файлов</li>
                        <li>• PDF файлы автоматически откроются в модальном окне</li>
                        <li>• Максимальный размер файла: 10MB</li>
                      </ul>
                    </div>
                    
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">Возможности просмотра</h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>• Просмотр PDF прямо в браузере</li>
                        <li>• Кнопки для скачивания и открытия в новой вкладке</li>
                        <li>• Удобная навигация по страницам</li>
                        <li>• Масштабирование содержимого</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
              </div>
            </TabsContent>

            {/* Оценивание */}
            <TabsContent value="assessment">
              <Card>
                <CardHeader>
                  <CardTitle>Контроль и оценка</CardTitle>
                  <p className="text-muted-foreground">Система оценивания прогресса учащихся</p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-6 text-center">
                        <CheckCircle className="w-12 h-12 mx-auto mb-4 text-primary" />
                        <h4 className="font-medium mb-2">Тесты</h4>
                        <p className="text-sm text-muted-foreground">После юнитов 1, 4, 8, 12</p>
                      </CardContent>
                    </Card>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-6 text-center">
                        <Target className="w-12 h-12 mx-auto mb-4 text-primary" />
                        <h4 className="font-medium mb-2">Чек-листы</h4>
                        <p className="text-sm text-muted-foreground">What I can do</p>
                      </CardContent>
                    </Card>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-6 text-center">
                        <Award className="w-12 h-12 mx-auto mb-4 text-primary" />
                        <h4 className="font-medium mb-2">Проекты</h4>
                        <p className="text-sm text-muted-foreground">Постеры и презентации</p>
                      </CardContent>
                    </Card>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-6 text-center">
                        <Users className="w-12 h-12 mx-auto mb-4 text-primary" />
                        <h4 className="font-medium mb-2">Результаты</h4>
                        <p className="text-sm text-muted-foreground">Отчёты по группе</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold">Система контроля:</h4>
                    <div className="space-y-3">
                      <div className="p-4 border rounded-lg">
                        <h5 className="font-medium mb-2">Входной/текущий контроль</h5>
                        <p className="text-sm text-muted-foreground">Мини-квиз в конце юнита + устная проверка лексики</p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <h5 className="font-medium mb-2">Итоговые точки</h5>
                        <p className="text-sm text-muted-foreground">После Unit 1, 4, 8, 12 — короткие тесты</p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <h5 className="font-medium mb-2">Проекты</h5>
                        <p className="text-sm text-muted-foreground">Постеры, acting stories, мини-презентации</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Dialog for lesson details */}
        {selectedLessonData && (
          <Dialog open={!!selectedLesson} onOpenChange={closeDialog}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <Badge variant="outline">Урок {selectedLesson}</Badge>
                  <span>{selectedLessonData.title}</span>
                  <Badge variant="secondary">{selectedLessonData.unit}</Badge>
                </DialogTitle>
                <DialogDescription>{selectedLessonData.date}</DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Цели урока */}
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Цели урока:
                  </h4>
                  <ul className="list-disc list-inside space-y-1">
                    {selectedLessonData.goals.map((goal, index) => (
                      <li key={index} className="text-sm">{goal}</li>
                    ))}
                  </ul>
                </div>

                {/* Материалы */}
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Материалы:
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedLessonData.materials.map((material, index) => (
                      <Badge key={index} variant="outline">{material}</Badge>
                    ))}
                  </div>
                </div>

                {/* Поминутная структура */}
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Поминутная структура (80 минут):
                  </h4>
                  <div className="space-y-3">
                    {Object.entries(selectedLessonData.structure).map(([timeRange, activity]) => (
                      <div key={timeRange} className="flex gap-3 p-3 border rounded-lg">
                        <Badge variant="secondary" className="min-w-[5rem] justify-center">
                          {timeRange}′
                        </Badge>
                        <p className="text-sm">{activity}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Домашнее задание */}
                <div className="p-4 bg-primary/5 rounded-lg">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Home className="w-4 h-4" />
                    Домашнее задание:
                  </h4>
                  <p className="text-sm">{selectedLessonData.homework}</p>
                </div>

                {/* Быстрые действия */}
                <div className="flex flex-wrap gap-2 pt-4 border-t">
                  <Button variant="outline" size="sm">
                    <Music className="w-4 h-4 mr-2" />
                    Аудио материалы
                  </Button>
                  <Button variant="outline" size="sm">
                    <Video className="w-4 h-4 mr-2" />
                    Видео/Stories
                  </Button>
                  <Button variant="outline" size="sm">
                    <Gamepad2 className="w-4 h-4 mr-2" />
                    KB1 интерактивы
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Скачать план
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </>
  );
}

// Export helper function
export const getLessonInfoByNumber = (lessonNumber: number) => {
  return lessonDetails[lessonNumber as keyof typeof lessonDetails] || null;
};
