import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  MessageCircle
} from "lucide-react";
import SEOHead from "@/components/SEOHead";

export default function KidsBox1() {
  const [openUnits, setOpenUnits] = useState<{ [key: string]: boolean }>({});

  const toggleUnit = (unitId: string) => {
    setOpenUnits(prev => ({ ...prev, [unitId]: !prev[unitId] }));
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
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="schedule">Календарь</TabsTrigger>
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
      </div>
    </>
  );
}