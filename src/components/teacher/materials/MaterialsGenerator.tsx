import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpen, Lightbulb, FileText, Sparkles, Loader2 } from 'lucide-react';
import { Teacher } from '@/hooks/useTeachers';
import { toast } from 'sonner';

interface MaterialsGeneratorProps {
  teacher: Teacher;
}

// Type for generation options
type GenerationType = 'lesson' | 'explanation' | 'worksheet';

interface GenerationOption {
  value: GenerationType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const MaterialsGenerator = ({ teacher }: MaterialsGeneratorProps) => {
  const [generationType, setGenerationType] = React.useState<GenerationType>('lesson');
  const [topic, setTopic] = React.useState('');
  const [level, setLevel] = React.useState('');
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [generatedContent, setGeneratedContent] = React.useState('');

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error('Пожалуйста, введите тему');
      return;
    }

    setIsGenerating(true);
    setGeneratedContent('');

    try {
      // Симуляция генерации (заменить на реальный AI вызов)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const typeText = generationType === 'lesson' ? 'План урока' : 
                       generationType === 'explanation' ? 'Объяснение темы' : 'Рабочий лист';
      
      setGeneratedContent(`# ${typeText}: ${topic}\n\n## Уровень: ${level || 'Не указан'}\n\nСодержание будет сгенерировано с помощью AI...`);
      toast.success('Материал успешно сгенерирован!');
    } catch (error) {
      toast.error('Ошибка при генерации материала');
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const generationOptions: GenerationOption[] = [
    {
      value: 'lesson',
      label: 'План урока',
      description: 'Детальный план с целями, активностями и заданиями',
      icon: BookOpen,
    },
    {
      value: 'explanation',
      label: 'Объяснение темы',
      description: 'Понятное объяснение сложной темы с примерами',
      icon: Lightbulb,
    },
    {
      value: 'worksheet',
      label: 'Рабочий лист',
      description: 'Упражнения и задания для практики',
      icon: FileText,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Выбор типа генерации */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {generationOptions.map((option) => {
          const Icon = option.icon;
          return (
            <Card
              key={option.value}
              className={`cursor-pointer transition-all hover-scale ${
                generationType === option.value
                  ? 'border-brand bg-brand/5'
                  : 'border-2 hover:border-brand/50'
              }`}
              onClick={() => setGenerationType(option.value)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${
                    generationType === option.value ? 'bg-brand text-white' : 'bg-brand/10 text-brand'
                  }`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">{option.label}</h4>
                    <p className="text-xs text-muted-foreground">{option.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Форма ввода */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="topic">Тема</Label>
            <Textarea
              id="topic"
              placeholder="Например: Present Simple для начинающих"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="level">Уровень (опционально)</Label>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger id="level">
                <SelectValue placeholder="Выберите уровень" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A1">A1 - Beginner</SelectItem>
                <SelectItem value="A2">A2 - Elementary</SelectItem>
                <SelectItem value="B1">B1 - Intermediate</SelectItem>
                <SelectItem value="B2">B2 - Upper-Intermediate</SelectItem>
                <SelectItem value="C1">C1 - Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={handleGenerate} 
            disabled={isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Генерирую...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Сгенерировать
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Результат */}
      {generatedContent && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-brand" />
              Сгенерированный материал
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none bg-muted p-4 rounded-lg">
              <pre className="whitespace-pre-wrap font-sans">{generatedContent}</pre>
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={() => navigator.clipboard.writeText(generatedContent)}>
                Копировать
              </Button>
              <Button variant="outline">
                Сохранить в библиотеку
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
