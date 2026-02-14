import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, HelpCircle, Check, Trash2, RefreshCw } from 'lucide-react';
import { selfHostedPost } from '@/lib/selfHostedApi';
import { useToast } from '@/hooks/use-toast';

interface FAQItem {
  id?: string;
  question_cluster: string;
  best_answer: string;
  source_example_ids: string[];
  frequency: number;
  approved?: boolean;
}

export function ExtractedFAQPanel() {
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const { toast } = useToast();

  const loadFAQs = async () => {
    setIsLoading(true);
    try {
      const response = await selfHostedPost<{ faqs: FAQItem[] }>('extract-faq', { action: 'list' });
      if (response.success && response.data?.faqs) {
        setFaqs(response.data.faqs);
      }
    } catch (err) {
      console.error('Error loading FAQs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadFAQs(); }, []);

  const extractFAQs = async () => {
    setIsExtracting(true);
    try {
      const response = await selfHostedPost<{ faqs: FAQItem[]; saved: number; message?: string }>('extract-faq', { action: 'extract' });
      if (response.success && response.data) {
        if (response.data.message) {
          toast({ title: 'Информация', description: response.data.message });
        } else {
          toast({ title: 'FAQ извлечены', description: `Найдено ${response.data.faqs?.length || 0} вопросов, сохранено ${response.data.saved}` });
          await loadFAQs();
        }
      } else {
        toast({ title: 'Ошибка', description: response.error || 'Не удалось извлечь FAQ', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Ошибка', description: 'Не удалось извлечь FAQ', variant: 'destructive' });
    } finally {
      setIsExtracting(false);
    }
  };

  const approveFAQ = async (faqId: string) => {
    const response = await selfHostedPost('extract-faq', { action: 'approve', faqId });
    if (response.success) {
      setFaqs(prev => prev.map(f => f.id === faqId ? { ...f, approved: true } : f));
      toast({ title: 'FAQ одобрен' });
    }
  };

  const deleteFAQ = async (faqId: string) => {
    const response = await selfHostedPost('extract-faq', { action: 'delete', faqId });
    if (response.success) {
      setFaqs(prev => prev.filter(f => f.id !== faqId));
      toast({ title: 'FAQ удалён' });
    }
  };

  const approvedCount = faqs.filter(f => f.approved).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            FAQ из диалогов
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Автоматически извлечённые вопросы из проиндексированных диалогов
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadFAQs} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Обновить
          </Button>
          <Button onClick={extractFAQs} disabled={isExtracting} size="sm">
            {isExtracting ? (
              <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Извлечение...</>
            ) : (
              'Извлечь FAQ'
            )}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Всего FAQ</p>
            <p className="text-2xl font-bold">{faqs.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Одобрены</p>
            <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">На модерации</p>
            <p className="text-2xl font-bold text-yellow-600">{faqs.length - approvedCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* FAQ List */}
      <ScrollArea className="h-[500px]">
        <div className="space-y-3">
          {faqs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <HelpCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Нет извлечённых FAQ. Нажмите «Извлечь FAQ» для анализа диалогов.</p>
              </CardContent>
            </Card>
          ) : (
            faqs.map((faq) => (
              <Card key={faq.id || faq.question_cluster}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base">{faq.question_cluster}</CardTitle>
                      <CardDescription className="mt-1">
                        Встречается в {faq.frequency} диалогах • {faq.source_example_ids?.length || 0} источников
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-1">
                      {faq.approved ? (
                        <Badge variant="default" className="bg-green-600">Одобрен</Badge>
                      ) : (
                        <Badge variant="secondary">На модерации</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{faq.best_answer}</p>
                  {faq.id && (
                    <div className="flex gap-2 mt-3">
                      {!faq.approved && (
                        <Button size="sm" variant="outline" onClick={() => approveFAQ(faq.id!)}>
                          <Check className="h-3 w-3 mr-1" />
                          Одобрить
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteFAQ(faq.id!)}>
                        <Trash2 className="h-3 w-3 mr-1" />
                        Удалить
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
