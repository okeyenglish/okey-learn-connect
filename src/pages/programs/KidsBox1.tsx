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
  // Unit 2
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
  },
  // Unit 3
  15: {
    date: "2025-10-20",
    title: "Toy vocabulary; like/don't like",
    unit: "Unit 3",
    goals: ["лексика игрушек", "выражение предпочтений"],
    materials: ["PB/AB", "TB", "toy flashcards", "KB1"],
    structure: {
      "0-5": "ДЗ-чек",
      "5-15": "Разминка — «guess the toy»",
      "15-30": "Презентация — ввод лексики",
      "30-50": "Практика — парная практика (I like… / I don't like…)",
      "50-70": "Коммуникативное — опрос класса + график",
      "70-80": "Закрепление/ДЗ"
    },
    homework: "Нарисовать любимую игрушку и подписать"
  },
  16: {
    date: "2025-10-23",
    title: "Colours + adjectives (big/small/long)",
    unit: "Unit 3",
    goals: ["прилагательные + цвета", "описание игрушек"],
    materials: ["PB/AB", "TB", "toy flashcards", "KB1"],
    structure: {
      "0-5": "ДЗ-чек",
      "5-15": "Разминка — colour chant",
      "15-30": "Презентация — прилагательные на игрушках",
      "30-50": "Практика — игры-сортировки",
      "50-70": "Коммуникативное — описания в парах",
      "70-80": "Закрепление"
    },
    homework: "Онлайн-игра (подбор цвет/признак)"
  },
  17: {
    date: "2025-10-27",
    title: "Possessive adjectives (my/your/his/her)",
    unit: "Unit 3",
    goals: ["притяжательные прилагательные на материале «игрушки»"],
    materials: ["PB/AB", "TB", "KB1"],
    structure: {
      "0-5": "ДЗ-чек",
      "5-15": "Разминка — «Whose toy?»",
      "15-30": "Презентация — ввод my/your/his/her",
      "30-50": "Практика — substitution drills",
      "50-70": "Коммуникативное — ролевые мини-диалоги",
      "70-80": "Закрепление"
    },
    homework: "KB1 практика"
  },
  18: {
    date: "2025-10-30",
    title: "Numbers 20–30; counting",
    unit: "Unit 3",
    goals: ["расширение диапазона", "skip counting"],
    materials: ["PB/AB", "TB", "number cards", "KB1"],
    structure: {
      "0-5": "ДЗ-чек",
      "5-15": "Разминка — number run",
      "15-30": "Презентация — ввод 20–30",
      "30-50": "Практика — счёт предметов, number line",
      "50-70": "Коммуникативное — игры на скорость",
      "70-80": "Закрепление"
    },
    homework: "счётное упражнение (воркбук)"
  },
  19: {
    date: "2025-11-03",
    title: "Story: Favourite toy adventure",
    unit: "Unit 3",
    goals: ["аудирование", "понимание", "последовательность"],
    materials: ["Story Unit 3", "AB", "KB1 Stories"],
    structure: {
      "0-5": "ДЗ-чек",
      "5-15": "Разминка — пред-лексика",
      "15-30": "Презентация — прослушивание/просмотр",
      "30-50": "Практика — упорядочить кадры",
      "50-70": "Коммуникативное — acting с репликами",
      "70-80": "Закрепление"
    },
    homework: "посмотреть story онлайн"
  },
  20: {
    date: "2025-11-06",
    title: "Project & revision: Toy museum",
    unit: "Unit 3",
    goals: ["постеры/экспозиция", "презентации", "интерактивы"],
    materials: ["Project materials", "PB/AB", "KB1"],
    structure: {
      "0-5": "ДЗ-чек",
      "5-15": "Разминка — review",
      "15-30": "Презентация — постановка задачи проекта",
      "30-50": "Практика — работа в группах (экспозиции)",
      "50-70": "Коммуникативное — презентации",
      "70-80": "Закрепление — фидбек"
    },
    homework: "нет"
  },
  21: {
    date: "2025-11-10",
    title: "Unit 3 Assessment",
    unit: "Unit 3",
    goals: ["тест лексики/грамматики", "аудирование/говорение"],
    materials: ["Mini-test", "speaking prompts", "KB1"],
    structure: {
      "0-5": "ДЗ-чек",
      "5-15": "Разминка — warm-up",
      "15-30": "Презентация — инструкции",
      "30-50": "Практика — мини-тест",
      "50-70": "Коммуникативное — speaking prompts",
      "70-80": "Закрепление — фидбек/план Unit 4"
    },
    homework: "нет"
  },
  // Unit 4
  22: {
    date: "2025-11-13",
    title: "Family members; possessive 's",
    unit: "Unit 4",
    goals: ["члены семьи", "притяжательный 's"],
    materials: ["PB/AB Unit 4", "TB", "Family cards", "KB1"],
    structure: {
      "0-5": "ДЗ-чек",
      "5-15": "Разминка — «family tree warm-up»",
      "15-30": "Презентация — possessive 's",
      "30-50": "Практика — парная практика",
      "50-70": "Коммуникативное — мини-интервью о семье",
      "70-80": "Закрепление"
    },
    homework: "Family tree (схема семьи)"
  },
  23: {
    date: "2025-11-17",
    title: "Special: Halloween quiz (revision U1–U2)",
    unit: "Unit 4",
    goals: ["празднование и повторение", "игровые квизы"],
    materials: ["Halloween materials", "Quiz cards", "Costumes"],
    structure: {
      "0-5": "ДЗ-чек",
      "5-15": "Разминка — тематическая разминка",
      "15-30": "Презентация — квиз по лексике",
      "30-50": "Практика — командные игры",
      "50-70": "Коммуникативное — костюм/ролевая сценка",
      "70-80": "Закрепление — итоги"
    },
    homework: "нет"
  },
  24: {
    date: "2025-11-20",
    title: "Jobs & workplaces",
    unit: "Unit 4",
    goals: ["профессии", "места работы", "мини-диалоги"],
    materials: ["PB/AB", "TB", "Job flashcards", "KB1"],
    structure: {
      "0-5": "ДЗ-чек",
      "5-15": "Разминка — «Who am I?»",
      "15-30": "Презентация — ввод профессий",
      "30-50": "Практика — matching/charades",
      "50-70": "Коммуникативное — парные диалоги «Where do you work?»",
      "70-80": "Закрепление"
    },
    homework: "AB упражнения"
  },
  25: {
    date: "2025-11-24",
    title: "Age & birthdays; months",
    unit: "Unit 4",
    goals: ["вопросы о возрасте", "месяцы", "дни рождения"],
    materials: ["PB/AB", "TB", "Month cards", "KB1"],
    structure: {
      "0-5": "ДЗ-чек",
      "5-15": "Разминка — month chant",
      "15-30": "Презентация — вопросы о возрасте/датах",
      "30-50": "Практика — карточки месяцев/дней рождения",
      "50-70": "Коммуникативное — интервью-анкеты",
      "70-80": "Закрепление"
    },
    homework: "Сделать birthday card"
  },
  26: {
    date: "2025-11-27",
    title: "Story: The lost puppy",
    unit: "Unit 4",
    goals: ["аудирование", "ценности помощи", "пересказ"],
    materials: ["Story Unit 4", "AB", "KB1 Stories"],
    structure: {
      "0-5": "ДЗ-чек",
      "5-15": "Разминка — пред-лексика",
      "15-30": "Презентация — история (аудио/видео)",
      "30-50": "Практика — вопросы по тексту",
      "50-70": "Коммуникативное — пересказ по ролям",
      "70-80": "Закрепление"
    },
    homework: "Retell (2–3 предложения)"
  },
  27: {
    date: "2025-12-01",
    title: "Revision & project: My family & hobbies",
    unit: "Unit 4",
    goals: ["постер", "мини-презентации", "игры"],
    materials: ["Project materials", "PB/AB", "KB1"],
    structure: {
      "0-5": "ДЗ-чек",
      "5-15": "Разминка — review",
      "15-30": "Презентация — постановка проекта",
      "30-50": "Практика — работа в группах",
      "50-70": "Коммуникативное — презентации",
      "70-80": "Закрепление — фидбек"
    },
    homework: "нет"
  },
  28: {
    date: "2025-12-04",
    title: "Unit 4 Assessment",
    unit: "Unit 4",
    goals: ["контроль", "устные задания"],
    materials: ["Mini-test", "Speaking prompts", "KB1"],
    structure: {
      "0-5": "ДЗ-чек",
      "5-15": "Разминка — warm-up",
      "15-30": "Презентация — инструкции к тесту",
      "30-50": "Практика — письменный/устный мини-тест",
      "50-70": "Коммуникативное — speaking",
      "70-80": "Закрепление — фидбек, анонс Unit 5"
    },
    homework: "нет"
  }
};

