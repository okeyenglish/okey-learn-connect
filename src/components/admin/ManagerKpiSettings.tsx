import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Target, Plus, Pencil, Trash2, User, Phone, TrendingUp, Percent } from "lucide-react";
import { useManagerKpiSettings, useUpsertManagerKpi, useDeleteManagerKpi } from "@/hooks/useManagerKpi";
import { useOrganization } from "@/hooks/useOrganization";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_KPI_SETTINGS, ManagerKpiWithProfile } from "@/types/kpi";

interface KpiFormData {
  profile_id: string;
  min_call_score: number;
  min_calls_per_day: number;
  min_answered_rate: number;
}

export const ManagerKpiSettings = () => {
  const { organization } = useOrganization();
  const { data: kpiSettings = [], isLoading } = useManagerKpiSettings(organization?.id);
  const upsertKpi = useUpsertManagerKpi();
  const deleteKpi = useDeleteManagerKpi();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingKpi, setEditingKpi] = useState<ManagerKpiWithProfile | null>(null);
  const [formData, setFormData] = useState<KpiFormData>({
    profile_id: '',
    min_call_score: DEFAULT_KPI_SETTINGS.min_call_score,
    min_calls_per_day: DEFAULT_KPI_SETTINGS.min_calls_per_day,
    min_answered_rate: DEFAULT_KPI_SETTINGS.min_answered_rate,
  });

  // Get managers (profiles with manager role)
  const { data: managers = [] } = useQuery({
    queryKey: ['managers-for-kpi', organization?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          email
        `)
        .eq('organization_id', organization?.id)
        .eq('is_active', true);

      if (error) throw error;
      return data || [];
    },
    enabled: !!organization?.id,
  });

  const managersWithoutKpi = managers.filter(
    (m) => !kpiSettings.some((k) => k.profile_id === m.id)
  );

  const openAddDialog = () => {
    setEditingKpi(null);
    setFormData({
      profile_id: '',
      min_call_score: DEFAULT_KPI_SETTINGS.min_call_score,
      min_calls_per_day: DEFAULT_KPI_SETTINGS.min_calls_per_day,
      min_answered_rate: DEFAULT_KPI_SETTINGS.min_answered_rate,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (kpi: ManagerKpiWithProfile) => {
    setEditingKpi(kpi);
    setFormData({
      profile_id: kpi.profile_id,
      min_call_score: kpi.min_call_score,
      min_calls_per_day: kpi.min_calls_per_day,
      min_answered_rate: kpi.min_answered_rate,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!organization?.id || !formData.profile_id) return;

    upsertKpi.mutate({
      profile_id: formData.profile_id,
      organization_id: organization.id,
      min_call_score: formData.min_call_score,
      min_calls_per_day: formData.min_calls_per_day,
      min_answered_rate: formData.min_answered_rate,
    }, {
      onSuccess: () => setDialogOpen(false),
    });
  };

  const handleDelete = (profileId: string) => {
    if (confirm('Удалить настройки KPI для этого менеджера?')) {
      deleteKpi.mutate(profileId);
    }
  };

  const getManagerName = (kpi: ManagerKpiWithProfile) => {
    const profile = kpi.profiles;
    if (!profile) return 'Неизвестный';
    return [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.email || 'Неизвестный';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-muted-foreground">Загрузка настроек KPI...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Настройки KPI менеджеров
            </CardTitle>
            <CardDescription>
              Установите индивидуальные целевые показатели для каждого менеджера
            </CardDescription>
          </div>
          <Button onClick={openAddDialog} disabled={managersWithoutKpi.length === 0}>
            <Plus className="h-4 w-4 mr-2" />
            Добавить KPI
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {kpiSettings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Настройки KPI пока не заданы</p>
            <p className="text-sm">Добавьте целевые показатели для менеджеров</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
              {kpiSettings.map((kpi) => (
                <div key={kpi.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{getManagerName(kpi)}</div>
                        <div className="text-sm text-muted-foreground">
                          {kpi.profiles?.email}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(kpi)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(kpi.profile_id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  
                  <Separator className="my-3" />
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-xs text-muted-foreground">Мин. оценка</div>
                        <Badge variant="secondary">{kpi.min_call_score}/10</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-xs text-muted-foreground">Звонков/день</div>
                        <Badge variant="secondary">{kpi.min_calls_per_day}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Percent className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-xs text-muted-foreground">% отвеченных</div>
                        <Badge variant="secondary">{Math.round(kpi.min_answered_rate * 100)}%</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingKpi ? 'Редактировать KPI' : 'Добавить KPI менеджера'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {!editingKpi && (
              <div className="space-y-2">
                <Label>Менеджер</Label>
                <Select
                  value={formData.profile_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, profile_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите менеджера" />
                  </SelectTrigger>
                  <SelectContent>
                    {managersWithoutKpi.map((manager) => (
                      <SelectItem key={manager.id} value={manager.id}>
                        {[manager.first_name, manager.last_name].filter(Boolean).join(' ') || manager.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Минимальная оценка звонка</Label>
                <Badge variant="outline">{formData.min_call_score}/10</Badge>
              </div>
              <Slider
                value={[formData.min_call_score]}
                onValueChange={([value]) => setFormData(prev => ({ ...prev, min_call_score: value }))}
                min={1}
                max={10}
                step={0.5}
              />
            </div>

            <div className="space-y-2">
              <Label>Минимум звонков в день</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={formData.min_calls_per_day}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  min_calls_per_day: parseInt(e.target.value) || 1 
                }))}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Минимальный % отвеченных звонков</Label>
                <Badge variant="outline">{Math.round(formData.min_answered_rate * 100)}%</Badge>
              </div>
              <Slider
                value={[formData.min_answered_rate * 100]}
                onValueChange={([value]) => setFormData(prev => ({ ...prev, min_answered_rate: value / 100 }))}
                min={10}
                max={100}
                step={5}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Отмена
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!formData.profile_id || upsertKpi.isPending}
            >
              {upsertKpi.isPending ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
