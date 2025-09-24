import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Folder, FileText, Music } from 'lucide-react';

interface CourseFolderProps {
  title: string;
  description?: string;
  materialsCount: number;
  audioCount: number;
  pdfCount: number;
  onClick: () => void;
}

export const CourseFolder = ({ 
  title, 
  description, 
  materialsCount, 
  audioCount, 
  pdfCount, 
  onClick 
}: CourseFolderProps) => {
  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-all duration-200 hover:border-primary/50"
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <Folder className="h-12 w-12 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg mb-1 truncate">{title}</h3>
            
            {description && (
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                {description}
              </p>
            )}
            
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-xs">
                {materialsCount} материалов
              </Badge>
              
              {audioCount > 0 && (
                <Badge variant="outline" className="text-xs flex items-center gap-1">
                  <Music className="h-3 w-3" />
                  {audioCount}
                </Badge>
              )}
              
              {pdfCount > 0 && (
                <Badge variant="outline" className="text-xs flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {pdfCount}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};