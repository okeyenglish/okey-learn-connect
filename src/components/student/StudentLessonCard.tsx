import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Video, Calendar, Clock, MapPin, User } from "lucide-react";
import { OnlineLessonModal } from "@/components/OnlineLessonModal";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface StudentLessonCardProps {
  lesson: {
    id: string;
    lesson_date: string;
    start_time: string;
    end_time: string;
    teacher_name?: string;
    classroom?: string;
    branch?: string;
    status: string;
    group?: {
      name: string;
      id: string;
    };
    individual_lesson?: {
      id: string;
      student_name: string;
    };
  };
  type: "group" | "individual";
}

export const StudentLessonCard: React.FC<StudentLessonCardProps> = ({ lesson, type }) => {
  const [onlineLessonOpen, setOnlineLessonOpen] = useState(false);

  const lessonDate = new Date(lesson.lesson_date);
  const isToday = format(new Date(), 'yyyy-MM-dd') === lesson.lesson_date;
  const isPast = lessonDate < new Date() && !isToday;

  const handleJoinLesson = () => {
    setOnlineLessonOpen(true);
  };

  return (
    <>
      <Card className={`${isPast ? 'opacity-60' : ''} ${isToday ? 'border-primary' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {format(lessonDate, 'd MMMM yyyy', { locale: ru })}
                  {isToday && <span className="ml-2 text-primary">(Сегодня)</span>}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{lesson.start_time} - {lesson.end_time}</span>
              </div>

              {lesson.teacher_name && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{lesson.teacher_name}</span>
                </div>
              )}

              {lesson.classroom && lesson.branch && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{lesson.branch}, {lesson.classroom}</span>
                </div>
              )}

              {type === "group" && lesson.group && (
                <div className="text-sm text-muted-foreground">
                  Группа: {lesson.group.name}
                </div>
              )}
            </div>

            {!isPast && lesson.status === "scheduled" && (
              <Button
                onClick={handleJoinLesson}
                className="ml-4"
                size="sm"
              >
                <Video className="h-4 w-4 mr-2" />
                Подключиться
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {onlineLessonOpen && (
        <OnlineLessonModal
          isOpen={onlineLessonOpen}
          onClose={() => setOnlineLessonOpen(false)}
          lessonType={type}
          teacherName={lesson.teacher_name}
          groupId={type === "group" ? lesson.group?.id : undefined}
          studentId={type === "individual" ? lesson.individual_lesson?.id : undefined}
          groupName={type === "group" ? lesson.group?.name : undefined}
          studentName={type === "individual" ? lesson.individual_lesson?.student_name : undefined}
        />
      )}
    </>
  );
};
