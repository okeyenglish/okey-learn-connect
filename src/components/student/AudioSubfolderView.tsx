import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Folder, Music, FolderOpen } from 'lucide-react';
import { InlineAudioPlayer } from './InlineAudioPlayer';
import { Textbook } from '@/hooks/useTextbooks';

interface AudioSubfolderViewProps {
  materials: Textbook[];
  courseTitle: string;
  onBack: () => void;
}

interface SubfolderGroup {
  subcategory: string | null;
  label: string;
  materials: Textbook[];
}

const subcategoryLabels: Record<string, string> = {
  'unit-1': 'Unit 1',
  'unit-2': 'Unit 2', 
  'unit-3': 'Unit 3',
  'unit-4': 'Unit 4',
  'unit-5': 'Unit 5',
  'unit-6': 'Unit 6',
  'grammar-songs': 'Грамматические песни',
  'vocabulary': 'Словарные упражнения',
  'listening-exercises': 'Упражнения на слух',
  'pronunciation': 'Произношение',
  'stories': 'Истории и сказки'
};

export const AudioSubfolderView = ({ materials, courseTitle, onBack }: AudioSubfolderViewProps) => {
  const [selectedSubfolder, setSelectedSubfolder] = useState<string | null>(null);

  // Group audio materials by subcategory
  const subfolders = materials.reduce((acc, material) => {
    let subcategory = material.subcategory || 'general';
    
    // Объединяем все unit-* и lesson-example в 'units'
    if (subcategory.startsWith('unit-') || subcategory === 'lesson-example') {
      subcategory = 'units';
    }
    
    const existing = acc.find(group => group.subcategory === subcategory);
    
    if (existing) {
      existing.materials.push(material);
    } else {
      const label = subcategory === 'units' ? 'Units' : 
                   subcategory === 'general' ? 'Общие аудиоматериалы' :
                   subcategoryLabels[subcategory] || subcategory;
      
      acc.push({
        subcategory: subcategory,
        label: label,
        materials: [material]
      });
    }
    
    return acc;
  }, [] as SubfolderGroup[]);

  // Sort subfolders - units first, then others
  subfolders.sort((a, b) => {
    if (a.subcategory === 'units' && b.subcategory !== 'units') return -1;
    if (a.subcategory !== 'units' && b.subcategory === 'units') return 1;
    return a.label.localeCompare(b.label);
  });

  const currentMaterials = selectedSubfolder 
    ? subfolders.find(s => s.subcategory === selectedSubfolder)?.materials || []
    : [];

  if (selectedSubfolder) {
    const currentSubfolder = subfolders.find(s => s.subcategory === selectedSubfolder);
    
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => setSelectedSubfolder(null)} className="p-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-xl font-bold">{currentSubfolder?.label}</h2>
            <p className="text-sm text-muted-foreground">{courseTitle} • Аудиоматериалы</p>
          </div>
        </div>


        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Music className="h-5 w-5 text-purple-500" />
              Аудиофайлы ({currentMaterials.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentMaterials.length > 0 ? (
              <div className="grid gap-3">
                 {currentMaterials.map(material => (
                  <div 
                    key={material.id}
                    className="p-3 border rounded-lg hover:bg-accent/50 transition-colors space-y-3"
                  >
                    <div className="flex items-center gap-3">
                      <Music className="h-4 w-4 text-purple-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{material.title}</p>
                        {material.description && (
                          <p className="text-xs text-muted-foreground truncate">
                            {material.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <InlineAudioPlayer 
                      src={material.file_url}
                      title={material.title}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Music className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">В этой папке нет аудиофайлов</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={onBack} className="p-2">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-xl font-bold">Аудиоматериалы</h2>
          <p className="text-sm text-muted-foreground">{courseTitle}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5 text-purple-500" />
            Выберите раздел
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {subfolders.map(subfolder => (
              <div
                key={subfolder.subcategory || 'general'}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={() => setSelectedSubfolder(subfolder.subcategory)}
              >
                <div className="flex items-center gap-3 flex-1">
                  <FolderOpen className="h-6 w-6 text-yellow-500" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{subfolder.label}</p>
                    <p className="text-sm text-muted-foreground">
                      {subfolder.materials.length} файлов
                    </p>
                  </div>
                </div>
                <Badge variant="outline">
                  {subfolder.materials.length}
                </Badge>
              </div>
            ))}
          </div>
          
          {subfolders.length === 0 && (
            <div className="text-center py-8">
              <Folder className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Нет доступных аудиоматериалов</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};