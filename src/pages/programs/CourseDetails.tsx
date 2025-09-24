import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { 
  BookOpen, 
  Download, 
  FolderOpen, 
  Play, 
  Clock, 
  Users, 
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
  Home,
  Brain,
  Zap,
  Star,
  Trophy,
  RotateCcw,
  Volume2
} from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { InlineCourseMaterials } from "@/components/student/InlineCourseMaterials";

// Интерфейсы
interface LessonDetail {
  number: number;
  title: string;
  topics: string[];
  vocabulary: string[];
  grammar: string | string[];
  activities: string[];
  materials: string[];
}

interface Unit {
  id: number;
  title: string;
  description: string;
  color: string;
  lessons: number;
  vocabulary: string;
  grammar: string;
  lessonDetails?: LessonDetail[];
}

// Список всех курсов
const courses = [
  { id: "super-safari-1", name: "Super Safari 1" },
  { id: "super-safari-2", name: "Super Safari 2" },
  { id: "super-safari-3", name: "Super Safari 3" },
  { id: "kids-box-starter", name: "Kid's Box Starter" },
  { id: "kids-box-1", name: "Kid's Box 1" },
  { id: "kids-box-2", name: "Kid's Box 2" },
  { id: "kids-box-3-4", name: "Kid's Box 3+4" },
  { id: "kids-box-5", name: "Kid's Box 5" },
  { id: "kids-box-6", name: "Kid's Box 6" },
  { id: "prepare-1", name: "Prepare 1" },
  { id: "prepare-2", name: "Prepare 2" },
  { id: "prepare-3", name: "Prepare 3" },
  { id: "prepare-4", name: "Prepare 4" },
  { id: "prepare-5", name: "Prepare 5" },
  { id: "prepare-6", name: "Prepare 6" },
  { id: "prepare-7", name: "Prepare 7" },
  { id: "empower-1", name: "Empower 1" },
  { id: "empower-2", name: "Empower 2" },
  { id: "empower-3", name: "Empower 3" },
  { id: "empower-4", name: "Empower 4" },
  { id: "empower-5", name: "Empower 5" },
  { id: "empower-6", name: "Empower 6" }
];

