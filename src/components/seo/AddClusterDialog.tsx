import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/typedClient";
import { useToast } from "@/hooks/use-toast";
import { getCurrentOrganizationId } from "@/lib/organizationHelpers";
import { getErrorMessage } from '@/lib/errorUtils';

interface AddClusterDialogProps {
  onClusterAdded: () => void;
}

export const AddClusterDialog = ({ onClusterAdded }: AddClusterDialogProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    headTerm: "",
    keywords: "",
    intent: "informational",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.headTerm.trim() || !formData.keywords.trim()) {
      toast({
        title: "Ошибка",
        description: "Заполните все обязательные поля",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const orgId = await getCurrentOrganizationId();
      
      // Разбиваем ключевые слова на массив
      const keywordsList = formData.keywords
        .split('\n')
        .map(k => k.trim())
        .filter(k => k.length > 0);

      // Создаем кластер
      const { data: cluster, error: clusterError } = await supabase
        .from('kw_clusters')
        .insert({
          organization_id: orgId,
          head_term: formData.headTerm,
          slug: formData.headTerm.toLowerCase().replace(/\s+/g, '-'),
          intent: formData.intent,
          members: keywordsList,
          score: 50,
          status: 'pending',
        })
        .select()
        .single();

      if (clusterError) throw clusterError;

      // Добавляем нормализованные ключевые слова
      const kwNormData = keywordsList.map(kw => ({
        organization_id: orgId,
        phrase: kw,
        region: 'ru',
        monthly_searches: 0,
        difficulty: 50,
        intent: formData.intent,
      }));

      const { error: kwError } = await supabase
        .from('kw_norm')
        .insert(kwNormData);

      if (kwError) console.error('Error adding keywords:', kwError);

      toast({
        title: "Кластер создан",
        description: `Добавлено ${keywordsList.length} ключевых слов`,
      });

      setFormData({ headTerm: "", keywords: "", intent: "informational" });
      setOpen(false);
      onClusterAdded();
    } catch (error: unknown) {
      console.error('Error creating cluster:', error);
      toast({
        title: "Ошибка",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Добавить кластер
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Создать кластер запросов</DialogTitle>
          <DialogDescription>
            Добавьте основной термин и список связанных ключевых слов
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="headTerm">Основной термин *</Label>
            <Input
              id="headTerm"
              placeholder="Например: курсы английского для детей"
              value={formData.headTerm}
              onChange={(e) => setFormData({ ...formData, headTerm: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="intent">Поисковый намерение</Label>
            <select
              id="intent"
              className="w-full h-10 px-3 rounded-md border border-input bg-background"
              value={formData.intent}
              onChange={(e) => setFormData({ ...formData, intent: e.target.value })}
            >
              <option value="informational">Информационный</option>
              <option value="commercial">Коммерческий</option>
              <option value="transactional">Транзакционный</option>
              <option value="navigational">Навигационный</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="keywords">Ключевые слова *</Label>
            <Textarea
              id="keywords"
              placeholder="Введите каждый запрос с новой строки:&#10;английский для детей онлайн&#10;детские курсы английского&#10;обучение английскому ребенка"
              value={formData.keywords}
              onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
              rows={8}
            />
            <p className="text-xs text-muted-foreground">
              Каждый запрос с новой строки
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Создание..." : "Создать кластер"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};