export default function KidsBox1() {
  const [openUnits, setOpenUnits] = useState<{ [key: string]: boolean }>({});
  const [selectedLesson, setSelectedLesson] = useState<number | null>(null);
  const [searchLessonNumber, setSearchLessonNumber] = useState("");

  const toggleUnit = (unitId: string) => {
    setOpenUnits(prev => ({ ...prev, [unitId]: !prev[unitId] }));
  };

  // Функция для получения информации об уроке по номеру
  const getLessonInfo = (lessonNumber: number) => {
    return lessonDetails[lessonNumber as keyof typeof lessonDetails] || null;
  };

  // Функция для поиска урока
  const handleSearchLesson = () => {
    const lessonNum = parseInt(searchLessonNumber);
    if (lessonNum >= 1 && lessonNum <= 28) {
      setSelectedLesson(lessonNum);
    }
  };

  const lessonTemplate = {
    warmup: "5′ — проверка ДЗ и повторение",
    presentation: "10′ — разминка",
    newMaterial: "15′ — презентация нового",
    practice: "20′ — практика",
    communication: "20′ — коммуникативное задание",
    wrapup: "10′ — закрепление и объяснение ДЗ"
  };

  const units = [
    {
      id: "unit1",
      title: "Unit 1 — Hello!",
      description: "Знакомство с семьёй Star, приветствия, предлоги места",
      vocabulary: "Семья, числа, цвета, предлоги in/on/under",
      grammar: "What's your name? How old are you? Where is...?",
      lessons: 7,
      color: "bg-blue-50 border-blue-200"
    },
    {
      id: "unit2", 
      title: "Unit 2 — My school",
      description: "Школьные предметы, числа 11-20, дни недели",
      vocabulary: "Школьные предметы, дни недели, числа 11-20",
      grammar: "This/that, множественное число, предлоги места",
      lessons: 7,
      color: "bg-green-50 border-green-200"
    },
    {
      id: "unit3",
      title: "Unit 3 — Favourite toys", 
      description: "Игрушки, предпочтения, описания",
      vocabulary: "Игрушки, цвета, прилагательные big/small",
      grammar: "I like/don't like, притяжательные прилагательные",
      lessons: 7,
      color: "bg-purple-50 border-purple-200"
    },
    {
      id: "unit4",
      title: "Unit 4 — My family",
      description: "Семья, профессии, дни рождения",
      vocabulary: "Члены семьи, профессии, месяцы",
      grammar: "Притяжательный 's, When's your birthday?",
      lessons: 7,
      color: "bg-red-50 border-red-200"
    },
    {
      id: "unit5",
      title: "Unit 5 — Our pet",
      description: "Питомцы, уход, еда для животных",
      vocabulary: "Животные, еда, прилагательные описания",
      grammar: "Have got/has got",
      lessons: 7,
      color: "bg-yellow-50 border-yellow-200"
    },
    {
      id: "unit6",
      title: "Unit 6 — My face",
      description: "Части тела, внешность, описания людей",
      vocabulary: "Части лица, прилагательные внешности",
      grammar: "Have got (внешность), описания",
      lessons: 6,
      color: "bg-pink-50 border-pink-200"
    },
    {
      id: "unit7",
      title: "Unit 7 — Wild animals",
      description: "Дикие животные, способности, места обитания",
      vocabulary: "Животные зоопарка, части тела животных",
      grammar: "Can/can't, there is/are",
      lessons: 7,
      color: "bg-orange-50 border-orange-200"
    },
    {
      id: "unit8",
      title: "Unit 8 — My clothes",
      description: "Одежда, погода, времена года",
      vocabulary: "Одежда, цвета, погода",
      grammar: "Like/don't like, Weather + clothes",
      lessons: 6,
      color: "bg-teal-50 border-teal-200"
    },
    {
      id: "unit9",
      title: "Unit 9 — Fun time!",
      description: "Хобби, свободное время, частотность",
      vocabulary: "Хобби, свободное время",
      grammar: "Present Continuous, наречия частотности",
      lessons: 6,
      color: "bg-indigo-50 border-indigo-200"
    },
    {
      id: "unit10",
      title: "Unit 10 — At the funfair",
      description: "Парк развлечений, аттракционы, эмоции",
      vocabulary: "Аттракционы, прилагательные эмоций",
      grammar: "Предлоги движения",
      lessons: 7,
      color: "bg-cyan-50 border-cyan-200"
    },
    {
      id: "unit11",
      title: "Unit 11 — Our house",
      description: "Дом, комнаты, мебель",
      vocabulary: "Комнаты, мебель, предметы дома",
      grammar: "There is/are (повторение), предлоги места",
      lessons: 7,
      color: "bg-emerald-50 border-emerald-200"
    },
    {
      id: "unit12",
      title: "Unit 12 — Party time!",
      description: "Праздники, приглашения, итоговые проекты",
      vocabulary: "Праздники, порядковые числительные",
      grammar: "Вежливые просьбы, повторение всего курса",
      lessons: 6,
      color: "bg-rose-50 border-rose-200"
    }
  ];

  const materials = [
    { name: "Pupil's Book", icon: BookOpen, description: "Основной учебник" },
    { name: "Activity Book", icon: FileText, description: "Рабочая тетрадь" },
    { name: "Teacher's Book", icon: Users, description: "Книга учителя" },
    { name: "Audio/Songs", icon: Music, description: "Аудиоматериалы" },
    { name: "Stories/Video", icon: Video, description: "Видеоистории" },
    { name: "Interactive Games", icon: Gamepad2, description: "KB1 интерактивы" }
  ];

  const assessmentTypes = [
    { name: "Тесты", icon: CheckCircle, description: "После юнитов 1, 4, 8, 12" },
    { name: "Чек-листы", icon: Target, description: "What I can do" },
    { name: "Проекты", icon: Award, description: "Постеры и презентации" },
    { name: "Результаты", icon: Users, description: "Отчёты по группе" }
  ];

  return (
    <>
      <SEOHead 
        title="Kid's Box 1 — страница преподавателя | O'KEY ENGLISH"
        description="Полный план курса Kid's Box 1 на 80 уроков для преподавателей: поминутная разбивка, материалы, интерактивы, календарь и методические рекомендации."
        keywords="Kid's Box 1, план урока, преподаватель, Cambridge English, методика, поминутка"
      />
      
      <div className="min-h-screen bg-background">
        {/* Header */}
        <section className="bg-gradient-subtle py-12">
          <div className="container mx-auto px-4">
            <div className="text-center mb-8">
              <Badge variant="secondary" className="mb-4">
                <BookOpen className="w-4 h-4 mr-1" />
                80 уроков • 40 недель
              </Badge>
              <h1 className="text-4xl lg:text-5xl font-bold mb-4">
                <span className="text-gradient">Kid's Box 1</span><br />
                Страница преподавателя
              </h1>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                Полный преподавательский комплект: план на 80 занятий, материалы, интерактивы, тесты
              </p>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <Button variant="hero" size="lg" className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                Открыть план-80 (PDF)
              </Button>
              <Button variant="outline" size="lg" className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5" />
                Открыть Google Drive
              </Button>
              <Button variant="outline" size="lg" className="flex items-center gap-2">
                <ExternalLink className="w-5 h-5" />
                KB1 интерактивы
              </Button>
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 py-12">
          <Tabs defaultValue="schedule" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="schedule">Календарь</TabsTrigger>
              <TabsTrigger value="lessons">Детальные уроки</TabsTrigger>
              <TabsTrigger value="template">Шаблон урока</TabsTrigger>
              <TabsTrigger value="units">Юниты</TabsTrigger>
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
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary">Старт</Badge>
                        <span className="text-lg font-medium">1 сентября 2025</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary">Интенсивность</Badge>
                        <span className="text-lg font-medium">2 раза в неделю</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary">Перерыв</Badge>
                        <span className="text-lg font-medium">1–10 января 2026</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary">Всего</Badge>
                        <span className="text-lg font-medium">80 уроков (~40 недель)</span>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="font-semibold text-lg">Праздничные уроки:</h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Halloween</Badge>
                          <span>Урок 23 (17 ноября)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Christmas</Badge>
                          <span>Урок 35 (29 декабря)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 p-4 bg-muted rounded-lg">
                    <Button variant="outline" className="w-full md:w-auto">
                      <Download className="w-4 h-4 mr-2" />
                      Скачать подробный план с датами
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Детальные уроки */}
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

            {/* Юниты */}
            <TabsContent value="units">
              <div className="space-y-4">
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

            {/* Материалы урока */}
            <TabsContent value="materials">
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
                    {assessmentTypes.map((type, index) => (
                      <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer">
                        <CardContent className="p-6 text-center">
                          <type.icon className="w-12 h-12 mx-auto mb-4 text-primary" />
                          <h4 className="font-medium mb-2">{type.name}</h4>
                          <p className="text-sm text-muted-foreground">{type.description}</p>
                        </CardContent>
                      </Card>
                    ))}
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

          {/* Инструкция */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Как пользоваться</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold">1</div>
                  <p className="text-sm">Откройте План-80 (PDF)</p>
                </div>
                <div className="text-center">
                  <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold">2</div>
                  <p className="text-sm">Найдите сегодняшнюю дату</p>
                </div>
                <div className="text-center">
                  <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold">3</div>
                  <p className="text-sm">Откройте нужные материалы</p>
                </div>
                <div className="text-center">
                  <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold">4</div>
                  <p className="text-sm">Запустите интерактивы KB1</p>
                </div>
                <div className="text-center">
                  <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold">5</div>
                  <p className="text-sm">Отметьте посещаемость</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Модальное окно детального урока */}
        <Dialog open={selectedLesson !== null} onOpenChange={() => setSelectedLesson(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            {selectedLesson && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    Урок {selectedLesson}: {getLessonInfo(selectedLesson)?.title}
                  </DialogTitle>
                  <DialogDescription>
                    {getLessonInfo(selectedLesson)?.unit} • {getLessonInfo(selectedLesson)?.date}
                  </DialogDescription>
                </DialogHeader>
                
                {(() => {
                  const lesson = getLessonInfo(selectedLesson);
                  if (!lesson) return null;
                  
                  return (
                    <div className="space-y-6">
                      {/* Цели урока */}
                      <div>
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <Target className="w-4 h-4" />
                          Цели урока:
                        </h4>
                        <ul className="list-disc list-inside space-y-1">
                          {lesson.goals.map((goal, index) => (
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
                          {lesson.materials.map((material, index) => (
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
                          {Object.entries(lesson.structure).map(([timeRange, activity]) => (
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
                        <p className="text-sm">{lesson.homework}</p>
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
                  );
                })()}
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}

// Экспортируем данные и функцию для использования в других компонентах
export { lessonDetails };

export const getLessonInfoByNumber = (lessonNumber: number) => {
  return lessonDetails[lessonNumber as keyof typeof lessonDetails] || null;
};