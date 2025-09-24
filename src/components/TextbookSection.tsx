import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PDFViewer } from '@/components/PDFViewer';
import { FileText, Book } from 'lucide-react';

interface TextbookMaterial {
  title: string;
  description: string;
  url: string;
  fileName: string;
}

interface TextbookSectionProps {
  title: string;
  materials: TextbookMaterial[];
  className?: string;
}

export const TextbookSection = ({ title, materials, className }: TextbookSectionProps) => {
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
        <div className="grid gap-3">
          {materials.map((material, index) => (
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
      </CardContent>
    </Card>
  );
};