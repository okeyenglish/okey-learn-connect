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
import { CourseMaterialsLibrary } from "@/components/student/CourseMaterialsLibrary";

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
const courseData = {
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
  // Данные для других курсов (сокращённые для примера)
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
        grammar: "Hello! What's this?"
      }
    ],
    materials: [
      {
        name: "Pupil's Book",
        description: "Основной учебник",
        icon: BookOpen
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
  const [searchLessonNumber, setSearchLessonNumber] = useState('');
  const [selectedLesson, setSelectedLesson] = useState<number | null>(null);
  const [openUnits, setOpenUnits] = useState<Record<number, boolean>>({});
  const [selectedTrainer, setSelectedTrainer] = useState<string | null>(null);

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
          <Tabs defaultValue="units" className="w-full">
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
                  <div className="flex gap-4 items-center">
                    <Input
                      type="number"
                      placeholder="Номер урока (1-80)"
                      value={searchLessonNumber}
                      onChange={(e) => setSearchLessonNumber(e.target.value)}
                      className="max-w-xs"
                    />
                    <Button onClick={() => console.log('Search lesson')}>
                      Найти урок
                    </Button>
                  </div>
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
                          <div className="grid md:grid-cols-2 gap-4">
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
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                ))}
              </div>
            </TabsContent>

            {/* Материалы */}
            <TabsContent value="materials" className="space-y-8">
              <CourseMaterialsLibrary />
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