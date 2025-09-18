import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Database, CheckCircle, XCircle } from "lucide-react";

export const ContentIndexer = () => {
  const [isIndexing, setIsIndexing] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    processed?: number;
  } | null>(null);

  const handleIndexContent = async () => {
    setIsIndexing(true);
    setResult(null);

    try {
      console.log('Starting content indexing...');
      
      const { data, error } = await supabase.functions.invoke('index-content', {
        method: 'POST'
      });

      if (error) {
        throw error;
      }

      console.log('Indexing result:', data);
      setResult(data);
    } catch (error) {
      console.error('Indexing failed:', error);
      setResult({
        success: false,
        message: `Ошибка индексации: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
      });
    } finally {
      setIsIndexing(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Индексация контента для чат-бота
        </CardTitle>
        <CardDescription>
          Проиндексируйте содержимое сайта, чтобы чат-бот мог отвечать на вопросы по материалам школы
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          <p>Что будет проиндексировано:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Информация о курсах и программах</li>
            <li>Данные о филиалах и их расположении</li>
            <li>Информация о преподавателях</li>
            <li>Цены и стоимость обучения</li>
            <li>Контактная информация</li>
            <li>Общая информация о школе</li>
          </ul>
        </div>

        <Button 
          onClick={handleIndexContent}
          disabled={isIndexing}
          className="w-full"
        >
          {isIndexing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Индексирую контент...
            </>
          ) : (
            <>
              <Database className="mr-2 h-4 w-4" />
              Запустить индексацию
            </>
          )}
        </Button>

        {result && (
          <Alert className={result.success ? "border-green-200" : "border-red-200"}>
            <div className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className={result.success ? "text-green-700" : "text-red-700"}>
                {result.message}
                {result.success && result.processed && (
                  <div className="mt-2 text-sm">
                    Теперь чат-бот сможет отвечать на вопросы по материалам сайта!
                  </div>
                )}
              </AlertDescription>
            </div>
          </Alert>
        )}

        <div className="text-xs text-muted-foreground mt-4 p-3 bg-muted rounded-lg">
          <p className="font-medium mb-1">Примечание:</p>
          <p>
            После индексации чат-бот будет использовать этот контент для ответов на вопросы. 
            Если вы обновили информацию на сайте, запустите индексацию повторно.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};