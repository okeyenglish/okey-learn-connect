import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Search, Lock, FileText, Headphones, Video, ArrowLeft } from 'lucide-react';
import { useTextbooks, Textbook } from '@/hooks/useTextbooks';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { PDFViewer } from '@/components/PDFViewer';
import { AudioPlayer } from './AudioPlayer';

interface InlineCourseMaterialsProps {
  selectedCourse?: string;
}

const programLabels: Record<string, { title: string; description: string }> = {
  'super-safari-1': {
    title: "Super Safari 1",
    description: 'Английский для самых маленьких (3-5 лет)'
  },
  'super-safari-2': {
    title: "Super Safari 2", 
    description: 'Английский для детей (4-6 лет)'
  },
  'super-safari-3': {
    title: "Super Safari 3", 
    description: 'Английский для детей (5-7 лет)'
  },
  'kids-box-starter': {
    title: "Kid's Box Starter",
    description: 'Стартовый уровень для детей (5-7 лет)'
  },
  'kids_box_1': {
    title: "Kid's Box 1",
    description: 'Курс английского языка для детей (начальный уровень)'
  },
  'kids-box-2': {
    title: "Kid's Box 2", 
    description: 'Курс английского языка для детей (продолжающий уровень)'
  },
  'kids-box-3-4': {
    title: "Kid's Box 3+4", 
    description: 'Курс английского языка для детей (средний уровень)'
  },
  'kids-box-5': {
    title: "Kid's Box 5", 
    description: 'Курс английского языка для детей (продвинутый уровень)'
  },
  'kids-box-6': {
    title: "Kid's Box 6", 
    description: 'Курс английского языка для детей (высший уровень)'
  },
  'prepare-1': {
    title: 'Prepare 1',
    description: 'Подготовка к экзаменам Cambridge English (A1)'
  },
  'prepare-2': {
    title: 'Prepare 2',
    description: 'Подготовка к экзаменам Cambridge English (A2)'
  },
  'prepare-3': {
    title: 'Prepare 3',
    description: 'Подготовка к экзаменам Cambridge English (B1)'
  },
  'prepare-4': {
    title: 'Prepare 4',
    description: 'Подготовка к экзаменам Cambridge English (B1+)'
  },
  'prepare-5': {
    title: 'Prepare 5',
    description: 'Подготовка к экзаменам Cambridge English (B2)'
  },
  'prepare-6': {
    title: 'Prepare 6',
    description: 'Подготовка к экзаменам Cambridge English (B2+)'
  },
  'prepare-7': {
    title: 'Prepare 7',
    description: 'Подготовка к экзаменам Cambridge English (C1)'
  },
  'empower-1': {
    title: 'Empower 1',
    description: 'Курс английского языка для подростков (A2)'
  },
  'empower-2': {
    title: 'Empower 2',
    description: 'Курс английского языка для подростков (A2+)'
  },
  'empower-3': {
    title: 'Empower 3',
    description: 'Курс английского языка для подростков (B1)'
  },
  'empower-4': {
    title: 'Empower 4',
    description: 'Курс английского языка для подростков (B1+)'
  },
  'empower-5': {
    title: 'Empower 5',
    description: 'Курс английского языка для подростков (B2)'
  },
  'empower-6': {
    title: 'Empower 6',
    description: 'Курс английского языка для подростков (B2+)'
  },
  'other': {
    title: 'Другие материалы',
    description: 'Дополнительные учебные материалы'
  }
};

