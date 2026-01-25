import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/typedClient";
import { useAuth } from "@/hooks/useAuth";
import { getErrorMessage } from '@/lib/errorUtils';

export const EmploymentTermsSettings = () => {
  const { profile } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [terms, setTerms] = useState('');

  // Загрузка условий
  useEffect(() => {
    const loadTerms = async () => {
      if (!profile?.organization_id) return;

      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('settings')
          .eq('id', profile.organization_id)
          .single();

        if (error) throw error;

        const settings = data?.settings as Record<string, unknown> | null;
        setTerms((settings?.employment_terms as string) || '');
      } catch (err) {
        console.error('Error loading terms:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadTerms();
  }, [profile?.organization_id]);

  const handleSave = async () => {
    if (!profile?.organization_id) return;

    setIsSaving(true);

    try {
      // Сначала получаем текущие настройки
      const { data: orgData, error: fetchError } = await supabase
        .from('organizations')
        .select('settings')
        .eq('id', profile.organization_id)
        .single();

      if (fetchError) throw fetchError;

      const currentSettings = (orgData?.settings as Record<string, unknown>) || {};

      // Обновляем с новыми условиями
      const { error } = await supabase
        .from('organizations')
        .update({
          settings: {
            ...currentSettings,
            employment_terms: terms.trim()
          }
        })
        .eq('id', profile.organization_id);

      if (error) throw error;

      toast.success('Условия работы сохранены');
    } catch (err) {
      console.error('Error saving terms:', err);
      toast.error('Ошибка: ' + getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Условия работы
        </CardTitle>
        <CardDescription>
          Этот текст будет показан новым сотрудникам при регистрации. 
          Они должны принять эти условия для присоединения к команде.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="employment-terms">
            Текст условий работы
          </Label>
          <Textarea
            id="employment-terms"
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            placeholder={`Пример:

1. График работы: пн-пт с 9:00 до 18:00
2. Оплата: сдельная, от 500₽/час
3. Обязанности: проведение занятий, ведение отчётности
4. Правила: соблюдение дресс-кода, пунктуальность

Подписывая, вы соглашаетесь с правилами внутреннего распорядка.`}
            rows={10}
            className="font-mono text-sm"
          />
        </div>

        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          className="w-full sm:w-auto"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Сохранение...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Сохранить
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
