import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Clock, Target, FileText, Home, BookOpen, Music, Video, Gamepad2 } from "lucide-react";
import { getLessonInfoByNumber } from "@/pages/programs/KidsBox1";
import { useCourseUnitsWithLessons, getLessonByCourseAndNumber } from "@/hooks/useCourseUnitsWithLessons";

interface LessonPlanCardProps {
  lessonNumber?: number;
  groupName: string;
  level?: string;
  subject?: string;
}

export function LessonPlanCard({ lessonNumber, groupName, level, subject }: LessonPlanCardProps) {
  // Определяем курс для получения данных
  const isKidsBox1 = subject === "Английский" && level === "Kid's Box 1";
  const isSuperSafari = subject === "Английский" && (level === "Super Safari 1" || level === "Super Safari");
  
  // Получаем данные для Super Safari из базы данных
  const { data: superSafariUnits } = useCourseUnitsWithLessons(
    isSuperSafari ? 'super-safari-1' : undefined
  );
  
  // Получаем информацию об уроке
  let lessonInfo = null;
  
  if (isKidsBox1 && lessonNumber) {
    // Для Kid's Box 1 используем статические данные
    const kidsBoxLesson = getLessonInfoByNumber(lessonNumber);
    if (kidsBoxLesson) {
      lessonInfo = {
        title: kidsBoxLesson.title,
        unit: kidsBoxLesson.unit,
        objectives: kidsBoxLesson.goals,
        homework: kidsBoxLesson.homework,
        materials: kidsBoxLesson.materials,
        lesson_structure: Object.entries(kidsBoxLesson.structure)
          .map(([time, activity]) => `${time}: ${activity}`)
          .join('; '),
        date: kidsBoxLesson.date
      };
    }
  } else if (isSuperSafari && lessonNumber && superSafariUnits) {
    // Для Super Safari получаем данные из базы
    const dbLesson = getLessonByCourseAndNumber(superSafariUnits, lessonNumber);
    if (dbLesson) {
      lessonInfo = {
        title: dbLesson.title,
        unit: `${dbLesson.unit_title}`,
        objectives: dbLesson.objectives?.split(';') || [],
        homework: dbLesson.homework,
        materials: dbLesson.materials?.split(';') || [],
        lesson_structure: dbLesson.lesson_structure,
        date: new Date().toISOString().split('T')[0] // Текущая дата для планирования
      };
    }
  }

  if (!lessonInfo) {
    return (
      <Card className="border-l-4 border-l-muted">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground text-center">
            {isSuperSafari ? 
              'Загружаем план урока Super Safari...' :
              'Планирование доступно для курсов Kid\'s Box 1 и Super Safari'
            }
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            Урок {lessonNumber}: {lessonInfo.title}
          </CardTitle>
          <Badge variant="secondary">{lessonInfo.unit}</Badge>
        </div>
        {lessonInfo.date && (
          <p className="text-sm text-muted-foreground">{lessonInfo.date}</p>
        )}
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div>
          <p className="text-sm font-medium mb-1">Цели урока:</p>
          <p className="text-xs text-muted-foreground">
            {Array.isArray(lessonInfo.objectives) ? 
              lessonInfo.objectives.join(", ") : 
              lessonInfo.objectives || "Не указано"
            }
          </p>
        </div>

        <div>
          <p className="text-sm font-medium mb-1">Домашнее задание:</p>
          <p className="text-xs text-muted-foreground">
            {lessonInfo.homework || "Не указано"}
          </p>
        </div>

        {lessonInfo.materials && lessonInfo.materials.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {lessonInfo.materials.slice(0, 3).map((material, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {material}
              </Badge>
            ))}
            {lessonInfo.materials.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{lessonInfo.materials.length - 3}
              </Badge>
            )}
          </div>
        )}

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="w-full">
              <BookOpen className="w-3 h-3 mr-2" />
              Подробный план урока
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Урок {lessonNumber}: {lessonInfo.title}
              </DialogTitle>
              <DialogDescription>
                {lessonInfo.unit} • {lessonInfo.date} • Группа: {groupName}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Цели урока */}
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Цели урока:
                </h4>
                <ul className="list-disc list-inside space-y-1">
                  {Array.isArray(lessonInfo.objectives) ? 
                    lessonInfo.objectives.map((goal, index) => (
                      <li key={index} className="text-sm">{goal}</li>
                    )) :
                    <li className="text-sm">{lessonInfo.objectives}</li>
                  }
                </ul>
              </div>

              {/* Материалы */}
              {lessonInfo.materials && lessonInfo.materials.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Материалы:
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {lessonInfo.materials.map((material, index) => (
                      <Badge key={index} variant="outline">{material}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Поминутная структура */}
              {lessonInfo.lesson_structure && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Поминутная структура урока:
                  </h4>
                  <div className="space-y-3">
                    {isKidsBox1 && typeof lessonInfo.lesson_structure === 'object' ? 
                      Object.entries(lessonInfo.lesson_structure).map(([timeRange, activity]) => (
                        <div key={timeRange} className="flex gap-3 p-3 border rounded-lg">
                          <Badge variant="secondary" className="min-w-[5rem] justify-center">
                            {timeRange}′
                          </Badge>
                          <p className="text-sm">{String(activity)}</p>
                        </div>
                      )) :
                      <div className="p-3 border rounded-lg">
                        <p className="text-sm whitespace-pre-line">{lessonInfo.lesson_structure}</p>
                      </div>
                    }
                  </div>
                </div>
              )}

              {/* Домашнее задание */}
              {lessonInfo.homework && (
                <div className="p-4 bg-primary/5 rounded-lg">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Home className="w-4 h-4" />
                    Домашнее задание:
                  </h4>
                  <p className="text-sm">{lessonInfo.homework}</p>
                </div>
              )}

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
                  {isSuperSafari ? 'SS интерактивы' : 'KB1 интерактивы'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}