// Данные по курсам
const courseData: Record<string, {
  title: string;
  description: string;
  units: Unit[];
  materials: any[];
}> = {
  "kids-box-1": {
    title: "Kid's Box 1",
    description: "Английский для детей 6-8 лет",
    units: [
      {
        id: 1,
        title: "Unit 1 — Hello!",
        description: "Знакомство с семьей Star, приветствия, предлоги места",
        color: "bg-blue-50 border-blue-200",
        lessons: 7,
        vocabulary: "Семья, числа, цвета, предлоги in/on/under",
        grammar: "What's your name? How old are you? Where is…?",
        lessonDetails: [
          {
            number: 1,
            title: "Meet Star family",
            topics: ["Знакомство с семьей Star", "Приветствие"],
            vocabulary: ["mum", "dad", "sister", "brother"],
            grammar: "What's your name?",
            activities: ["Песня Hello", "Игра с именами", "Раскрашивание семьи"],
            materials: ["AB p.4", "CB p.4-5", "Audio CD1 Track 1-3"]
          },
          {
            number: 2,
            title: "Numbers and colours",
            topics: ["Числа 1-6", "Основные цвета"],
            vocabulary: ["one", "two", "three", "red", "blue", "yellow"],
            grammar: "How old are you?",
            activities: ["Счёт до 6", "Цветная игра", "Песня Numbers"],
            materials: ["AB p.5", "CB p.6-7", "Audio CD1 Track 4-6"]
          },
          {
            number: 3,
            title: "In the house",
            topics: ["Предметы в доме", "Предлоги места"],
            vocabulary: ["house", "bed", "table", "chair", "in", "on", "under"],
            grammar: "Where is...?",
            activities: ["Поиск предметов", "Игра Hide and seek", "Описание комнаты"],
            materials: ["AB p.6", "CB p.8-9", "Audio CD1 Track 7-9"]
          },
          {
            number: 4,
            title: "At the park",
            topics: ["Игра в парке", "Действия"],
            vocabulary: ["park", "swing", "slide", "ball", "run", "jump"],
            grammar: "I can...",
            activities: ["Ролевая игра в парке", "Физминутка", "Описание действий"],
            materials: ["AB p.7", "CB p.10-11", "Audio CD1 Track 10-12"]
          },
          {
            number: 5,
            title: "Story time",
            topics: ["Сказка о Star", "Повторение лексики"],
            vocabulary: ["Повторение всех слов юнита"],
            grammar: "Повторение всех структур",
            activities: ["Чтение сказки", "Пересказ", "Театрализация"],
            materials: ["AB p.8", "CB p.12-13", "Audio CD1 Track 13-15"]
          },
          {
            number: 6,
            title: "Fun time",
            topics: ["Игры и развлечения", "Творческие задания"],
            vocabulary: ["Повторение и закрепление"],
            grammar: "Повторение и закрепление",
            activities: ["Проектная работа", "Игры с карточками", "Мини-спектакль"],
            materials: ["AB p.9", "CB p.14-15", "Карточки, материалы для поделок"]
          },
          {
            number: 7,
            title: "Review and test",
            topics: ["Повторение юнита", "Проверка знаний"],
            vocabulary: ["Все слова юнита"],
            grammar: ["Все структуры юнита"],
            activities: ["Тестирование", "Игровое повторение", "Портфолио"],
            materials: ["AB p.10", "CB p.16", "Тестовые материалы"]
          }
        ]
      },
      {
        id: 2,
        title: "Unit 2 — My school",
        description: "Школьные предметы, числа 11-20, дни недели",
        color: "bg-green-50 border-green-200", 
        lessons: 7,
        vocabulary: "Школьные предметы, числа 11-20, дни недели",
        grammar: "This is a... I have got... What day is it?",
        lessonDetails: [
          {
            number: 8,
            title: "School subjects",
            topics: ["Школьные предметы", "Школьные принадлежности"],
            vocabulary: ["Maths", "English", "Art", "book", "pen", "pencil"],
            grammar: "This is a...",
            activities: ["Экскурсия по школе", "Игра School bag", "Расписание"],
            materials: ["AB p.11", "CB p.18-19", "Audio CD1 Track 16-18"]
          },
          {
            number: 9,
            title: "Numbers 11-20",
            topics: ["Числа от 11 до 20", "Счёт предметов"],
            vocabulary: ["eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"],
            grammar: "How many...?",
            activities: ["Счётные игры", "Математические задачи", "Песня Numbers"],
            materials: ["AB p.12", "CB p.20-21", "Audio CD1 Track 19-21"]
          },
          {
            number: 10,
            title: "Days of the week",
            topics: ["Дни недели", "Школьное расписание"],
            vocabulary: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
            grammar: "What day is it?",
            activities: ["Календарь класса", "Игра Week circle", "Мой день"],
            materials: ["AB p.13", "CB p.22-23", "Audio CD1 Track 22-24"]
          },
          {
            number: 11,
            title: "I have got",
            topics: ["Мои школьные вещи", "Описание владения"],
            vocabulary: ["ruler", "rubber", "crayon", "scissors", "glue"],
            grammar: "I have got... / I haven't got...",
            activities: ["Описание рюкзака", "Игра Have you got?", "Школьный магазин"],
            materials: ["AB p.14", "CB p.24-25", "Audio CD1 Track 25-27"]
          },
          {
            number: 12,
            title: "School story",
            topics: ["Сказка о школе", "Школьные приключения"],
            vocabulary: ["Повторение всех слов юнита"],
            grammar: "Повторение всех структур",
            activities: ["Чтение сказки", "Ролевая игра", "Школьный театр"],
            materials: ["AB p.15", "CB p.26-27", "Audio CD1 Track 28-30"]
          },
          {
            number: 13,
            title: "Project time",
            topics: ["Моя школа", "Творческий проект"],
            vocabulary: ["Повторение и использование в проекте"],
            grammar: "Повторение и использование в проекте",
            activities: ["Создание школы мечты", "Презентация проекта", "Выставка работ"],
            materials: ["AB p.16", "CB p.28-29", "Материалы для проекта"]
          },
          {
            number: 14,
            title: "Unit 2 review",
            topics: ["Повторение юнита 2", "Проверка прогресса"],
            vocabulary: ["Все слова юнита 2"],
            grammar: ["Все структуры юнита 2"],
            activities: ["Комплексный тест", "Игровое повторение", "Самооценка"],
            materials: ["AB p.17", "CB p.30", "Тестовые материалы"]
          }
        ]
      },
      {
        id: 3,
        title: "Unit 3 — Favourite toys",
        description: "Игрушки, предпочтения, описания",
        color: "bg-purple-50 border-purple-200",
        lessons: 7,
        vocabulary: "Игрушки, цвета, прилагательные big/small",
        grammar: "I like/don't like, притяжательные прилагательные",
        lessonDetails: [
          {
            number: 15,
            title: "Toys introduction",
            topics: ["Введение игрушек", "Любимые игрушки"],
            vocabulary: ["toy", "doll", "car", "ball", "teddy bear", "kite"],
            grammar: "This is my...",
            activities: ["Показ игрушек", "Описание игрушки", "Песня My toys"],
            materials: ["AB p.18", "CB p.32-33", "Audio CD2 Track 1-3"]
          },
          {
            number: 16,
            title: "Big and small",
            topics: ["Размеры игрушек", "Сравнения"],
            vocabulary: ["big", "small", "old", "new"],
            grammar: "It's big/small",
            activities: ["Сравнение игрушек", "Игра Opposites", "Описание размеров"],
            materials: ["AB p.19", "CB p.34-35", "Audio CD2 Track 4-6"]
          },
          {
            number: 17,
            title: "I like toys",
            topics: ["Предпочтения", "Выражение мнения"],
            vocabulary: ["like", "don't like", "love", "favourite"],
            grammar: "I like... / I don't like...",
            activities: ["Опрос о игрушках", "Моя любимая игрушка", "Голосование"],
            materials: ["AB p.20", "CB p.36-37", "Audio CD2 Track 7-9"]
          },
          {
            number: 18,
            title: "Colours and toys",
            topics: ["Цвета игрушек", "Описание"],
            vocabulary: ["pink", "purple", "orange", "brown", "black", "white"],
            grammar: "What colour is...?",
            activities: ["Цветные игрушки", "Радуга игрушек", "Угадай цвет"],
            materials: ["AB p.21", "CB p.38-39", "Audio CD2 Track 10-12"]
          },
          {
            number: 19,
            title: "Toy shop story",
            topics: ["Сказка о магазине игрушек"],
            vocabulary: ["Повторение всех слов юнита"],
            grammar: "Повторение всех структур",
            activities: ["Чтение сказки", "Ролевая игра Магазин", "Покупка игрушек"],
            materials: ["AB p.22", "CB p.40-41", "Audio CD2 Track 13-15"]
          },
          {
            number: 20,
            title: "My toy collection",
            topics: ["Коллекция игрушек", "Проект"],
            vocabulary: ["Повторение и закрепление"],
            grammar: "Повторение и закрепление",
            activities: ["Выставка игрушек", "Презентация коллекции", "Игрушка мечты"],
            materials: ["AB p.23", "CB p.42-43", "Материалы для проекта"]
          },
          {
            number: 21,
            title: "Unit 3 review",
            topics: ["Повторение юнита 3"],
            vocabulary: ["Все слова юнита 3"],
            grammar: ["Все структуры юнита 3"],
            activities: ["Тестирование", "Игровое повторение", "Портфолио игрушек"],
            materials: ["AB p.24", "CB p.44", "Тестовые материалы"]
          }
        ]
      },
      {
        id: 4,
        title: "Unit 4 — My family",
        description: "Семья, профессии, дни рождения",
        color: "bg-red-50 border-red-200",
        lessons: 7,
        vocabulary: "Члены семьи, профессии, месяцы",
        grammar: "Притяжательный 's, When's your birthday?",
        lessonDetails: [
          {
            number: 22,
            title: "Family members",
            topics: ["Члены семьи", "Семейные роли"],
            vocabulary: ["grandfather", "grandmother", "uncle", "aunt", "cousin"],
            grammar: "This is my father's...",
            activities: ["Семейное дерево", "Рассказ о семье", "Семейные фото"],
            materials: ["AB p.25", "CB p.46-47", "Audio CD2 Track 15-17"]
          },
          {
            number: 23,
            title: "Jobs and professions",
            topics: ["Профессии", "Работа родителей"],
            vocabulary: ["doctor", "teacher", "driver", "cook", "farmer"],
            grammar: "My dad is a...",
            activities: ["Профессии родителей", "Игра Угадай профессию", "Кем я хочу стать"],
            materials: ["AB p.26", "CB p.48-49", "Audio CD2 Track 18-20"]
          },
          {
            number: 24,
            title: "Birthdays",
            topics: ["Дни рождения", "Месяцы года"],
            vocabulary: ["January", "February", "March", "April", "May", "June"],
            grammar: "When's your birthday?",
            activities: ["Календарь дней рождения", "Поздравления", "Праздник"],
            materials: ["AB p.27", "CB p.50-51", "Audio CD3 Track 1-3"]
          },
          {
            number: 25,
            title: "More months",
            topics: ["Остальные месяцы", "Времена года"],
            vocabulary: ["July", "August", "September", "October", "November", "December"],
            grammar: "My birthday is in...",
            activities: ["Месяцы и погода", "Времена года", "Мой любимый месяц"],
            materials: ["AB p.28", "CB p.52-53", "Audio CD3 Track 4-6"]
          },
          {
            number: 26,
            title: "Family story",
            topics: ["Семейная история"],
            vocabulary: ["Повторение всех слов юнита"],
            grammar: "Повторение всех структур",
            activities: ["Семейная сказка", "Семейный театр", "Наша семья"],
            materials: ["AB p.29", "CB p.54-55", "Audio CD3 Track 7-9"]
          },
          {
            number: 27,
            title: "Family project",
            topics: ["Семейный проект"],
            vocabulary: ["Повторение и использование в проекте"],
            grammar: "Повторение и использование в проекте",
            activities: ["Семейная книга", "Презентация семьи", "Семейные традиции"],
            materials: ["AB p.30", "CB p.56-57", "Материалы для проекта"]
          },
          {
            number: 28,
            title: "Unit 4 review",
            topics: ["Повторение юнита 4"],
            vocabulary: ["Все слова юнита 4"],
            grammar: ["Все структуры юнита 4"],
            activities: ["Комплексный тест", "Семейная викторина", "Самооценка"],
            materials: ["AB p.31", "CB p.58", "Тестовые материалы"]
          }
        ]
      },
      {
        id: 5,
        title: "Unit 5 — Our pet",
        description: "Питомцы, уход, еда для животных",
        color: "bg-yellow-50 border-yellow-200",
        lessons: 7,
        vocabulary: "Животные, еда, прилагательные описания",
        grammar: "Have got/has got",
        lessonDetails: [
          {
            number: 29,
            title: "Pet animals",
            topics: ["Домашние животные", "Уход за питомцами"],
            vocabulary: ["pet", "hamster", "rabbit", "guinea pig", "food", "water"],
            grammar: "I have got a pet",
            activities: ["Мой питомец", "Уход за животными", "Ветеринар"],
            materials: ["AB p.32", "CB p.60-61", "Audio CD3 Track 10-12"]
          },
          {
            number: 30,
            title: "Pet food",
            topics: ["Еда для животных", "Что едят питомцы"],
            vocabulary: ["meat", "fish", "carrots", "seeds", "milk", "bones"],
            grammar: "My pet eats...",
            activities: ["Кормление питомцев", "Меню для животных", "Магазин для животных"],
            materials: ["AB p.33", "CB p.62-63", "Audio CD3 Track 13-15"]
          },
          {
            number: 31,
            title: "Has got pets",
            topics: ["У кого какие питомцы", "Описание животных"],
            vocabulary: ["has got", "hasn't got", "tail", "fur", "paws"],
            grammar: "He/She has got...",
            activities: ["Описание питомцев друзей", "Угадай питомца", "Животные соседи"],
            materials: ["AB p.34", "CB p.64-65", "Audio CD3 Track 16-18"]
          },
          {
            number: 32,
            title: "Pet care",
            topics: ["Забота о питомцах", "Ответственность"],
            vocabulary: ["wash", "brush", "walk", "play", "clean", "love"],
            grammar: "I can... my pet",
            activities: ["Уход за питомцем", "Расписание ухода", "Ответственный хозяин"],
            materials: ["AB p.35", "CB p.66-67", "Audio CD4 Track 1-3"]
          },
          {
            number: 33,
            title: "Pet story",
            topics: ["История о питомце"],
            vocabulary: ["Повторение всех слов юнита"],
            grammar: "Повторение всех структур",
            activities: ["Сказка о питомце", "Приключения животных", "Дружба с животными"],
            materials: ["AB p.36", "CB p.68-69", "Audio CD4 Track 4-6"]
          },
          {
            number: 34,
            title: "Pet show project",
            topics: ["Выставка питомцев", "Проект"],
            vocabulary: ["Повторение и закрепление"],
            grammar: "Повторение и закрепление",
            activities: ["Выставка животных", "Конкурс красоты", "Идеальный питомец"],
            materials: ["AB p.37", "CB p.70-71", "Материалы для проекта"]
          },
          {
            number: 35,
            title: "Unit 5 review",
            topics: ["Повторение юнита 5"],
            vocabulary: ["Все слова юнита 5"],
            grammar: ["Все структуры юнита 5"],
            activities: ["Тестирование", "Викторина о животных", "Портфолио питомцев"],
            materials: ["AB p.38", "CB p.72", "Тестовые материалы"]
          }
        ]
      },
      {
        id: 6,
        title: "Unit 6 — My face",
        description: "Части тела, внешность, описания людей",
        color: "bg-pink-50 border-pink-200",
        lessons: 6,
        vocabulary: "Части лица, прилагательные внешности",
        grammar: "Have got (внешность), описания",
        lessonDetails: [
          {
            number: 36,
            title: "Parts of face",
            topics: ["Части лица", "Описание внешности"],
            vocabulary: ["eyes", "nose", "mouth", "ears", "hair", "big", "small"],
            grammar: "I have got... eyes",
            activities: ["Портрет друга", "Игра Guess who", "Описание внешности"],
            materials: ["AB p.39", "CB p.74-75", "Audio CD4 Track 7-9"]
          },
          {
            number: 37,
            title: "Hair and eyes",
            topics: ["Волосы и глаза", "Цвета"],
            vocabulary: ["blonde", "brown", "black", "blue eyes", "green eyes"],
            grammar: "She has got... hair",
            activities: ["Описание внешности семьи", "Цвета волос и глаз", "Мой портрет"],
            materials: ["AB p.40", "CB p.76-77", "Audio CD4 Track 10-12"]
          },
          {
            number: 38,
            title: "Feelings and faces",
            topics: ["Эмоции", "Выражения лица"],
            vocabulary: ["happy", "sad", "angry", "tired", "hungry"],
            grammar: "I am... / He is...",
            activities: ["Эмоции на лице", "Театр эмоций", "Угадай чувство"],
            materials: ["AB p.41", "CB p.78-79", "Audio CD4 Track 13-15"]
          },
          {
            number: 39,
            title: "Face story",
            topics: ["История о лице"],
            vocabulary: ["Повторение всех слов юнита"],
            grammar: "Повторение всех структур",
            activities: ["Сказка о внешности", "Волшебные превращения", "Красота внутри"],
            materials: ["AB p.42", "CB p.80-81", "Audio CD4 Track 16-18"]
          },
          {
            number: 40,
            title: "Self-portrait project",
            topics: ["Автопортрет", "Творческий проект"],
            vocabulary: ["Повторение и использование в проекте"],
            grammar: "Повторение и использование в проекте",
            activities: ["Мой автопортрет", "Галерея портретов", "Описание себя"],
            materials: ["AB p.43", "CB p.82-83", "Материалы для рисования"]
          },
          {
            number: 41,
            title: "Unit 6 review",
            topics: ["Повторение юнита 6", "Итоговая проверка"],
            vocabulary: ["Все слова юнита 6"],
            grammar: ["Все структуры юнита 6"],
            activities: ["Финальный тест", "Описание внешности", "Годовое портфолио"],
            materials: ["AB p.44", "CB p.84", "Тестовые материалы"]
          }
        ]
      },
      {
        id: 7,
        title: "Unit 7 — Wild animals",
        description: "Дикие животные, их способности и места обитания",
        color: "bg-green-50 border-green-200",
        lessons: 7,
        vocabulary: "Дикие животные, части тела животных, места обитания",
        grammar: "can/cannot (abilities), there is/are (basic)",
        lessonDetails: [
          {
            number: 42,
            title: "Zoo animals vocabulary",
            topics: ["Животные зоопарка", "Названия диких животных"],
            vocabulary: ["elephant", "lion", "monkey", "giraffe", "tiger", "bear"],
            grammar: "What animal is this?",
            activities: ["Экскурсия в зоопарк", "Звуки животных", "Угадай животное"],
            materials: ["AB p.45", "CB p.86-87", "Audio CD5 Track 1-3"]
          },
          {
            number: 43,
            title: "Animal body parts",
            topics: ["Части тела животных", "Описание животных"],
            vocabulary: ["trunk", "mane", "tail", "paws", "wings", "beak"],
            grammar: "The elephant has got a trunk",
            activities: ["Описание животных", "Собери животное", "Части тела"],
            materials: ["AB p.46", "CB p.88-89", "Audio CD5 Track 4-6"]
          },
          {
            number: 44,
            title: "Animal abilities",
            topics: ["Способности животных", "Что умеют животные"],
            vocabulary: ["fly", "swim", "run", "jump", "climb", "walk"],
            grammar: "Birds can fly / Fish cannot walk",
            activities: ["Что умеют животные", "Игра Can/Cannot", "Спортивные животные"],
            materials: ["AB p.47", "CB p.90-91", "Audio CD5 Track 7-9"]
          },
          {
            number: 45,
            title: "Animal habitats",
            topics: ["Места обитания", "Где живут животные"],
            vocabulary: ["jungle", "desert", "ocean", "forest", "savanna", "mountains"],
            grammar: "Lions live in the savanna",
            activities: ["Карта мира животных", "Дом для животного", "Путешествие по континентам"],
            materials: ["AB p.48", "CB p.92-93", "Audio CD5 Track 10-12"]
          },
          {
            number: 46,
            title: "Animal adventure story",
            topics: ["Приключения животных", "Сказка о диких животных"],
            vocabulary: ["Повторение всех слов юнита"],
            grammar: "Повторение всех структур",
            activities: ["Сказка джунглей", "Театр животных", "Спасение животных"],
            materials: ["AB p.49", "CB p.94-95", "Audio CD5 Track 13-15"]
          },
          {
            number: 47,
            title: "Animal masks project",
            topics: ["Маски животных", "Творческий проект"],
            vocabulary: ["Повторение и закрепление"],
            grammar: "Повторение и закрепление",
            activities: ["Изготовление масок", "Спектакль животных", "Парад зверей"],
            materials: ["AB p.50", "CB p.96-97", "Материалы для масок"]
          },
          {
            number: 48,
            title: "Unit 7 review",
            topics: ["Повторение юнита 7", "Проверка знаний о животных"],
            vocabulary: ["Все слова юнита 7"],
            grammar: ["Все структуры юнита 7"],
            activities: ["Тест о животных", "Викторина зоопарк", "Портфолио животных"],
            materials: ["AB p.51", "CB p.98", "Тестовые материалы"]
          }
        ]
      },
      {
        id: 8,
        title: "Unit 8 — My clothes",
        description: "Одежда, цвета, погода и сезоны",
        color: "bg-indigo-50 border-indigo-200",
        lessons: 6,
        vocabulary: "Одежда, цвета, погода",
        grammar: "like/do not like, I am wearing, погода и одежда",
        lessonDetails: [
          {
            number: 49,
            title: "Clothes and colours",
            topics: ["Одежда", "Цвета одежды"],
            vocabulary: ["shirt", "trousers", "dress", "shoes", "hat", "coat"],
            grammar: "I am wearing a red shirt",
            activities: ["Модный показ", "Одень куклу", "Мой гардероб"],
            materials: ["AB p.52", "CB p.100-101", "Audio CD6 Track 1-3"]
          },
          {
            number: 50,
            title: "Likes and dislikes",
            topics: ["Предпочтения в одежде", "Любимая одежда"],
            vocabulary: ["like", "do not like", "favourite", "beautiful", "ugly"],
            grammar: "I like dresses / I do not like hats",
            activities: ["Опрос класса", "Модный журнал", "Стилист"],
            materials: ["AB p.53", "CB p.102-103", "Audio CD6 Track 4-6"]
          },
          {
            number: 51,
            title: "Weather and seasons",
            topics: ["Погода", "Сезонная одежда"],
            vocabulary: ["sunny", "rainy", "cold", "hot", "winter", "summer"],
            grammar: "In winter I wear a coat",
            activities: ["Прогноз погоды", "Одежда по сезонам", "Календарь одежды"],
            materials: ["AB p.54", "CB p.104-105", "Audio CD6 Track 7-9"]
          },
          {
            number: 52,
            title: "Lost clothes story",
            topics: ["История потерянной одежды"],
            vocabulary: ["Повторение всех слов юнита"],
            grammar: "Повторение всех структур",
            activities: ["Сказка о одежде", "Поиск потерянного", "Бюро находок"],
            materials: ["AB p.55", "CB p.106-107", "Audio CD6 Track 10-12"]
          },
          {
            number: 53,
            title: "Fashion show project",
            topics: ["Модный показ", "Дефиле"],
            vocabulary: ["Повторение и использование в показе"],
            grammar: "Повторение и использование в показе"],
            activities: ["Подготовка показа", "Дефиле", "Модные комментарии"],
            materials: ["AB p.56", "CB p.108-109", "Костюмы и аксессуары"]
          },
          {
            number: 54,
            title: "Unit 8 review",
            topics: ["Повторение юнита 8"],
            vocabulary: ["Все слова юнита 8"],
            grammar: ["Все структуры юнита 8"],
            activities: ["Тест по одежде", "Модная викторина", "Стильное портфолио"],
            materials: ["AB p.57", "CB p.110", "Тестовые материалы"]
          }
        ]
      },
      {
        id: 9,
        title: "Unit 9 — Fun time!",
        description: "Развлечения, хобби и свободное время",
        color: "bg-cyan-50 border-cyan-200",
        lessons: 6,
        vocabulary: "Хобби, развлечения, частотные наречия",
        grammar: "Present Continuous (I am ...ing), adverbs of frequency",
        lessonDetails: [
          {
            number: 55,
            title: "Hobbies and free time",
            topics: ["Хобби", "Свободное время"],
            vocabulary: ["swimming", "reading", "drawing", "playing", "dancing", "singing"],
            grammar: "I like swimming",
            activities: ["Мои хобби", "Клуб по интересам", "Свободное время"],
            materials: ["AB p.58", "CB p.112-113", "Audio CD6 Track 13-15"]
          },
          {
            number: 56,
            title: "Present Continuous",
            topics: ["Действия в данный момент", "Что происходит сейчас"],
            vocabulary: ["running", "jumping", "eating", "sleeping", "watching"],
            grammar: "I am running / She is dancing",
            activities: ["Что я делаю", "Mime game", "Фотографии действий"],
            materials: ["AB p.59", "CB p.114-115", "Audio CD7 Track 1-3"]
          },
          {
            number: 57,
            title: "How often?",
            topics: ["Как часто", "Частотные наречия"],
            vocabulary: ["always", "sometimes", "never", "often", "usually"],
            grammar: "I always brush my teeth",
            activities: ["Мой день", "Опрос частоты", "Расписание недели"],
            materials: ["AB p.60", "CB p.116-117", "Audio CD7 Track 4-6"]
          },
          {
            number: 58,
            title: "Fun day story",
            topics: ["День развлечений", "Веселая история"],
            vocabulary: ["Повторение всех слов юнита"],
            grammar: "Повторение всех структур",
            activities: ["Сказка о веселом дне", "Парк развлечений", "Лучший день"],
            materials: ["AB p.61", "CB p.118-119", "Audio CD7 Track 7-9"]
          },
          {
            number: 59,
            title: "Fun activities project",
            topics: ["Проект развлечений", "Планирование веселья"],
            vocabulary: ["Повторение и планирование"],
            grammar: "Повторение и планирование"],
            activities: ["План выходного дня", "Организация праздника", "Веселые игры"],
            materials: ["AB p.62", "CB p.120-121", "Материалы для игр"]
          },
          {
            number: 60,
            title: "Unit 9 review",
            topics: ["Повторение юнита 9"],
            vocabulary: ["Все слова юнита 9"],
            grammar: ["Все структуры юнита 9"],
            activities: ["Тест развлечений", "Викторина хобби", "Портфолио активностей"],
            materials: ["AB p.63", "CB p.122", "Тестовые материалы"]
          }
        ]
      },
      {
        id: 10,
        title: "Unit 10 — At the funfair",
        description: "Парк развлечений, аттракционы и эмоции",
        color: "bg-purple-50 border-purple-200",
        lessons: 7,
        vocabulary: "Аттракционы, движение, эмоции",
        grammar: "prepositions of movement, adjectives of feelings",
        lessonDetails: [
          {
            number: 61,
            title: "Funfair rides",
            topics: ["Аттракционы", "Парк развлечений"],
            vocabulary: ["carousel", "ferris wheel", "roller coaster", "bumper cars", "swing"],
            grammar: "Let us go on the carousel",
            activities: ["Виртуальная ярмарка", "Мой любимый аттракцион", "Билеты на ярмарку"],
            materials: ["AB p.64", "CB p.124-125", "Audio CD7 Track 10-12"]
          },
          {
            number: 62,
            title: "Moving around",
            topics: ["Движение", "Направления"],
            vocabulary: ["up", "down", "round", "fast", "slow", "through"],
            grammar: "The car goes up and down",
            activities: ["Движения тела", "Направления игра", "Быстро-медленно"],
            materials: ["AB p.65", "CB p.126-127", "Audio CD7 Track 13-15"]
          },
          {
            number: 63,
            title: "Feelings at the fair",
            topics: ["Эмоции", "Чувства на ярмарке"],
            vocabulary: ["excited", "scared", "happy", "surprised", "dizzy"],
            grammar: "I feel excited",
            activities: ["Эмоции на лице", "Театр чувств", "Мои эмоции"],
            materials: ["AB p.66", "CB p.128-129", "Audio CD8 Track 1-3"]
          },
          {
            number: 64,
            title: "Funfair adventure story",
            topics: ["Приключения на ярмарке"],
            vocabulary: ["Повторение всех слов юнита"],
            grammar: "Повторение всех структур"],
            activities: ["Сказка о ярмарке", "Потерялся на ярмарке", "Волшебная карусель"],
            materials: ["AB p.67", "CB p.130-131", "Audio CD8 Track 4-6"]
          },
          {
            number: 65,
            title: "Design a funfair",
            topics: ["Проектируем ярмарку", "Творческий проект"],
            vocabulary: ["Повторение и дизайн"],
            grammar: "Повторение и дизайн"],
            activities: ["Чертеж ярмарки", "Модель парка", "Презентация проекта"],
            materials: ["AB p.68", "CB p.132-133", "Материалы для модели"]
          },
          {
            number: 66,
            title: "Funfair board game",
            topics: ["Настольная игра", "Игровое повторение"],
            vocabulary: ["Повторение в игре"],
            grammar: "Повторение в игре"],
            activities: ["Настольная игра ярмарка", "Соревнование команд", "Игровой турнир"],
            materials: ["AB p.69", "CB p.134-135", "Игровые материалы"]
          },
          {
            number: 67,
            title: "Unit 10 review",
            topics: ["Повторение юнита 10"],
            vocabulary: ["Все слова юнита 10"],
            grammar: ["Все структуры юнита 10"],
            activities: ["Тест ярмарки", "Викторина развлечений", "Портфолио эмоций"],
            materials: ["AB p.70", "CB p.136", "Тестовые материалы"]
          }
        ]
      },
      {
        id: 11,
        title: "Unit 11 — Our house",
        description: "Дом, комнаты, мебель и предметы интерьера",
        color: "bg-amber-50 border-amber-200",
        lessons: 7,
        vocabulary: "Комнаты, мебель, предлоги места",
        grammar: "there is/are (развитие), prepositions of place",
        lessonDetails: [
          {
            number: 68,
            title: "Rooms of the house",
            topics: ["Комнаты дома", "Части дома"],
            vocabulary: ["kitchen", "bedroom", "living room", "bathroom", "garden"],
            grammar: "There is a kitchen in my house",
            activities: ["Экскурсия по дому", "План дома", "Моя комната"],
            materials: ["AB p.71", "CB p.138-139", "Audio CD8 Track 7-9"]
          },
          {
            number: 69,
            title: "Furniture and objects",
            topics: ["Мебель", "Предметы интерьера"],
            vocabulary: ["table", "chair", "bed", "sofa", "lamp", "carpet"],
            grammar: "There is a bed in the bedroom",
            activities: ["Обставляем дом", "Магазин мебели", "Дизайнер интерьера"],
            materials: ["AB p.72", "CB p.140-141", "Audio CD8 Track 10-12"]
          },
          {
            number: 70,
            title: "Where is it?",
            topics: ["Расположение предметов", "Предлоги места"],
            vocabulary: ["next to", "behind", "in front of", "between", "near"],
            grammar: "The cat is under the table",
            activities: ["Поиск предметов", "Где моя игрушка", "Прятки в доме"],
            materials: ["AB p.73", "CB p.142-143", "Audio CD8 Track 13-15"]
          },
          {
            number: 71,
            title: "House party story",
            topics: ["Домашняя вечеринка", "Гости в доме"],
            vocabulary: ["Повторение всех слов юнита"],
            grammar: "Повторение всех структур"],
            activities: ["Сказка о вечеринке", "Приглашение гостей", "Праздник дома"],
            materials: ["AB p.74", "CB p.144-145", "Audio CD9 Track 1-3"]
          },
          {
            number: 72,
            title: "Dream house project",
            topics: ["Дом мечты", "Архитектурный проект"],
            vocabulary: ["Повторение и планирование"],
            grammar: "Повторение и планирование"],
            activities: ["Рисуем дом мечты", "Макет дома", "Презентация проекта"],
            materials: ["AB p.75", "CB p.146-147", "Материалы для макета"]
          },
          {
            number: 73,
            title: "House games",
            topics: ["Домашние игры", "Игровое повторение"],
            vocabulary: ["Повторение в играх"],
            grammar: "Повторение в играх"],
            activities: ["Лото Мой дом", "Домино комнаты", "Игра Архитектор"],
            materials: ["AB p.76", "CB p.148-149", "Игровые карточки"]
          },
          {
            number: 74,
            title: "Unit 11 review",
            topics: ["Повторение юнита 11"],
            vocabulary: ["Все слова юнита 11"],
            grammar: ["Все структуры юнита 11"],
            activities: ["Тест о доме", "Викторина интерьер", "Портфолио домов"],
            materials: ["AB p.77", "CB p.150", "Тестовые материалы"]
          }
        ]
      },
      {
        id: 12,
        title: "Unit 12 — Party time!",
        description: "Праздники, приглашения и вежливые просьбы",
        color: "bg-rose-50 border-rose-200",
        lessons: 6,
        vocabulary: "Праздники, дни недели, порядковые числительные",
        grammar: "polite requests & offers, Would you like, Can I",
        lessonDetails: [
          {
            number: 75,
            title: "Party vocabulary",
            topics: ["Словарь праздника", "Приглашения"],
            vocabulary: ["party", "cake", "balloons", "presents", "games", "friends"],
            grammar: "Would you like to come to my party?",
            activities: ["Планирование вечеринки", "Приглашения", "Украшения"],
            materials: ["AB p.78", "CB p.152-153", "Audio CD9 Track 4-6"]
          },
          {
            number: 76,
            title: "Days and dates",
            topics: ["Дни недели", "Порядковые числительные"],
            vocabulary: ["first", "second", "third", "fourth", "fifth", "birthday"],
            grammar: "My birthday is on the first of May",
            activities: ["Календарь дней рождения", "Важные даты", "Планировщик"],
            materials: ["AB p.79", "CB p.154-155", "Audio CD9 Track 7-9"]
          },
          {
            number: 77,
            title: "Polite requests",
            topics: ["Вежливые просьбы", "Этикет"],
            vocabulary: ["please", "thank you", "sorry", "excuse me"],
            grammar: "Can I have some cake, please?",
            activities: ["Вежливый разговор", "Этикет за столом", "Магия слов"],
            materials: ["AB p.80", "CB p.156-157", "Audio CD9 Track 10-12"]
          },
          {
            number: 78,
            title: "Birthday surprise story",
            topics: ["Сюрприз на день рождения"],
            vocabulary: ["Повторение всех слов юнита"],
            grammar: "Повторение всех структур"],
            activities: ["Сказка о сюрпризе", "Подготовка сюрприза", "Праздничная история"],
            materials: ["AB p.81", "CB p.158-159", "Audio CD9 Track 13-15"]
          },
          {
            number: 79,
            title: "Party preparation",
            topics: ["Подготовка к празднику", "Финальный проект"],
            vocabulary: ["Повторение и организация"],
            grammar: "Повторение и организация"],
            activities: ["Организация праздника", "Репетиция", "Праздничные роли"],
            materials: ["AB p.82", "CB p.160-161", "Праздничные материалы"]
          },
          {
            number: 80,
            title: "Final celebration",
            topics: ["Финальное празднование", "Итоги года"],
            vocabulary: ["Все изученные слова"],
            grammar: ["Все изученные структуры"],
            activities: ["Итоговый праздник", "Награждение", "Презентация достижений"],
            materials: ["AB p.83", "CB p.162", "Сертификаты и награды"]
          }
        ]
      }
    ],
    materials: [
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
    ]
  },
  // Данные для других курсов
  "super-safari-1": {
    title: "Super Safari 1",
    description: "Английский для самых маленьких 3-5 лет",
    units: [
      {
        id: 1,
        title: "Unit 1 — Hello, animals!",
        description: "Знакомство с животными",
        color: "bg-green-50 border-green-200",
        lessons: 6,
        vocabulary: "Животные: cat, dog, bird, fish",
        grammar: "Hello! What's this?",
        lessonDetails: [
          {
            number: 1,
            title: "Meet the animals",
            topics: ["Знакомство с животными", "Приветствие"],
            vocabulary: ["cat", "dog", "bird", "fish"],
            grammar: "Hello! What's this?",
            activities: ["Песня Hello animals", "Игра с животными", "Звуки животных"],
            materials: ["AB p.4", "CB p.4-5", "Audio CD1 Track 1-3"]
          },
          {
            number: 2,
            title: "Animal sounds",
            topics: ["Звуки животных", "Подражание"],
            vocabulary: ["meow", "woof", "tweet", "splash"],
            grammar: "The cat says meow",
            activities: ["Звуки животных", "Игра угадай животное", "Песня Animal sounds"],
            materials: ["AB p.5", "CB p.6-7", "Audio CD1 Track 4-6"]
          }
        ]
      },
      {
        id: 2,
        title: "Unit 2 — Colours",
        description: "Изучение цветов",
        color: "bg-red-50 border-red-200",
        lessons: 6,
        vocabulary: "Основные цвета",
        grammar: "It's red/blue/yellow",
        lessonDetails: [
          {
            number: 3,
            title: "Primary colours",
            topics: ["Основные цвета", "Красный, синий, жёлтый"],
            vocabulary: ["red", "blue", "yellow"],
            grammar: "It's red",
            activities: ["Цветная игра", "Рисование цветами", "Песня Colours"],
            materials: ["AB p.8", "CB p.10-11", "Audio CD1 Track 10-12"]
          }
        ]
      }
    ],
    materials: [
      {
        name: "Pupil's Book",
        description: "Основной учебник для малышей",
        icon: BookOpen
      },
      {
        name: "Activity Book", 
        description: "Рабочая тетрадь с наклейками",
        icon: FileText
      },
      {
        name: "Teacher's Book",
        description: "Методическое пособие", 
        icon: Users
      },
      {
        name: "Аудиоматериалы",
        description: "Песни и звуки для малышей",
        icon: Music
      },
      {
        name: "Видеоматериалы", 
        description: "Развивающие мультфильмы",
        icon: Video
      },
      {
        name: "SS1 Игры",
        description: "Интерактивные игры для малышей",
        icon: Gamepad2
      }
    ]
  },
  "super-safari-2": {
    title: "Super Safari 2",
    description: "Английский для детей 4-6 лет",
    units: [
      {
        id: 1,
        title: "Unit 1 — My toys",
        description: "Мои игрушки",
        color: "bg-purple-50 border-purple-200",
        lessons: 6,
        vocabulary: "Игрушки и цвета",
        grammar: "I like my...",
        lessonDetails: [
          {
            number: 1,
            title: "Favourite toys",
            topics: ["Любимые игрушки"],
            vocabulary: ["ball", "doll", "car", "teddy"],
            grammar: "I like my ball",
            activities: ["Показ игрушек", "Игра с мячом", "Песня My toys"],
            materials: ["AB p.4", "CB p.4-5", "Audio CD1 Track 1-3"]
          }
        ]
      }
    ],
    materials: [
      {
        name: "Pupil's Book",
        description: "Учебник Super Safari 2",
        icon: BookOpen
      },
      {
        name: "Activity Book",
        description: "Тетрадь с упражнениями",
        icon: FileText
      },
      {
        name: "SS2 Аудио",
        description: "Аудиоматериалы уровня 2",
        icon: Music
      }
    ]
  },
  "super-safari-3": {
    title: "Super Safari 3", 
    description: "Английский для детей 5-7 лет",
    units: [
      {
        id: 1,
        title: "Unit 1 — My family",
        description: "Моя семья",
        color: "bg-blue-50 border-blue-200",
        lessons: 6,
        vocabulary: "Члены семьи",
        grammar: "This is my...",
        lessonDetails: [
          {
            number: 1,
            title: "Family members",
            topics: ["Члены семьи"],
            vocabulary: ["mummy", "daddy", "brother", "sister"],
            grammar: "This is my mummy",
            activities: ["Семейные фото", "Рассказ о семье", "Песня My family"],
            materials: ["AB p.4", "CB p.4-5", "Audio CD1 Track 1-3"]
          }
        ]
      }
    ],
    materials: [
      {
        name: "Pupil's Book",
        description: "Учебник Super Safari 3",
        icon: BookOpen
      },
      {
        name: "Activity Book",
        description: "Активная тетрадь",
        icon: FileText
      },
      {
        name: "SS3 Мультимедиа",
        description: "Интерактивные материалы",
        icon: Video
      }
    ]
  },
  "kids-box-starter": {
    title: "Kid's Box Starter",
    description: "Стартовый уровень для детей 5-7 лет",
    units: [
      {
        id: 1,
        title: "Unit 1 — Hello!",
        description: "Первые слова на английском",
        color: "bg-green-50 border-green-200",
        lessons: 8,
        vocabulary: "Приветствие, имена, цифры 1-5",
        grammar: "Hello! What's your name?",
        lessonDetails: [
          {
            number: 1,
            title: "Hello and goodbye",
            topics: ["Приветствие и прощание"],
            vocabulary: ["hello", "goodbye", "yes", "no"],
            grammar: "Hello! Goodbye!",
            activities: ["Песня Hello", "Игра приветствие", "Жесты"],
            materials: ["AB p.4", "CB p.4-5", "Audio CD1 Track 1-3"]
          }
        ]
      }
    ],
    materials: [
      {
        name: "Pupil's Book",
        description: "Стартовый учебник",
        icon: BookOpen
      },
      {
        name: "Activity Book",
        description: "Первая рабочая тетрадь",
        icon: FileText
      },
      {
        name: "Starter Audio",
        description: "Аудио для начинающих",
        icon: Music
      }
    ]
  },
  "kids-box-2": {
    title: "Kid's Box 2",
    description: "Английский для детей 7-9 лет",
    units: [
      {
        id: 1,
        title: "Unit 1 — Back to school",
        description: "Возвращение в школу",
        color: "bg-orange-50 border-orange-200",
        lessons: 8,
        vocabulary: "Школьные предметы, расписание",
        grammar: "I go to school, Present Simple",
        lessonDetails: [
          {
            number: 1,
            title: "School subjects",
            topics: ["Школьные предметы"],
            vocabulary: ["Geography", "History", "Science", "PE"],
            grammar: "I like Geography",
            activities: ["Мое расписание", "Любимые предметы", "Школьная экскурсия"],
            materials: ["AB p.4", "CB p.4-5", "Audio CD1 Track 1-3"]
          }
        ]
      }
    ],
    materials: [
      {
        name: "Pupil's Book",
        description: "Учебник Kid's Box 2",
        icon: BookOpen
      },
      {
        name: "Activity Book",
        description: "Рабочая тетрадь уровня 2",
        icon: FileText
      },
      {
        name: "KB2 Интерактивы",
        description: "Цифровые ресурсы",
        icon: Gamepad2
      }
    ]
  },
  "prepare-1": {
    title: "Prepare 1",
    description: "Подготовка к экзаменам A1",
    units: [
      {
        id: 1,
        title: "Unit 1 — Family and friends",
        description: "Семья и друзья",
        color: "bg-blue-50 border-blue-200",
        lessons: 10,
        vocabulary: "Семья, друзья, внешность",
        grammar: "Present Simple, have got",
        lessonDetails: [
          {
            number: 1,
            title: "Meeting people",
            topics: ["Знакомство с людьми"],
            vocabulary: ["introduce", "meet", "friend", "classmate"],
            grammar: "Nice to meet you",
            activities: ["Ролевые диалоги", "Анкета о себе", "Интервью"],
            materials: ["SB p.6", "WB p.4", "Audio Track 1.01"]
          }
        ]
      }
    ],
    materials: [
      {
        name: "Student's Book",
        description: "Учебник Prepare 1",
        icon: BookOpen
      },
      {
        name: "Workbook",
        description: "Рабочая тетрадь с дополнительными упражнениями",
        icon: FileText
      },
      {
        name: "Teacher's Book",
        description: "Книга для учителя с методическими рекомендациями",
        icon: Users
      },
      {
        name: "Audio CD",
        description: "Аудиоматериалы к урокам",
        icon: Music
      },
      {
        name: "Video Resources",
        description: "Видеоматериалы и документальные фильмы",
        icon: Video
      }
    ]
  },
  "empower-1": {
    title: "Empower 1",
    description: "Курс для подростков A2",
    units: [
      {
        id: 1,
        title: "Unit 1 — Identity",
        description: "Личность и самоидентификация",
        color: "bg-indigo-50 border-indigo-200",
        lessons: 12,
        vocabulary: "Личность, характер, увлечения",
        grammar: "Present Simple, Present Continuous",
        lessonDetails: [
          {
            number: 1,
            title: "Who am I?",
            topics: ["Самопрезентация", "Личные качества"],
            vocabulary: ["personality", "creative", "confident", "ambitious"],
            grammar: "I am... / I like...",
            activities: ["Создание профиля", "Презентация о себе", "Опрос класса"],
            materials: ["SB p.8", "WB p.6", "Video Unit 1"]
          }
        ]
      }
    ],
    materials: [
      {
        name: "Student's Book",
        description: "Учебник Empower 1",
        icon: BookOpen
      },
      {
        name: "Workbook",
        description: "Рабочая тетрадь для самостоятельной работы",
        icon: FileText
      },
      {
        name: "Digital Resources",
        description: "Цифровые ресурсы и онлайн-платформа",
        icon: Video
      },
      {
        name: "Assessment Package",
        description: "Материалы для оценивания и тестирования",
        icon: Target
      }
    ]
  }
};

