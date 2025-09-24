import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PDFViewer } from '@/components/PDFViewer';
import { FileText, Book, Music, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTextbooks } from '@/hooks/useTextbooks';
import { useEffect } from 'react';

interface TextbookMaterial {
  title: string;
  description: string;
  url: string;
  fileName: string;
  category?: string;
}

interface TextbookSectionProps {
  title: string;
  materials?: TextbookMaterial[]; // Make optional for backward compatibility
  programType?: string; // Add program type filter
  className?: string;
}

export const TextbookSection = ({ title, materials, programType, className }: TextbookSectionProps) => {
  const { textbooks, fetchTextbooks, loading } = useTextbooks();

  useEffect(() => {
    if (programType && !materials) {
      fetchTextbooks(programType);
    }
  }, [programType, materials]);

  // Use dynamic textbooks if no static materials provided
  const displayMaterials = materials || textbooks.map(tb => ({
    title: tb.title,
    description: tb.description || '',
    url: tb.file_url,
    fileName: tb.file_name,
    category: tb.category
  }));

  if (loading && !materials) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Book className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <p className="text-muted-foreground">Загрузка...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isAudioFile = (fileName: string, category?: string) => {
    const ext = fileName.toLowerCase().split('.').pop();
    return category === 'audio' || ['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(ext || '');
  };

  const getFileIcon = (material: TextbookMaterial) => {
    if (isAudioFile(material.fileName, material.category)) {
      return <Music className="h-5 w-5 text-purple-500" />;
    }
    return <FileText className="h-5 w-5 text-red-500" />;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Book className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>
          Учебные материалы, пособия и аудиоматериалы
        </CardDescription>
      </CardHeader>
      <CardContent>
        {displayMaterials.length === 0 ? (
          <div className="text-center p-8">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              Материалы пока не загружены
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {displayMaterials.map((material, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {getFileIcon(material)}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{material.title}</p>
                    <p className="text-sm text-muted-foreground truncate">{material.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  {isAudioFile(material.fileName, material.category) ? (
                    <audio 
                      controls 
                      className="w-32 h-8"
                      preload="metadata"
                    >
                      <source src={material.url} />
                      Ваш браузер не поддерживает аудио
                    </audio>
                  ) : (
                    <PDFViewer 
                      url={material.url}
                      fileName={material.fileName}
                      trigger={
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          Открыть
                        </Button>
                      }
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};