export const InlineCourseMaterials = ({ selectedCourse: courseFilter }: InlineCourseMaterialsProps) => {
  const { textbooks, loading, fetchTextbooks } = useTextbooks();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState<Textbook | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchTextbooks();
  }, [fetchTextbooks]);

  // Фильтруем материалы по курсу
  const courseMaterials = useMemo(() => {
    if (!courseFilter) return textbooks;
    
    return textbooks.filter(material => 
      material.program_type === courseFilter ||
      material.program_type === courseFilter.replace(/-/g, '_') ||
      material.program_type === courseFilter.replace(/_/g, '-')
    );
  }, [textbooks, courseFilter]);

  // Фильтрация по поисковому запросу
  const filteredMaterials = useMemo(() => {
    if (!searchQuery) return courseMaterials;
    
    return courseMaterials.filter(material =>
      material.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      material.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [courseMaterials, searchQuery]);

  // Разделяем материалы по типам
  const educationalMaterials = filteredMaterials.filter(m => 
    m.category === 'educational' || (!m.category && m.file_name.match(/\.pdf$/i))
  );
  
  const audioMaterials = filteredMaterials.filter(m => 
    m.category === 'audio' || m.file_name.match(/\.(mp3|wav|ogg|m4a|aac)$/i)
  );
  
  const videoMaterials = filteredMaterials.filter(m => 
    m.category === 'video' || m.file_name.match(/\.(mp4|avi|mov|wmv|flv|webm)$/i)
  );

  const getCategoryLabel = (category: string, subcategory?: string) => {
    if (subcategory) {
      return `${category} - ${subcategory}`;
    }
    
    switch (category) {
      case 'educational': return 'Учебные материалы';
      case 'audio': return 'Аудио материалы';
      case 'video': return 'Видео материалы';
      case 'homework': return 'Домашние задания';
      case 'tests': return 'Тесты и проверочные работы';
      default: return category;
    }
  };

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

  // Показываем выбранный материал
  if (selectedMaterial) {
    const isPDF = selectedMaterial.file_name.match(/\.pdf$/i);
    
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setSelectedMaterial(null)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад к материалам
          </Button>
          <div>
            <h3 className="text-lg font-semibold">{selectedMaterial.title}</h3>
            <p className="text-sm text-muted-foreground">
              {getCategoryLabel(selectedMaterial.category || 'other', selectedMaterial.subcategory)}
            </p>
          </div>
        </div>
        
        {isPDF ? (
          <PDFViewer 
            url={selectedMaterial.file_url} 
            fileName={selectedMaterial.title}
          />
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="font-medium mb-2">{selectedMaterial.title}</p>
              <Button onClick={() => window.open(selectedMaterial.file_url, '_blank')}>
                Открыть файл
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Поиск */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Поиск материалов..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {filteredMaterials.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium mb-2">
            {searchQuery ? 'Ничего не найдено' : 'Нет материалов для этого курса'}
          </p>
          <p className="text-muted-foreground">
            {searchQuery 
              ? 'Попробуйте изменить поисковый запрос'
              : 'Материалы появятся здесь после их добавления'
            }
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {/* Учебные материалы */}
          {educationalMaterials.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Учебные материалы ({educationalMaterials.length})
              </h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {educationalMaterials.map((material) => (
                  <Card 
                    key={material.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedMaterial(material)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <FileText className="h-8 w-8 text-primary flex-shrink-0" />
                        <Badge variant="outline" className="text-xs">
                          {getCategoryLabel(material.category || 'other', material.subcategory)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <h4 className="font-medium text-sm mb-2 line-clamp-2">{material.title}</h4>
                      {material.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{material.description}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Аудио материалы */}
          {audioMaterials.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Headphones className="h-5 w-5" />
                Аудио материалы ({audioMaterials.length})
              </h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {audioMaterials.map((material) => (
                  <Card key={material.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <Headphones className="h-8 w-8 text-primary flex-shrink-0" />
                        <Badge variant="outline" className="text-xs">
                          {getCategoryLabel(material.category || 'audio', material.subcategory)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <h4 className="font-medium text-sm mb-2 line-clamp-2">{material.title}</h4>
                      {material.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{material.description}</p>
                      )}
                      <AudioPlayer 
                        src={material.file_url}
                        title={material.title}
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Видео материалы */}
          {videoMaterials.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Video className="h-5 w-5" />
                Видео материалы ({videoMaterials.length})
              </h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {videoMaterials.map((material) => (
                  <Card 
                    key={material.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => window.open(material.file_url, '_blank')}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <Video className="h-8 w-8 text-primary flex-shrink-0" />
                        <Badge variant="outline" className="text-xs">
                          {getCategoryLabel(material.category || 'video', material.subcategory)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <h4 className="font-medium text-sm mb-2 line-clamp-2">{material.title}</h4>
                      {material.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{material.description}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};