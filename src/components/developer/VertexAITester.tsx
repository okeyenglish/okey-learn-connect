import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

type TestType = 'text' | 'image' | 'embedding';
type Provider = 'gateway' | 'vertex';

export const VertexAITester = () => {
  const [prompt, setPrompt] = useState('');
  const [testType, setTestType] = useState<TestType>('text');
  const [provider, setProvider] = useState<Provider>('gateway');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleTest = async () => {
    if (!prompt.trim()) {
      toast({
        title: 'Ошибка',
        description: 'Введите промпт для тестирования',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('test-vertex-ai', {
        body: { 
          prompt, 
          test_type: testType,
          provider 
        }
      });

      if (error) throw error;

      setResult(data);
      
      toast({
        title: 'Тест выполнен',
        description: `Провайдер: ${data.provider}, Тип: ${data.test_type}`,
      });
    } catch (error: any) {
      console.error('Test error:', error);
      
      toast({
        title: 'Ошибка теста',
        description: error.message || 'Не удалось выполнить тест',
        variant: 'destructive',
      });
      
      setResult({ 
        success: false, 
        error: error.message || 'Неизвестная ошибка' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Тестирование AI API</CardTitle>
          <CardDescription>
            Проверьте работу Lovable AI Gateway или Vertex AI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Провайдер
              </label>
              <Select 
                value={provider} 
                onValueChange={(value) => setProvider(value as Provider)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gateway">Lovable AI Gateway (Gemini)</SelectItem>
                  <SelectItem value="vertex">Vertex AI (Direct)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Тип теста
              </label>
              <Select 
                value={testType} 
                onValueChange={(value) => setTestType(value as TestType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Генерация текста</SelectItem>
                  <SelectItem value="image">Генерация изображения</SelectItem>
                  <SelectItem value="embedding">Эмбеддинги</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Промпт
            </label>
            <Textarea
              placeholder={
                testType === 'text' 
                  ? 'Например: Расскажи о преимуществах изучения английского'
                  : testType === 'image'
                  ? 'Например: Яркий закат над океаном'
                  : 'Например: artificial intelligence machine learning'
              }
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          <Button 
            onClick={handleTest} 
            disabled={isLoading || !prompt.trim()}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Тестирование...
              </>
            ) : (
              'Запустить тест'
            )}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.success ? (
                <>
                  <Check className="h-5 w-5 text-green-500" />
                  Тест успешен
                </>
              ) : (
                <>
                  <X className="h-5 w-5 text-red-500" />
                  Ошибка теста
                </>
              )}
            </CardTitle>
            <CardDescription>
              Провайдер: {result.provider || 'неизвестно'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.success ? (
              <>
                {testType === 'text' && (
                  <div>
                    <h4 className="font-medium mb-2">Результат:</h4>
                    <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded">
                      {result.result}
                    </p>
                  </div>
                )}
                
                {testType === 'image' && (
                  <div>
                    <h4 className="font-medium mb-2">Сгенерированное изображение:</h4>
                    <img 
                      src={result.result} 
                      alt="Generated" 
                      className="w-full rounded border"
                    />
                  </div>
                )}
                
                {testType === 'embedding' && (
                  <div>
                    <h4 className="font-medium mb-2">Эмбеддинг вектор:</h4>
                    <p className="text-sm text-muted-foreground">
                      Размерность: {Array.isArray(result.result) ? result.result.length : 0}
                    </p>
                    <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-40">
                      {JSON.stringify(result.result?.slice(0, 20), null, 2)}
                      {Array.isArray(result.result) && result.result.length > 20 && '\n...'}
                    </pre>
                  </div>
                )}
              </>
            ) : (
              <div>
                <h4 className="font-medium mb-2 text-red-500">Ошибка:</h4>
                <p className="text-sm bg-red-50 dark:bg-red-950 p-3 rounded">
                  {result.error}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
