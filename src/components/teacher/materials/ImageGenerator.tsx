import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Loader2, Sparkles, Download, Copy, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Teacher } from '@/hooks/useTeachers';

interface ImageGeneratorProps {
  teacher: Teacher;
}

type ImageSize = '1024x1024' | '1024x768' | '768x1024';

const IMAGE_SIZES: Record<ImageSize, { width: number; height: number; label: string }> = {
  '1024x1024': { width: 1024, height: 1024, label: 'Квадрат 1:1' },
  '1024x768': { width: 1024, height: 768, label: 'Горизонтальный 4:3' },
  '768x1024': { width: 768, height: 1024, label: 'Вертикальный 3:4' },
};

export const ImageGenerator = ({ teacher }: ImageGeneratorProps) => {
  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState<ImageSize>('1024x1024');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: 'Ошибка',
        description: 'Пожалуйста, опишите изображение, которое хотите создать',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { width, height } = IMAGE_SIZES[size];
      
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: { prompt, width, height }
      });

      if (error) throw error;

      if (data?.imageUrl) {
        setGeneratedImage(data.imageUrl);
        toast({
          title: 'Изображение создано!',
          description: 'Вы можете скачать или использовать его в материалах',
        });
      } else {
        throw new Error('Изображение не было создано');
      }
    } catch (error: any) {
      let errorMessage = 'Не удалось создать изображение';
      
      if (error.message?.includes('429')) {
        errorMessage = 'Превышен лимит запросов. Пожалуйста, попробуйте позже.';
      } else if (error.message?.includes('402')) {
        errorMessage = 'Недостаточно средств. Пожалуйста, пополните баланс Lovable AI.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: 'Ошибка генерации',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;

    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `generated-image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Изображение скачано',
      description: 'Файл сохранен на вашем устройстве',
    });
  };

  const handleCopy = async () => {
    if (!generatedImage) return;

    try {
      const response = await fetch(generatedImage);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ]);
      
      toast({
        title: 'Скопировано',
        description: 'Изображение скопировано в буфер обмена',
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось скопировать изображение',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">
            Опишите изображение
          </label>
          <Textarea
            placeholder="Например: Яркая иллюстрация для детей с героями, изучающими английский алфавит"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            className="resize-none"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">
            Размер изображения
          </label>
          <Select value={size} onValueChange={(value) => setSize(value as ImageSize)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(IMAGE_SIZES).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button 
          onClick={handleGenerate} 
          disabled={isGenerating || !prompt.trim()}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Генерируем изображение...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Сгенерировать
            </>
          )}
        </Button>
      </div>

      {generatedImage && (
        <Card className="p-4 space-y-4">
          <div className="relative rounded-lg overflow-hidden bg-muted">
            <img 
              src={generatedImage} 
              alt="Generated" 
              className="w-full h-auto"
            />
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleDownload}
              className="flex-1"
            >
              <Download className="mr-2 h-4 w-4" />
              Скачать
            </Button>
            <Button 
              variant="outline" 
              onClick={handleCopy}
              className="flex-1"
            >
              <Copy className="mr-2 h-4 w-4" />
              Копировать
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setGeneratedImage(null)}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};
