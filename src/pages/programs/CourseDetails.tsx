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
  GraduationCap,
  Target,
  Play,
  Gamepad2,
  FileText,
  Music,
  Video,
  Users,
  Download,
  Calendar,
  Home
} from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { InlineCourseMaterials } from "@/components/student/InlineCourseMaterials";
import { supabase } from "@/integrations/supabase/typedClient";
import { useState, useMemo } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Globe } from "lucide-react";

// Import trainer components
import { TrainerSetupModal } from "@/components/trainers/TrainerSetupModal";
import { VocabularyFlashcards } from "@/components/trainers/VocabularyFlashcards";
import { WordAssociation } from "@/components/trainers/WordAssociation";
import { SentenceBuilder } from "@/components/trainers/SentenceBuilder";
import { SpellingChallenge } from "@/components/trainers/SpellingChallenge";
import { MemoryMatch } from "@/components/trainers/MemoryMatch";

interface WordPair {
  word: string;
  translation: string;
  definition?: string;
  example?: string;
}

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
  objectives: string;
  lesson_structure: string;
  homework: string;
  materials: string;
  created_at: string;
  updated_at: string;
}


// Материалы курса
const getCourseMaterials = (t: (key: string) => string) => [
  {
    name: "Pupil's Book",
    description: t('materials.pupilsBook'),
    icon: BookOpen
  },
  {
    name: "Activity Book", 
    description: t('materials.activityBook'),
    icon: FileText
  },
  {
    name: "Teacher's Book",
    description: t('materials.teachersBook'), 
    icon: Users
  },
  {
    name: "Audio Materials",
    description: t('materials.audio'),
    icon: Music
  },
  {
    name: "Video Materials", 
    description: t('materials.video'),
    icon: Video
  },
  {
    name: "Interactive Content",
    description: t('materials.interactive'),
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
  const { t } = useLanguage();
  
  const courseMaterials = getCourseMaterials(t);

  // Trainer states
  const [activeTrainer, setActiveTrainer] = useState<string | null>(null);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [trainerWords, setTrainerWords] = useState<WordPair[]>([]);

  // Получение данных о курсе
  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: ['course', courseSlug],
    queryFn: async () => {
      if (!courseSlug) throw new Error('Course slug is required');
      
      const { data, error } = await supabase.from('courses')
        .select('*')
        .eq('slug', courseSlug)
        .single();
        
      if (error) throw error;
      return data;
    },
    enabled: !!courseSlug
  });

  // Получение юнитов курса
  const { data: units, isLoading: unitsLoading } = useQuery({
    queryKey: ['course-units', course?.id],
    queryFn: async () => {
      if (!course?.id) return [];
      const { data, error } = await supabase.from('course_units')
        .select('*')
        .eq('course_id', course.id)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
    enabled: !!course?.id
  });

  // Карты для быстрого доступа
  const unitById = useMemo(() => {
    const m: Record<string, typeof units[0]> = {};
    (units ?? []).forEach(u => { m[u.id] = u; });
    return m;
  }, [units]);

  // Получение уроков юнитов для текущего курса
  const unitIds = (units ?? []).map(u => u.id);
  const { data: lessons, isLoading: lessonsLoading } = useQuery({
    queryKey: ['lessons', unitIds],
    queryFn: async () => {
      if (!unitIds.length) return [];
      const { data, error } = await supabase.from('lessons')
        .select('*')
        .in('unit_id', unitIds)
        .order('lesson_number', { ascending: true });
      if (error) throw error;
      return data;
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

  // Создаем глобальную нумерацию уроков от 1 до 80
  const lessonGlobalNumbers = useMemo(() => {
    const numberMap: Record<string, number> = {};
    if (!lessons || !units) return numberMap;
    
    // Сортируем уроки по юнитам и номерам внутри юнитов
    const sortedUnits = [...units].sort((a, b) => a.sort_order - b.sort_order);
    let globalNumber = 1;
    
    sortedUnits.forEach(unit => {
      const unitLessons = lessonsByUnitId[unit.id] || [];
      const sortedLessons = [...unitLessons].sort((a, b) => a.lesson_number - b.lesson_number);
      
      sortedLessons.forEach(lesson => {
        numberMap[lesson.id] = globalNumber;
        globalNumber++;
      });
    });
    
    return numberMap;
  }, [lessons, units, lessonsByUnitId]);

  // Функция для переключения между курсами
  const handleCourseChange = (newCourseSlug: string) => {
    navigate(`/course-details/${newCourseSlug}`);
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

  // Trainer functions
  const handleTrainerSetup = (trainerType: string) => {
    setActiveTrainer(trainerType);
    setShowSetupModal(true);
  };

  const handleStartTrainer = (words: WordPair[]) => {
    setTrainerWords(words);
    setShowSetupModal(false);
  };

  const closeTrainer = () => {
    setActiveTrainer(null);
    setTrainerWords([]);
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
          <p className="text-gray-600">{t('loading.course')}</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-gray-900">{t('error.notFound')}</h1>
          <p className="text-gray-600">{t('error.notFoundDesc')}</p>
          <Button onClick={() => navigate('/programs')} className="gap-2">
            {t('button.backToCourses')}
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
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-6">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-end gap-4 mb-4">
              <LanguageSwitcher />
              {/* Переключатель курсов */}
              <Select value={courseSlug} onValueChange={handleCourseChange}>
                <SelectTrigger className="w-64 bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder={t('select.chooseCourse')} />
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
            
            <div className="flex items-center gap-4 mb-4">
              <GraduationCap className="h-10 w-10" />
              <div>
                <h1 className="text-3xl font-bold">{course.title}</h1>
                <p className="text-lg text-blue-100">{course.description}</p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-lg">
                <BookOpen className="h-5 w-5" />
                <span>{units?.length || 0} {t('course.units')}</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-lg">
                <Clock className="h-5 w-5" />
                <span>{units?.reduce((total, unit) => total + unit.lessons_count, 0) || 0} {t('course.lessons')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-8">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">{t('tabs.planning')}</TabsTrigger>
              <TabsTrigger value="materials">{t('tabs.materials')}</TabsTrigger>
              <TabsTrigger value="trainers">{t('tabs.trainers')}</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-6 w-6 text-blue-600" />
                    {t('planning.courseStructure')}
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
                                      {t('planning.unit')} {unit.unit_number}
                                    </Badge>
                                    <h3 className="text-lg font-semibold">{unit.title}</h3>
                                  </div>
                                  <p className="text-gray-600">{unit.description}</p>
                                  <div className="flex items-center gap-4 text-sm text-gray-500">
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-4 w-4" />
                                      {unit.lessons_count} {t('planning.lessons')}
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
                                <h4 className="font-semibold text-green-600 mb-2">📚 {t('planning.vocabulary')}</h4>
                                <p className="text-gray-700">{unit.vocabulary}</p>
                              </div>
                              <div>
                                <h4 className="font-semibold text-blue-600 mb-2">⚙️ {t('planning.grammar')}</h4>
                                <p className="text-gray-700">{unit.grammar}</p>
                              </div>

                              {/* Уроки внутри юнита */}
                              {getUnitLessons(unit.id).length > 0 && (
                                <div className="mt-6">
                                  <h4 className="font-semibold text-purple-600 mb-3">📖 {t('planning.lessonsTitle')}</h4>
                                  <div className="grid gap-3">
                                    {getUnitLessons(unit.id).map((lesson) => (
                                      <Card
                                        key={lesson.id}
                                        className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-blue-500"
                                        onClick={() => setSelectedLesson(lesson)}
                                      >
                                        <CardContent className="p-4">
                                          <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                               <Badge variant="outline" className="text-xs">
                                                 {t('planning.lesson')} {lessonGlobalNumbers[lesson.id] || lesson.lesson_number}
                                               </Badge>
                                            </div>
                                          </div>
                                          <h5 className="font-medium text-sm mb-2">{lesson.title}</h5>
                                          <div className="space-y-2">
                                             <div>
                                               <p className="text-xs font-medium text-gray-600">{t('planning.goals')}</p>
                                               <p className="text-xs text-gray-500">{lesson.objectives ? String(lesson.objectives) : ""}</p>
                                             </div>
                                            <div>
                                              <p className="text-xs font-medium text-gray-600">{t('planning.materials')}</p>
                                              <p className="text-xs text-gray-500 line-clamp-1">{Array.isArray(lesson.materials) ? lesson.materials.join(", ") : String(lesson.materials || "")}</p>
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

            {/* Materials Tab */}
            <TabsContent value="materials" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-6 w-6 text-blue-600" />
                    {t('materials.title')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <InlineCourseMaterials selectedCourse={course.slug} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Trainers Tab */}
            <TabsContent value="trainers" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gamepad2 className="w-6 h-6 text-green-600" />
                    {t('trainers.title')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Vocabulary Flashcards */}
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-6 text-center">
                        <div className="w-12 h-12 mx-auto mb-4 text-primary bg-blue-100 rounded-full flex items-center justify-center">
                          <BookOpen className="w-6 h-6" />
                        </div>
                        <h4 className="font-medium mb-2">{t('trainers.vocabularyFlashcards')}</h4>
                        <p className="text-sm text-muted-foreground mb-4">{t('trainers.vocabularyFlashcardsDesc')}</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                          onClick={() => handleTrainerSetup('flashcards')}
                        >
                          <Play className="w-4 h-4 mr-2" />
                          {t('trainers.setup')}
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Word Association */}
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-6 text-center">
                        <div className="w-12 h-12 mx-auto mb-4 text-primary bg-green-100 rounded-full flex items-center justify-center">
                          <Target className="w-6 h-6" />
                        </div>
                        <h4 className="font-medium mb-2">{t('trainers.wordAssociation')}</h4>
                        <p className="text-sm text-muted-foreground mb-4">{t('trainers.wordAssociationDesc')}</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                          onClick={() => handleTrainerSetup('association')}
                        >
                          <Play className="w-4 h-4 mr-2" />
                          {t('trainers.setup')}
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Sentence Builder */}
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-6 text-center">
                        <div className="w-12 h-12 mx-auto mb-4 text-primary bg-purple-100 rounded-full flex items-center justify-center">
                          <FileText className="w-6 h-6" />
                        </div>
                        <h4 className="font-medium mb-2">{t('trainers.sentenceBuilder')}</h4>
                        <p className="text-sm text-muted-foreground mb-4">{t('trainers.sentenceBuilderDesc')}</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                          onClick={() => handleTrainerSetup('sentences')}
                        >
                          <Play className="w-4 h-4 mr-2" />
                          {t('trainers.setup')}
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Spelling Challenge */}
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-6 text-center">
                        <div className="w-12 h-12 mx-auto mb-4 text-primary bg-orange-100 rounded-full flex items-center justify-center">
                          <Gamepad2 className="w-6 h-6" />
                        </div>
                        <h4 className="font-medium mb-2">{t('trainers.spellingChallenge')}</h4>
                        <p className="text-sm text-muted-foreground mb-4">{t('trainers.spellingChallengeDesc')}</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                          onClick={() => handleTrainerSetup('spelling')}
                        >
                          <Play className="w-4 h-4 mr-2" />
                          {t('trainers.setup')}
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Memory Match */}
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-6 text-center">
                        <div className="w-12 h-12 mx-auto mb-4 text-primary bg-red-100 rounded-full flex items-center justify-center">
                          <Users className="w-6 h-6" />
                        </div>
                        <h4 className="font-medium mb-2">{t('trainers.memoryMatch')}</h4>
                        <p className="text-sm text-muted-foreground mb-4">{t('trainers.memoryMatchDesc')}</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                          onClick={() => handleTrainerSetup('memory')}
                        >
                          <Play className="w-4 h-4 mr-2" />
                          {t('trainers.setup')}
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Модальное окно с детальным планом урока */}
      {selectedLesson && (
        <Dialog open={!!selectedLesson} onOpenChange={closeDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
             <DialogHeader>
               <DialogTitle className="flex items-center gap-2">
                 <Calendar className="w-5 h-5" />
                 {t('planning.lesson')} {lessonGlobalNumbers[selectedLesson.id] || selectedLesson.lesson_number}: {selectedLesson.title}
               </DialogTitle>
               <DialogDescription>
                 {t('planning.unit')} {unitById[selectedLesson.unit_id]?.unit_number || ''}: {unitById[selectedLesson.unit_id]?.title || ''}
               </DialogDescription>
             </DialogHeader>
             
              <div className="space-y-6">
                {/* Цели урока */}
                {selectedLesson.objectives && (
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      {t('lesson.goals')}
                    </h4>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="text-sm">
                        {String(selectedLesson.objectives)}
                      </div>
                    </div>
                  </div>
                )}

                {/* Материалы */}
                {selectedLesson.materials && (
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      {t('lesson.materials')}
                    </h4>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="text-sm">
                        {String(selectedLesson.materials)}
                      </div>
                    </div>
                  </div>
                )}

                {/* Поминутная структура урока */}
                {selectedLesson.lesson_structure && (
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {t('lesson.structure')}
                    </h4>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="text-sm whitespace-pre-line">
                        {String(selectedLesson.lesson_structure)}
                      </div>
                    </div>
                  </div>
                )}

                {/* Домашнее задание */}
                {selectedLesson.homework && (
                  <div className="p-4 bg-primary/5 rounded-lg">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Home className="w-4 h-4" />
                      {t('lesson.homework')}
                    </h4>
                    <div className="text-sm">
                      {String(selectedLesson.homework)}
                    </div>
                  </div>
                )}
              </div>
           </DialogContent>
         </Dialog>
       )}

       {/* Trainer Setup Modal */}
       <TrainerSetupModal
         isOpen={showSetupModal}
         onClose={() => setShowSetupModal(false)}
         onStart={handleStartTrainer}
         trainerTitle={
           activeTrainer === 'flashcards' ? t('trainers.vocabularyFlashcards') :
           activeTrainer === 'association' ? t('trainers.wordAssociation') :
           activeTrainer === 'sentences' ? t('trainers.sentenceBuilder') :
           activeTrainer === 'spelling' ? t('trainers.spellingChallenge') :
           activeTrainer === 'memory' ? t('trainers.memoryMatch') : ''
         }
         trainerDescription={
           activeTrainer === 'flashcards' ? t('trainers.vocabularyFlashcardsDesc') :
           activeTrainer === 'association' ? t('trainers.wordAssociationDesc') :
           activeTrainer === 'sentences' ? t('trainers.sentenceBuilderDesc') :
           activeTrainer === 'spelling' ? t('trainers.spellingChallengeDesc') :
           activeTrainer === 'memory' ? t('trainers.memoryMatchDesc') : ''
         }
       />

       {/* Individual Trainer Components */}
       <VocabularyFlashcards
         isOpen={activeTrainer === 'flashcards' && trainerWords.length > 0}
         onClose={closeTrainer}
         words={trainerWords}
       />
       
       <WordAssociation
         isOpen={activeTrainer === 'association' && trainerWords.length > 0}
         onClose={closeTrainer}
         words={trainerWords}
       />
       
       <SentenceBuilder
         isOpen={activeTrainer === 'sentences' && trainerWords.length > 0}
         onClose={closeTrainer}
         words={trainerWords}
       />
       
       <SpellingChallenge
         isOpen={activeTrainer === 'spelling' && trainerWords.length > 0}
         onClose={closeTrainer}
         words={trainerWords}
       />
       
       <MemoryMatch
         isOpen={activeTrainer === 'memory' && trainerWords.length > 0}
         onClose={closeTrainer}
         words={trainerWords}
       />
     </>
   );
 }