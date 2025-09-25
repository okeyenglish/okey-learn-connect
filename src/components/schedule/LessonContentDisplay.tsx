import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Clock, Users, Target, HomeIcon, NotebookPen } from "lucide-react";

export interface LessonContent {
  lesson_number?: number;
  title?: string;
  objectives?: string;
  homework?: string;
  unit_title?: string;
  unit_number?: number;
  vocabulary?: string;
  grammar?: string;
}

interface LessonContentDisplayProps {
  lesson: LessonContent;
  groupName?: string;
  teacherName?: string;
  className?: string;
}

export const LessonContentDisplay = ({ 
  lesson, 
  groupName, 
  teacherName, 
  className = "" 
}: LessonContentDisplayProps) => {
  if (!lesson.lesson_number && !lesson.title) {
    return null;
  }

  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">
              {lesson.lesson_number ? `Урок ${lesson.lesson_number}` : 'Урок'}
            </CardTitle>
          </div>
          {lesson.unit_number && (
            <Badge variant="secondary">
              Юнит {lesson.unit_number}
            </Badge>
          )}
        </div>
        {lesson.title && (
          <CardDescription className="text-base font-medium text-gray-900">
            {lesson.title}
          </CardDescription>
        )}
        {lesson.unit_title && (
          <CardDescription>
            {lesson.unit_title}
          </CardDescription>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Цели урока */}
        {lesson.objectives && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-green-600" />
              <h4 className="text-sm font-medium text-green-800">Цели урока</h4>
            </div>
            <p className="text-sm text-gray-700 pl-6">{lesson.objectives}</p>
          </div>
        )}

        {/* Словарь и грамматика */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {lesson.vocabulary && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <NotebookPen className="h-4 w-4 text-purple-600" />
                <h4 className="text-sm font-medium text-purple-800">Словарь</h4>
              </div>
              <p className="text-sm text-gray-700 pl-6">{lesson.vocabulary}</p>
            </div>
          )}
          
          {lesson.grammar && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-orange-600" />
                <h4 className="text-sm font-medium text-orange-800">Грамматика</h4>
              </div>
              <p className="text-sm text-gray-700 pl-6">{lesson.grammar}</p>
            </div>
          )}
        </div>

        {/* Домашнее задание */}
        {lesson.homework && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <HomeIcon className="h-4 w-4 text-blue-600" />
              <h4 className="text-sm font-medium text-blue-800">Домашнее задание</h4>
            </div>
            <p className="text-sm text-gray-700 pl-6">{lesson.homework}</p>
          </div>
        )}

        {/* Информация о группе и преподавателе */}
        {(groupName || teacherName) && (
          <div className="flex items-center gap-4 pt-2 border-t text-sm text-gray-600">
            {groupName && (
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{groupName}</span>
              </div>
            )}
            {teacherName && (
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{teacherName}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};