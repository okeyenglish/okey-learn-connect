import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, Video, Users, BookOpen } from 'lucide-react';
import { BranchBadge } from './BranchBadge';

interface LessonDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lesson: {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    branch?: string;
    location?: string;
    isOnline?: boolean;
    subject?: string;
    level?: string;
    studentsCount?: number;
  };
}

export const LessonDetailsDrawer = ({
  open,
  onOpenChange,
  lesson,
}: LessonDetailsDrawerProps) => {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-2xl mx-auto">
        <DrawerHeader>
          <DrawerTitle className="text-2xl">{lesson.title}</DrawerTitle>
          <DrawerDescription>Подробная информация о занятии</DrawerDescription>
        </DrawerHeader>

        <div className="p-6 space-y-6">
          {/* Время */}
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-brand mt-1" />
            <div>
              <p className="text-sm text-muted-foreground mb-1">Время</p>
              <p className="font-medium text-lg">
                {lesson.startTime} - {lesson.endTime}
              </p>
            </div>
          </div>

          {/* Филиал */}
          {lesson.branch && (
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-brand mt-1" />
              <div>
                <p className="text-sm text-muted-foreground mb-2">Филиал</p>
                <BranchBadge branchName={lesson.branch} />
              </div>
            </div>
          )}

          {/* Локация */}
          {lesson.location && (
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-brand mt-1" />
              <div>
                <p className="text-sm text-muted-foreground mb-1">Кабинет</p>
                <p className="font-medium">{lesson.location}</p>
              </div>
            </div>
          )}

          {/* Онлайн */}
          {lesson.isOnline && (
            <div className="flex items-start gap-3">
              <Video className="h-5 w-5 text-brand mt-1" />
              <div>
                <p className="text-sm text-muted-foreground mb-1">Формат</p>
                <Badge variant="secondary" className="gap-1">
                  <Video className="h-3 w-3" />
                  Онлайн
                </Badge>
              </div>
            </div>
          )}

          {/* Предмет и уровень */}
          {(lesson.subject || lesson.level) && (
            <div className="flex items-start gap-3">
              <BookOpen className="h-5 w-5 text-brand mt-1" />
              <div>
                <p className="text-sm text-muted-foreground mb-1">Предмет</p>
                <div className="flex items-center gap-2">
                  {lesson.subject && (
                    <p className="font-medium">{lesson.subject}</p>
                  )}
                  {lesson.level && (
                    <Badge variant="outline">{lesson.level}</Badge>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Количество студентов */}
          {lesson.studentsCount !== undefined && (
            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 text-brand mt-1" />
              <div>
                <p className="text-sm text-muted-foreground mb-1">Студентов</p>
                <p className="font-medium">{lesson.studentsCount}</p>
              </div>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};