// Тренажёры для изучения слов
const trainers = [
  {
    id: "word-memory",
    title: "Запоминание слов",
    description: "Изучайте новые слова с помощью карточек",
    icon: Brain,
    color: "bg-blue-50 border-blue-200"
  },
  {
    id: "listening-game",
    title: "Игра на слух",
    description: "Слушайте и выбирайте правильный ответ",
    icon: Volume2,
    color: "bg-green-50 border-green-200"
  },
  {
    id: "word-builder",
    title: "Строитель слов",
    description: "Составляйте слова из букв",
    icon: Zap,
    color: "bg-purple-50 border-purple-200"
  },
  {
    id: "grammar-quiz",
    title: "Грамматический квиз",
    description: "Проверьте знание грамматики",
    icon: Target,
    color: "bg-orange-50 border-orange-200"
  }
];

// Компонент тренажёра для запоминания слов
const WordMemoryTrainer = () => {
  const [currentWord, setCurrentWord] = useState(0);
  const [showTranslation, setShowTranslation] = useState(false);
  const [score, setScore] = useState(0);

  const words = [
    { english: "cat", translation: "кот", image: "🐱" },
    { english: "dog", translation: "собака", image: "🐶" },
    { english: "bird", translation: "птица", image: "🐦" },
    { english: "fish", translation: "рыба", image: "🐟" },
    { english: "book", translation: "книга", image: "📚" },
    { english: "pen", translation: "ручка", image: "✏️" }
  ];

  const nextWord = () => {
    setCurrentWord((prev) => (prev + 1) % words.length);
    setShowTranslation(false);
    setScore(prev => prev + 1);
  };

  const showAnswer = () => {
    setShowTranslation(true);
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Запоминание слов
        </CardTitle>
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Слово {currentWord + 1} из {words.length}</span>
          <span>Очки: {score}</span>
        </div>
      </CardHeader>
      <CardContent className="text-center space-y-6">
        <div className="text-6xl mb-4">
          {words[currentWord].image}
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-primary">
            {words[currentWord].english}
          </h3>
          {showTranslation && (
            <p className="text-lg text-muted-foreground animate-in slide-in-from-bottom">
              {words[currentWord].translation}
            </p>
          )}
        </div>
        <div className="flex gap-2 justify-center">
          {!showTranslation ? (
            <Button onClick={showAnswer} variant="outline">
              Показать перевод
            </Button>
          ) : (
            <Button onClick={nextWord} className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Следующее слово
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Компонент игры на слух
const ListeningGame = () => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);

  const questions = [
    {
      audio: "cat",
      options: ["cat", "dog", "bird", "fish"],
      correct: "cat",
      image: "🐱"
    },
    {
      audio: "dog", 
      options: ["cat", "dog", "bird", "fish"],
      correct: "dog",
      image: "🐶"
    }
  ];

  const handleAnswer = (answer: string) => {
    setSelectedAnswer(answer);
    setShowResult(true);
    if (answer === questions[currentQuestion].correct) {
      setScore(prev => prev + 1);
    }
  };

  const nextQuestion = () => {
    setCurrentQuestion(prev => (prev + 1) % questions.length);
    setSelectedAnswer(null);
    setShowResult(false);
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="h-5 w-5" />
          Игра на слух
        </CardTitle>
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Вопрос {currentQuestion + 1} из {questions.length}</span>
          <span>Очки: {score}</span>
        </div>
      </CardHeader>
      <CardContent className="text-center space-y-6">
        <div className="text-6xl mb-4">
          {questions[currentQuestion].image}
        </div>
        
        <Button variant="outline" className="flex items-center gap-2">
          <Play className="h-4 w-4" />
          Прослушать слово
        </Button>

        <div className="grid grid-cols-2 gap-2">
          {questions[currentQuestion].options.map((option) => (
            <Button
              key={option}
              variant={selectedAnswer === option ? "default" : "outline"}
              onClick={() => handleAnswer(option)}
              disabled={showResult}
              className={
                showResult && option === questions[currentQuestion].correct
                  ? "bg-green-100 border-green-300 text-green-800"
                  : showResult && selectedAnswer === option && option !== questions[currentQuestion].correct
                  ? "bg-red-100 border-red-300 text-red-800"
                  : ""
              }
            >
              {option}
            </Button>
          ))}
        </div>

        {showResult && (
          <div className="space-y-2">
            <p className={selectedAnswer === questions[currentQuestion].correct ? "text-green-600" : "text-red-600"}>
              {selectedAnswer === questions[currentQuestion].correct ? "Правильно! 🎉" : "Неправильно 😔"}
            </p>
            <Button onClick={nextQuestion}>
              Следующий вопрос
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default function CourseDetails() {
  const [selectedCourse, setSelectedCourse] = useState("kids-box-1");
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  const [openUnits, setOpenUnits] = useState<Record<number, boolean>>({});
  const [selectedTrainer, setSelectedTrainer] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('units');

  const currentCourseData = courseData[selectedCourse as keyof typeof courseData] || courseData["kids-box-1"];

  const toggleUnit = (unitId: number) => {
    setOpenUnits(prev => ({
      ...prev,
      [unitId]: !prev[unitId]
    }));
  };

  const closeDialog = () => {
    setSelectedLesson(null);
  };

  const openTrainer = (trainerId: string) => {
    setSelectedTrainer(trainerId);
  };

  const closeTrainer = () => {
    setSelectedTrainer(null);
  };

  const searchLessons = () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const results: any[] = [];
    
    currentCourseData.units.forEach((unit: any) => {
      if (unit.lessonDetails && Array.isArray(unit.lessonDetails)) {
        unit.lessonDetails.forEach((lesson: any) => {
          const query = searchQuery.toLowerCase();
          const matchesNumber = lesson.number.toString().includes(query);
          const matchesTitle = lesson.title.toLowerCase().includes(query);
          const matchesTopics = lesson.topics.some((topic: string) => 
            topic.toLowerCase().includes(query)
          );
          const matchesVocabulary = Array.isArray(lesson.vocabulary) ? 
            lesson.vocabulary.some((word: string) => 
              word.toLowerCase().includes(query)
            ) : false;
          const matchesActivities = lesson.activities.some((activity: string) => 
            activity.toLowerCase().includes(query)
          );

          if (matchesNumber || matchesTitle || matchesTopics || matchesVocabulary || matchesActivities) {
            results.push({
              ...lesson,
              unit: unit
            });
          }
        });
      }
    });

    setSearchResults(results);
  };

  const openLessonDetails = (lesson: any) => {
    setSelectedLesson(lesson);
  };

  return (
    <>
      <SEOHead 
        title={`${currentCourseData.title} - Детальное планирование | Okey English`}
        description={`Полный план курса ${currentCourseData.title} с детальным описанием каждого урока, целями, материалами и структурой занятий`}
        keywords={`${currentCourseData.title}, планирование уроков, английский для детей, Cambridge English, методика преподавания`}
      />
      
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
        {/* Заголовок страницы */}
        <section className="relative pt-20 pb-12 bg-gradient-to-r from-blue-600 to-purple-600 text-white overflow-hidden">
          <div className="absolute inset-0 bg-black/20"></div>
          
          <div className="relative container mx-auto px-4 text-center">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-100">
                {currentCourseData.title} — Детальное планирование
              </h1>
              <p className="text-xl md:text-2xl text-blue-100 mb-8">
                {currentCourseData.description}
              </p>
              
              {/* Переключатель курсов */}
              <div className="max-w-md mx-auto">
                <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                  <SelectTrigger className="w-full bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Выберите курс" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </section>

        {/* Основной контент */}
        <div className="container mx-auto px-4 py-12">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger value="units" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Юниты
              </TabsTrigger>
              <TabsTrigger value="materials" className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                Материалы
              </TabsTrigger>
              <TabsTrigger value="trainers" className="flex items-center gap-2">
                <Gamepad2 className="h-4 w-4" />
                Тренажёры
              </TabsTrigger>
            </TabsList>

            {/* Юниты */}
            <TabsContent value="units" className="space-y-8">
              {/* Поиск уроков */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    Поиск урока
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 items-center flex-wrap">
                    <Input
                      placeholder="Номер урока или ключевые слова..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="max-w-sm"
                    />
                    <Button onClick={searchLessons}>
                      Найти урок
                    </Button>
                  </div>
                  
                  {/* Результаты поиска */}
                  {searchResults.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <h4 className="font-semibold">Найдено уроков: {searchResults.length}</h4>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {searchResults.map((lesson) => (
                          <Card 
                            key={lesson.number} 
                            className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => openLessonDetails(lesson)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="font-medium">Урок {lesson.number}: {lesson.title}</span>
                                <p className="text-sm text-muted-foreground">
                                  {lesson.unit.title} • {lesson.topics.join(", ")}
                                </p>
                              </div>
                              <ExternalLink className="h-4 w-4" />
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Навигатор по юнитам */}
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-center mb-6">Навигатор по юнитам</h2>
                {currentCourseData.units.map((unit) => (
                  <Collapsible
                    key={unit.id}
                    open={openUnits[unit.id]}
                    onOpenChange={() => toggleUnit(unit.id)}
                  >
                    <Card className={`${unit.color} transition-all hover:shadow-md`}>
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-white/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <Badge variant="secondary" className="text-sm">
                                {unit.lessons} уроков
                              </Badge>
                              <div>
                                <CardTitle className="text-left">{unit.title}</CardTitle>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {unit.description}
                                </p>
                              </div>
                            </div>
                            <ChevronDown className="h-5 w-5 transition-transform" />
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent>
                        <CardContent className="pt-0">
                          <div className="grid md:grid-cols-2 gap-4 mb-6">
                            <div>
                              <h4 className="font-semibold mb-2 flex items-center gap-2">
                                <MessageCircle className="h-4 w-4" />
                                Словарь
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {unit.vocabulary}
                              </p>
                            </div>
                            <div>
                              <h4 className="font-semibold mb-2 flex items-center gap-2">
                                <Target className="h-4 w-4" />
                                Грамматика
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {unit.grammar}
                              </p>
                            </div>
                          </div>
                          
                          {/* Список уроков юнита */}
                          {unit.lessonDetails && unit.lessonDetails.length > 0 && (
                            <div>
                              <h4 className="font-semibold mb-3">
                                Уроки юнита ({unit.lessonDetails.length}):
                              </h4>
                              <div className="grid gap-2 max-h-60 overflow-y-auto">
                                {unit.lessonDetails.map((lesson) => (
                                  <Card 
                                    key={lesson.number}
                                    className="p-3 cursor-pointer hover:bg-white/80 transition-colors"
                                    onClick={() => openLessonDetails(lesson)}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <span className="font-medium text-sm">
                                          Урок {lesson.number}: {lesson.title}
                                        </span>
                                        <p className="text-xs text-muted-foreground">
                                          {lesson.topics.join(" • ")}
                                        </p>
                                      </div>
                                      <ExternalLink className="h-3 w-3" />
                                    </div>
                                  </Card>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Отладочная информация */}
                          {!unit.lessonDetails && (
                            <div className="text-xs text-red-500 p-2 bg-red-50 rounded">
                              Отсутствуют данные lessonDetails для {unit.title}
                            </div>
                          )}
                          
                          {unit.lessonDetails && unit.lessonDetails.length === 0 && (
                            <div className="text-xs text-yellow-600 p-2 bg-yellow-50 rounded">
                              Массив lessonDetails пуст для {unit.title}
                            </div>
                          )}
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                ))}
              </div>
            </TabsContent>

            {/* Материалы */}
            <TabsContent value="materials" className="space-y-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-4">Файловая библиотека</h2>
                <p className="text-muted-foreground">
                  Дополнительные материалы и ресурсы для курса {currentCourseData.title}
                </p>
              </div>

              <InlineCourseMaterials selectedCourse={selectedCourse.replace(/-/g, '_')} />
            </TabsContent>

            {/* Тренажёры */}
            <TabsContent value="trainers" className="space-y-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-4">Интерактивные тренажёры</h2>
                <p className="text-muted-foreground">
                  Изучайте английский с помощью интерактивных упражнений
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {trainers.map((trainer) => (
                  <Card 
                    key={trainer.id} 
                    className={`${trainer.color} cursor-pointer transition-all hover:shadow-lg hover:scale-105`}
                    onClick={() => openTrainer(trainer.id)}
                  >
                    <CardContent className="p-6 text-center">
                      <trainer.icon className="h-12 w-12 mx-auto mb-4 text-primary" />
                      <h3 className="font-semibold mb-2">{trainer.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {trainer.description}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Диалог с деталями урока */}
      <Dialog open={selectedLesson !== null} onOpenChange={closeDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedLesson && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">
                  Урок {selectedLesson.number}: {selectedLesson.title}
                </DialogTitle>
                <DialogDescription>
                  Подробный план урока с целями, материалами и активностями
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                {/* Основная информация */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Target className="h-5 w-5" />
                      Цели урока
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-semibold text-sm text-muted-foreground mb-2">ТЕМЫ УРОКА:</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedLesson.topics.map((topic: string, index: number) => (
                            <Badge key={index} variant="secondary">{topic}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Словарь */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <MessageCircle className="h-5 w-5" />
                        Новая лексика
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Array.isArray(selectedLesson.vocabulary) ? (
                          selectedLesson.vocabulary.map((word: string, index: number) => (
                            <div key={index} className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-primary rounded-full"></div>
                              <span className="font-mono text-sm">{word}</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">{selectedLesson.vocabulary}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Грамматика */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <BookOpen className="h-5 w-5" />
                        Грамматика
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Array.isArray(selectedLesson.grammar) ? (
                          selectedLesson.grammar.map((item: string, index: number) => (
                            <div key={index} className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-sm">{item}</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm">{selectedLesson.grammar}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Активности */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Play className="h-5 w-5" />
                      Активности и упражнения
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-4">
                      {selectedLesson.activities.map((activity: string, index: number) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                          <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
                            {index + 1}
                          </div>
                          <span className="text-sm">{activity}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Материалы */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <FolderOpen className="h-5 w-5" />
                      Необходимые материалы
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {selectedLesson.materials.map((material: string, index: number) => (
                        <Button 
                          key={index} 
                          variant="outline" 
                          size="sm" 
                          className="text-xs h-7"
                          onClick={() => {
                            // Проверяем тип материала и открываем соответствующим образом
                            if (material.toLowerCase().includes('audio') || material.toLowerCase().includes('cd')) {
                              // Для аудио материалов - можно добавить логику позже
                              console.log('Открыть аудио:', material);
                            } else if (material.toLowerCase().includes('ab') || material.toLowerCase().includes('cb')) {
                              // Для книг - можно добавить логику открытия PDF
                              console.log('Открыть учебник:', material);
                            } else {
                              // Общие материалы
                              console.log('Открыть материал:', material);
                            }
                          }}
                        >
                          <FolderOpen className="h-3 w-3 mr-1" />
                          {material}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Кнопки действий */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button className="flex items-center gap-2">
                    <Play className="h-4 w-4" />
                    Начать урок
                  </Button>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Скачать план
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex items-center gap-2"
                    onClick={() => {
                      // Переключить на вкладку материалов
                      setActiveTab('materials');
                      // Закрыть диалог
                      closeDialog();
                    }}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Материалы урока
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Диалог тренажёра */}
      <Dialog open={selectedTrainer !== null} onOpenChange={closeTrainer}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedTrainer && trainers.find(t => t.id === selectedTrainer)?.title}
            </DialogTitle>
            <DialogDescription>
              {selectedTrainer && trainers.find(t => t.id === selectedTrainer)?.description}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {selectedTrainer === "word-memory" && <WordMemoryTrainer />}
            {selectedTrainer === "listening-game" && <ListeningGame />}
            {selectedTrainer === "word-builder" && (
              <div className="text-center py-8">
                <Zap className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Тренажёр в разработке</p>
              </div>
            )}
            {selectedTrainer === "grammar-quiz" && (
              <div className="text-center py-8">
                <Target className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Тренажёр в разработке</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}