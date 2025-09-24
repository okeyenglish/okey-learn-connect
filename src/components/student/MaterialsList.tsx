import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Music, Eye, ArrowLeft } from 'lucide-react';
import { PDFViewer } from '@/components/PDFViewer';
import { AudioPlayer } from './AudioPlayer';
import { Textbook } from '@/hooks/useTextbooks';

interface MaterialsListProps {
  materials: Textbook[];
  courseTitle: string;
  onBack: () => void;
}

export const MaterialsList = ({ materials, courseTitle, onBack }: MaterialsListProps) => {
  const [selectedAudio, setSelectedAudio] = useState<Textbook | null>(null);

  const audioMaterials = materials.filter(m => 
    m.category === 'audio' || m.file_name.match(/\.(mp3|wav|ogg|m4a|aac)$/i)
  );
  
  const pdfMaterials = materials.filter(m => 
    m.category !== 'audio' && !m.file_name.match(/\.(mp3|wav|ogg|m4a|aac)$/i)
  );

  const getCategoryLabel = (category?: string) => {
    const categories = {
      'pupil-book': "Pupil's Book",
      'activity-book': 'Activity Book',
      'teacher-book': "Teacher's Book", 
      'lesson-example': 'Пример урока',
      'overview': 'Обзор программы',
      'audio': 'Аудиоматериалы',
      'video': 'Видеоматериалы',
      'general': 'Общие материалы'
    };
    return categories[category as keyof typeof categories] || category;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={onBack} className="p-2">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-2xl font-bold">{courseTitle}</h2>
      </div>

      {selectedAudio && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Сейчас играет</h3>
            <Button variant="ghost" onClick={() => setSelectedAudio(null)}>
              Закрыть плеер
            </Button>
          </div>
          <AudioPlayer 
            src={selectedAudio.file_url}
            title={selectedAudio.title}
          />
        </div>
      )}

      {audioMaterials.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Music className="h-5 w-5 text-purple-500" />
              Аудиоматериалы ({audioMaterials.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {audioMaterials.map(material => (
                <div 
                  key={material.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <Music className="h-5 w-5 text-purple-500" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{material.title}</p>
                      {material.description && (
                        <p className="text-sm text-muted-foreground truncate">
                          {material.description}
                        </p>
                      )}
                      {material.category && (
                        <Badge variant="outline" className="mt-1">
                          {getCategoryLabel(material.category)}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant={selectedAudio?.id === material.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedAudio(
                        selectedAudio?.id === material.id ? null : material
                      )}
                    >
                      {selectedAudio?.id === material.id ? 'Открыт' : 'Слушать'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {pdfMaterials.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-red-500" />
              Учебные материалы ({pdfMaterials.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {pdfMaterials.map(material => (
                <div 
                  key={material.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <FileText className="h-5 w-5 text-red-500" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{material.title}</p>
                      {material.description && (
                        <p className="text-sm text-muted-foreground truncate">
                          {material.description}
                        </p>
                      )}
                      {material.category && (
                        <Badge variant="outline" className="mt-1">
                          {getCategoryLabel(material.category)}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <PDFViewer
                      url={material.file_url}
                      fileName={material.file_name}
                      trigger={
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          Открыть
                        </Button>
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {materials.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">Материалы не найдены</p>
            <p className="text-muted-foreground">
              Для этого курса пока нет доступных материалов
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};