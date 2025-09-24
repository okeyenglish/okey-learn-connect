import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Clock, Target, FileText, Home, BookOpen, Music, Video, Gamepad2 } from "lucide-react";
import { getLessonInfoByNumber } from "@/pages/programs/KidsBox1";

interface LessonPlanCardProps {
  lessonNumber?: number;
  groupName: string;
  level?: string;
  subject?: string;
}

export function LessonPlanCard({ lessonNumber, groupName, level, subject }: LessonPlanCardProps) {
  // Определяем номер урока на основе курса Kid's Box 1
  const isKidsBox1 = subject === "Английский" && level === "Kid's Box 1";
  const lessonInfo = isKidsBox1 && lessonNumber ? getLessonInfoByNumber(lessonNumber) : null;

  if (!lessonInfo) {
    return (
      <Card className="border-l-4 border-l-muted">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground text-center">
            Планирование доступно для курса Kid's Box 1
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
        <p className="text-sm text-muted-foreground">{lessonInfo.date}</p>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div>
          <p className="text-sm font-medium mb-1">Цели урока:</p>
          <p className="text-xs text-muted-foreground">
            {lessonInfo.goals.join(", ")}
          </p>
        </div>

        <div>
          <p className="text-sm font-medium mb-1">Домашнее задание:</p>
          <p className="text-xs text-muted-foreground">
            {lessonInfo.homework}
          </p>
        </div>

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
                  {lessonInfo.goals.map((goal, index) => (
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
                  {lessonInfo.materials.map((material, index) => (
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
                  {Object.entries(lessonInfo.structure).map(([timeRange, activity]) => (
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
                <p className="text-sm">{lessonInfo.homework}</p>
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
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}