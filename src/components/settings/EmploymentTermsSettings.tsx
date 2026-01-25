import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, FileText, Upload, Trash2, Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/typedClient";
import { useAuth } from "@/hooks/useAuth";
import { getErrorMessage } from '@/lib/errorUtils';

export const EmploymentTermsSettings = () => {
  const { profile } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [terms, setTerms] = useState('');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        setPdfUrl((settings?.employment_terms_pdf_url as string) || null);
        setPdfFileName((settings?.employment_terms_pdf_name as string) || null);
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.organization_id) return;

    // Проверка типа файла
    if (file.type !== 'application/pdf') {
      toast.error('Можно загружать только PDF файлы');
      return;
    }

    // Проверка размера (макс 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Файл слишком большой (максимум 10MB)');
      return;
    }

    setIsUploading(true);

    try {
      // Генерируем уникальное имя файла
      const fileExt = 'pdf';
      const fileName = `${profile.organization_id}/employment-terms.${fileExt}`;

      // Загружаем файл
      const { error: uploadError } = await supabase.storage
        .from('employment-docs')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Получаем публичный URL
      const { data: urlData } = supabase.storage
        .from('employment-docs')
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;

      // Сохраняем URL в настройки организации
      const { data: orgData, error: fetchError } = await supabase
        .from('organizations')
        .select('settings')
        .eq('id', profile.organization_id)
        .single();

      if (fetchError) throw fetchError;

      const currentSettings = (orgData?.settings as Record<string, unknown>) || {};

      const { error: updateError } = await supabase
        .from('organizations')
        .update({
          settings: {
            ...currentSettings,
            employment_terms_pdf_url: publicUrl,
            employment_terms_pdf_name: file.name
          }
        })
        .eq('id', profile.organization_id);

      if (updateError) throw updateError;

      setPdfUrl(publicUrl);
      setPdfFileName(file.name);
      toast.success('PDF файл загружен');
    } catch (err) {
      console.error('Error uploading PDF:', err);
      toast.error('Ошибка загрузки: ' + getErrorMessage(err));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeletePdf = async () => {
    if (!profile?.organization_id || !pdfUrl) return;

    try {
      const fileName = `${profile.organization_id}/employment-terms.pdf`;

      // Удаляем файл из storage
      await supabase.storage
        .from('employment-docs')
        .remove([fileName]);

      // Обновляем настройки
      const { data: orgData, error: fetchError } = await supabase
        .from('organizations')
        .select('settings')
        .eq('id', profile.organization_id)
        .single();

      if (fetchError) throw fetchError;

      const currentSettings = (orgData?.settings as Record<string, unknown>) || {};
      delete currentSettings.employment_terms_pdf_url;
      delete currentSettings.employment_terms_pdf_name;

      const { error: updateError } = await supabase
        .from('organizations')
        .update({ settings: currentSettings })
        .eq('id', profile.organization_id);

      if (updateError) throw updateError;

      setPdfUrl(null);
      setPdfFileName(null);
      toast.success('PDF файл удалён');
    } catch (err) {
      console.error('Error deleting PDF:', err);
      toast.error('Ошибка удаления: ' + getErrorMessage(err));
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
      <CardContent className="space-y-6">
        {/* PDF Upload Section */}
        <div className="space-y-3">
          <Label>PDF-версия условий (опционально)</Label>
          
          {pdfUrl ? (
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <FileText className="h-8 w-8 text-red-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{pdfFileName || 'employment-terms.pdf'}</p>
                <a 
                  href={pdfUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <Download className="h-3 w-3" />
                  Скачать
                </a>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeletePdf}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileUpload}
                className="hidden"
                id="pdf-upload"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Загрузка...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Загрузить PDF
                  </>
                )}
              </Button>
              <span className="text-xs text-muted-foreground">
                Максимум 10MB
              </span>
            </div>
          )}
        </div>

        {/* Text Terms Section */}
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
              Сохранить текст
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};