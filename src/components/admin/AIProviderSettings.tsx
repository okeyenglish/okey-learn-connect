import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Check, AlertTriangle, Sparkles } from 'lucide-react';
import { supabaseTyped as supabase } from '@/integrations/supabase/typedClient';
import { toast } from '@/hooks/use-toast';

interface AIProviderOption {
  value: string;
  label: string;
  description: string;
  available: boolean;
}

interface AIProviderData {
  provider: string;
  source: 'env' | 'database';
  hasVertexSecrets: boolean;
  availableProviders: AIProviderOption[];
}

export const AIProviderSettings = () => {
  const queryClient = useQueryClient();
  const [selectedProvider, setSelectedProvider] = useState<string>('');

  // Получение текущего провайдера
  const { data, isLoading, error } = useQuery({
    queryKey: ['ai-provider'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-ai-provider');
      if (error) throw error;
      return data as AIProviderData;
    }
  });

  // Установка текущего провайдера при загрузке
  React.useEffect(() => {
    if (data?.provider && !selectedProvider) {
      setSelectedProvider(data.provider);
    }
  }, [data, selectedProvider]);

  // Изменение провайдера
  const updateProvider = useMutation({
    mutationFn: async (provider: string) => {
      const { data, error } = await supabase.functions.invoke('set-ai-provider', {
        body: { provider }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['ai-provider'] });
      toast({
        title: 'Провайдер изменён',
        description: response.message,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось изменить провайдер',
        variant: 'destructive',
      });
    }
  });

  const handleSave = () => {
    if (selectedProvider !== data?.provider) {
      updateProvider.mutate(selectedProvider);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Ошибка загрузки настроек: {error.message}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const isChanged = selectedProvider !== data?.provider;
  const isEnvOverride = data?.source === 'env';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-brand" />
          AI Провайдер
        </CardTitle>
        <CardDescription>
          Выберите провайдер для AI функций (генерация приложений, изображений, ответы в CRM)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEnvOverride && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Провайдер установлен через переменную окружения AI_PROVIDER и не может быть изменён через интерфейс.
            </AlertDescription>
          </Alert>
        )}

        <RadioGroup
          value={selectedProvider}
          onValueChange={setSelectedProvider}
          disabled={isEnvOverride || updateProvider.isPending}
          className="space-y-3"
        >
          {data?.availableProviders.map((option) => (
            <div
              key={option.value}
              className={`flex items-start space-x-3 space-y-0 rounded-lg border p-4 ${
                option.available ? 'cursor-pointer hover:bg-accent' : 'opacity-50 cursor-not-allowed'
              } ${selectedProvider === option.value ? 'border-primary bg-accent' : ''}`}
              onClick={() => option.available && !isEnvOverride && setSelectedProvider(option.value)}
            >
              <RadioGroupItem value={option.value} id={option.value} disabled={!option.available} />
              <div className="flex-1 space-y-1">
                <Label
                  htmlFor={option.value}
                  className={`font-medium leading-none ${option.available ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                >
                  {option.label}
                  {!option.available && (
                    <span className="ml-2 text-xs text-muted-foreground">(секреты не настроены)</span>
                  )}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {option.description}
                </p>
              </div>
              {selectedProvider === option.value && option.available && (
                <Check className="h-5 w-5 text-primary" />
              )}
            </div>
          ))}
        </RadioGroup>

        {!data?.hasVertexSecrets && (
          <Alert>
            <AlertDescription>
              Для использования Vertex AI необходимо настроить секреты:
              <code className="block mt-2 text-xs bg-muted p-2 rounded">
                GCP_PROJECT_ID<br/>
                GCP_REGION<br/>
                GOOGLE_APPLICATION_CREDENTIALS_JSON
              </code>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex justify-between items-center pt-4">
          <p className="text-sm text-muted-foreground">
            Текущий провайдер: <strong>{data?.provider === 'gateway' ? 'Lovable AI Gateway' : 'Vertex AI Direct'}</strong>
          </p>
          <Button
            onClick={handleSave}
            disabled={!isChanged || isEnvOverride || updateProvider.isPending}
          >
            {updateProvider.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Сохранение...
              </>
            ) : (
              'Сохранить'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
