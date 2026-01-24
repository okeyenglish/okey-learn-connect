import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/typedClient";
import { syncAutoGroup } from "@/utils/groupHelpers";
import { AlertCircle, RefreshCw, Settings2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LearningGroup } from "@/hooks/useLearningGroups";

interface AutoGroupSettingsModalProps {
  group: LearningGroup;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface FilterConditions {
  branch?: string;
  level?: string;
  subject?: string;
  status?: string;
  age_min?: number;
  age_max?: number;
  age_category?: string;
}

export const AutoGroupSettingsModal = ({
  group,
  open,
  onOpenChange,
  onSuccess
}: AutoGroupSettingsModalProps) => {
  const { toast } = useToast();
  const [isAutoGroup, setIsAutoGroup] = useState(group.is_auto_group || false);
  const [conditions, setConditions] = useState<FilterConditions>(
    group.auto_filter_conditions || {}
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (open) {
      setIsAutoGroup(group.is_auto_group || false);
      setConditions(group.auto_filter_conditions || {});
    }
  }, [open, group]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Обновляем настройки группы
      const { error: updateError } = await supabase
        .from('learning_groups')
        .update({
          is_auto_group: isAutoGroup,
          auto_filter_conditions: isAutoGroup ? (conditions as any) : null
        })
        .eq('id', group.id);

      if (updateError) throw updateError;

      // Если включили авто-группу - синхронизируем состав
      if (isAutoGroup) {
        setIsSyncing(true);
        await syncAutoGroup(group.id);
      }

      toast({
        title: "Успешно",
        description: isAutoGroup 
          ? "Настройки авто-группы сохранены и состав синхронизирован"
          : "Авто-группа отключена"
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving auto-group settings:', error);
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось сохранить настройки",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
      setIsSyncing(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await syncAutoGroup(group.id);
      toast({
        title: "Успешно",
        description: "Состав авто-группы синхронизирован"
      });
      onSuccess?.();
    } catch (error: any) {
      console.error('Error syncing auto-group:', error);
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось синхронизировать группу",
        variant: "destructive"
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Настройки авто-группы
          </DialogTitle>
          <DialogDescription>
            Авто-группы автоматически управляют составом студентов на основе заданных условий
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Включить/выключить авто-группу */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-group-enabled" className="text-base">
                Включить авто-группу
              </Label>
              <p className="text-sm text-muted-foreground">
                Состав группы будет формироваться автоматически по условиям
              </p>
            </div>
            <Switch
              id="auto-group-enabled"
              checked={isAutoGroup}
              onCheckedChange={setIsAutoGroup}
            />
          </div>

          {isAutoGroup && (
            <>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  При включении авто-группы ручное добавление и удаление студентов будет заблокировано.
                  Состав будет обновляться автоматически согласно условиям фильтра.
                </AlertDescription>
              </Alert>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Условия фильтрации</CardTitle>
                  <CardDescription>
                    Студенты, соответствующие этим условиям, будут автоматически добавлены в группу
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Филиал */}
                  <div className="space-y-2">
                    <Label htmlFor="filter-branch">Филиал</Label>
                    <Select
                      value={conditions.branch || ''}
                      onValueChange={(value) => 
                        setConditions(prev => ({ ...prev, branch: value || undefined }))
                      }
                    >
                      <SelectTrigger id="filter-branch">
                        <SelectValue placeholder="Любой филиал" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Любой филиал</SelectItem>
                        <SelectItem value="Окская">Окская</SelectItem>
                        <SelectItem value="Любе��цы">Люберцы</SelectItem>
                        <SelectItem value="Котельники">Котельники</SelectItem>
                        <SelectItem value="Мытищи">Мытищи</SelectItem>
                        <SelectItem value="Новокосино">Новокосино</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Уровень */}
                  <div className="space-y-2">
                    <Label htmlFor="filter-level">Уровень</Label>
                    <Select
                      value={conditions.level || ''}
                      onValueChange={(value) => 
                        setConditions(prev => ({ ...prev, level: value || undefined }))
                      }
                    >
                      <SelectTrigger id="filter-level">
                        <SelectValue placeholder="Любой уровень" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Любой уровень</SelectItem>
                        <SelectItem value="Beginner">Beginner</SelectItem>
                        <SelectItem value="Elementary">Elementary</SelectItem>
                        <SelectItem value="Pre-Intermediate">Pre-Intermediate</SelectItem>
                        <SelectItem value="Intermediate">Intermediate</SelectItem>
                        <SelectItem value="Upper-Intermediate">Upper-Intermediate</SelectItem>
                        <SelectItem value="Advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Дисциплина */}
                  <div className="space-y-2">
                    <Label htmlFor="filter-subject">Дисциплина</Label>
                    <Select
                      value={conditions.subject || ''}
                      onValueChange={(value) => 
                        setConditions(prev => ({ ...prev, subject: value || undefined }))
                      }
                    >
                      <SelectTrigger id="filter-subject">
                        <SelectValue placeholder="Любая дисциплина" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Любая дисциплина</SelectItem>
                        <SelectItem value="Английский">Английский</SelectItem>
                        <SelectItem value="Немецкий">Немецкий</SelectItem>
                        <SelectItem value="Французский">Французский</SelectItem>
                        <SelectItem value="Испанский">Испанский</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Статус студента */}
                  <div className="space-y-2">
                    <Label htmlFor="filter-status">Статус студента</Label>
                    <Select
                      value={conditions.status || 'active'}
                      onValueChange={(value) => 
                        setConditions(prev => ({ ...prev, status: value }))
                      }
                    >
                      <SelectTrigger id="filter-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Активные</SelectItem>
                        <SelectItem value="paused">Приостановленные</SelectItem>
                        <SelectItem value="all">Все</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Кнопка ручной синхронизации */}
              {group.is_auto_group && (
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={handleSync}
                  disabled={isSyncing}
                >
                  <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Синхронизация...' : 'Синхронизировать состав сейчас'}
                </Button>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving || isSyncing}
          >
            Отмена
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || isSyncing}
          >
            {isSaving ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
