import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, Gamepad2, BookOpen, FileText } from 'lucide-react';
import { Teacher } from '@/hooks/useTeachers';

interface TeacherAIHubSimpleProps {
  teacher: Teacher;
}

export const TeacherAIHubSimple = ({ teacher }: TeacherAIHubSimpleProps) => {
  return (
    <div className="w-full space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Gamepad2 className="h-5 w-5 text-primary" />
              Генератор игр
            </CardTitle>
            <CardDescription>
              Создавайте интерактивные игры для занятий
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              AI-генератор поможет создать увлекательные игры для ваших уроков
            </p>
            <div className="text-center text-muted-foreground">
              <Bot className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">Скоро доступно</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="h-5 w-5 text-primary" />
              Каталог приложений
            </CardTitle>
            <CardDescription>
              Готовые материалы и игры
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Библиотека готовых учебных материалов
            </p>
            <div className="text-center text-muted-foreground">
              <BookOpen className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">Скоро доступно</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-primary" />
              Мои приложения
            </CardTitle>
            <CardDescription>
              Созданные вами материалы
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Ваши персональные учебные материалы
            </p>
            <div className="text-center text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">Пока пусто</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            AI Ассистент преподавателя
          </CardTitle>
          <CardDescription>
            Ваш персональный помощник для подготовки к урокам
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Bot className="h-12 w-12 mx-auto mb-4" />
            <p className="mb-2">AI Hub временно недоступен</p>
            <p className="text-sm">Мы работаем над стабилизацией системы</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};