import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PDFViewer } from '@/components/PDFViewer';
import { FileText, Book } from 'lucide-react';
import { useTextbooks } from '@/hooks/useTextbooks';
import { useEffect } from 'react';

interface TextbookMaterial {
  title: string;
  description: string;
  url: string;
  fileName: string;
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
    fileName: tb.file_name
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

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Book className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>
          Учебные материалы и пособия
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
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{material.title}</p>
                    <p className="text-sm text-muted-foreground">{material.description}</p>
                  </div>
                </div>
                <PDFViewer 
                  url={material.url}
                  fileName={material.fileName}
                  className="flex-shrink-0"
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};