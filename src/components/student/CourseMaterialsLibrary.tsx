import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Search, Lock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CourseFolder } from './CourseFolder';
import { MaterialsList } from './MaterialsList';
import { useTextbooks, Textbook } from '@/hooks/useTextbooks';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface CourseGroup {
  programType: string;
  title: string;
  description: string;
  materials: Textbook[];
}

const programLabels: Record<string, { title: string; description: string }> = {
  'kids-box-1': {
    title: "Kid's Box 1",
    description: 'Курс английского языка для детей (начальный уровень)'
  },
  'kids-box-2': {
    title: "Kid's Box 2", 
    description: 'Курс английского языка для детей (продолжающий уровень)'
  },
  'prepare': {
    title: 'Prepare',
    description: 'Подготовка к экзаменам Cambridge English'
  },
  'empower': {
    title: 'Empower',
    description: 'Курс английского языка для взрослых'
  },
  'super-safari': {
    title: 'Super Safari',
    description: 'Английский для самых маленьких'
  },
  'other': {
    title: 'Другие материалы',
    description: 'Дополнительные учебные материалы'
  }
};

export const CourseMaterialsLibrary = () => {
  const { textbooks, loading, fetchTextbooks } = useTextbooks();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<CourseGroup | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchTextbooks();
  }, []);

  // Группируем материалы по курсам
  const courseGroups = Object.entries(
    textbooks.reduce((acc, material) => {
      const programType = material.program_type || 'other';
      if (!acc[programType]) {
        acc[programType] = [];
      }
      acc[programType].push(material);
      return acc;
    }, {} as Record<string, Textbook[]>)
  ).map(([programType, materials]) => ({
    programType,
    title: programLabels[programType]?.title || programType,
    description: programLabels[programType]?.description || 'Учебные материалы',
    materials: materials.sort((a, b) => a.sort_order - b.sort_order)
  }));

  // Фильтрация по поисковому запросу
  const filteredGroups = courseGroups.filter(group =>
    group.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.materials.some(material =>
      material.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      material.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Загрузка материалов...</p>
        </CardContent>
      </Card>
    );
  }

  // Проверка аутентификации
  if (!user) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium mb-2">Требуется авторизация</p>
          <p className="text-muted-foreground mb-4">
            Войдите в систему, чтобы получить доступ к учебным материалам
          </p>
          <Button onClick={() => navigate('/auth')}>
            Войти в систему
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (selectedCourse) {
    return (
      <MaterialsList
        materials={selectedCourse.materials}
        courseTitle={selectedCourse.title}
        onBack={() => setSelectedCourse(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            Библиотека учебных материалов
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по курсам и материалам..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {filteredGroups.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">
                {searchQuery ? 'Ничего не найдено' : 'Нет доступных материалов'}
              </p>
              <p className="text-muted-foreground">
                {searchQuery 
                  ? 'Попробуйте изменить поисковый запрос'
                  : 'Учебные материалы появятся здесь после их добавления'
                }
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredGroups.map(group => {
                const audioCount = group.materials.filter(m => 
                  m.category === 'audio' || m.file_name.match(/\.(mp3|wav|ogg|m4a|aac)$/i)
                ).length;
                
                const pdfCount = group.materials.length - audioCount;
                
                return (
                  <CourseFolder
                    key={group.programType}
                    title={group.title}
                    description={group.description}
                    materialsCount={group.materials.length}
                    audioCount={audioCount}
                    pdfCount={pdfCount}
                    onClick={() => setSelectedCourse(group)}
                  />
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};