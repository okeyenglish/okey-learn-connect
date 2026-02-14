import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { selfHostedPost } from '@/lib/selfHostedApi';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import {
  Sparkles, Plus, Pencil, Trash2, Users, RefreshCw, Play,
  Shield, TrendingUp, Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Persona {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  tone: string | null;
  selling_level: string;
  formality: string;
  max_response_length: number;
  style_instructions: string | null;
  system_prompt_override: string | null;
  is_default: boolean;
  is_active: boolean;
  auto_assign_stages: string[];
  auto_assign_scenario_types: string[];
  usage_count: number;
  avg_feedback_score: number;
  conversion_rate: number;
}

const STAGE_OPTIONS = [
  { value: 'greeting', label: 'Приветствие' },
  { value: 'qualification', label: 'Квалификация' },
  { value: 'need_discovery', label: 'Выявление потребности' },
  { value: 'value_explanation', label: 'Презентация ценности' },
  { value: 'objection', label: 'Возражение' },
  { value: 'offer', label: 'Предложение' },
  { value: 'closing', label: 'Закрытие' },
  { value: 'follow_up', label: 'Follow-up' },
];

const SCENARIO_OPTIONS = [
  { value: 'new_lead', label: 'Новый лид' },
  { value: 'returning', label: 'Возврат' },
  { value: 'complaint', label: 'Жалоба' },
  { value: 'upsell', label: 'Допродажа' },
  { value: 'reactivation', label: 'Реактивация' },
  { value: 'info_request', label: 'Запрос информации' },
  { value: 'scheduling', label: 'Расписание' },
  { value: 'payment', label: 'Оплата' },
];

const SELLING_LEVELS = [
  { value: 'none', label: 'Без продажи' },
  { value: 'soft', label: 'Мягкая' },
  { value: 'moderate', label: 'Умеренная' },
  { value: 'aggressive', label: 'Агрессивная' },
];

const FORMALITY_OPTIONS = [
  { value: 'informal', label: 'Неформальный' },
  { value: 'neutral', label: 'Нейтральный' },
  { value: 'formal', label: 'Формальный' },
];

const emptyPersona: Omit<Persona, 'id' | 'usage_count' | 'avg_feedback_score' | 'conversion_rate'> = {
  slug: '',
  name: '',
  description: '',
  tone: '',
  selling_level: 'soft',
  formality: 'neutral',
  max_response_length: 150,
  style_instructions: '',
  system_prompt_override: null,
  is_default: false,
  is_active: true,
  auto_assign_stages: [],
  auto_assign_scenario_types: [],
};

export function PersonaManager() {
  const { profile } = useAuth();
  const orgId = (profile as any)?.organization_id;
  const queryClient = useQueryClient();
  const [editingPersona, setEditingPersona] = useState<Partial<Persona> | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [tagging, setTagging] = useState(false);

  const { data: personas, isLoading } = useQuery({
    queryKey: ['ai-personas', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_personas')
        .select('*')
        .eq('organization_id', orgId)
        .order('is_default', { ascending: false });
      if (error) throw error;
      return (data || []) as Persona[];
    },
    enabled: !!orgId,
  });

  const saveMutation = useMutation({
    mutationFn: async (persona: Partial<Persona>) => {
      if (persona.id) {
        const { error } = await supabase
          .from('ai_personas')
          .update({
            name: persona.name,
            slug: persona.slug,
            description: persona.description,
            tone: persona.tone,
            selling_level: persona.selling_level,
            formality: persona.formality,
            max_response_length: persona.max_response_length,
            style_instructions: persona.style_instructions,
            system_prompt_override: persona.system_prompt_override,
            is_default: persona.is_default,
            is_active: persona.is_active,
            auto_assign_stages: persona.auto_assign_stages,
            auto_assign_scenario_types: persona.auto_assign_scenario_types,
          })
          .eq('id', persona.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('ai_personas')
          .insert({
            organization_id: orgId,
            ...persona,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-personas'] });
      setIsDialogOpen(false);
      setEditingPersona(null);
      toast.success('Персона сохранена');
    },
    onError: (err: Error) => {
      toast.error(`Ошибка: ${err.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ai_personas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-personas'] });
      toast.success('Персона удалена');
    },
  });

  const handleRunTagger = async () => {
    if (!orgId) return;
    setTagging(true);
    try {
      const result = await selfHostedPost('persona-tagger', {
        organization_id: orgId,
        batch_size: 100,
      }) as any;
      const data = result?.data || result;
      toast.success(`Размечено: ${data.tagged || 0} из ${data.total || 0} примеров`);
    } catch (err: any) {
      toast.error(`Ошибка: ${err.message}`);
    } finally {
      setTagging(false);
    }
  };

  const openCreate = () => {
    setEditingPersona({ ...emptyPersona });
    setIsDialogOpen(true);
  };

  const openEdit = (p: Persona) => {
    setEditingPersona({ ...p });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Persona Layer
          </h3>
          <p className="text-sm text-muted-foreground">
            Управление стилями общения AI — каждая персона определяет тон, уровень продажи и стратегию
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRunTagger} disabled={tagging}>
            <Play className={cn('h-4 w-4 mr-1', tagging && 'animate-spin')} />
            {tagging ? 'Разметка...' : 'Авто-разметка примеров'}
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />
            Новая персона
          </Button>
        </div>
      </div>

      {/* Personas grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48" />)}
        </div>
      ) : personas && personas.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {personas.map(persona => (
            <Card key={persona.id} className={cn(!persona.is_active && 'opacity-50')}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    {persona.name}
                    {persona.is_default && (
                      <Badge variant="secondary" className="text-[10px]">По умолчанию</Badge>
                    )}
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(persona)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    {!persona.is_default && (
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive"
                        onClick={() => deleteMutation.mutate(persona.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
                <CardDescription className="text-xs">{persona.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {/* Tags */}
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-[10px]">
                    Продажа: {SELLING_LEVELS.find(s => s.value === persona.selling_level)?.label}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {FORMALITY_OPTIONS.find(f => f.value === persona.formality)?.label}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    Max {persona.max_response_length} слов
                  </Badge>
                </div>

                {/* Auto-assign stages */}
                {persona.auto_assign_stages?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {persona.auto_assign_stages.map(stage => (
                      <Badge key={stage} variant="secondary" className="text-[9px]">
                        {STAGE_OPTIONS.find(s => s.value === stage)?.label || stage}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Stats */}
                <div className="flex items-center gap-3 pt-1 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-0.5">
                    <Zap className="h-3 w-3" /> {persona.usage_count} исп.
                  </span>
                  {persona.avg_feedback_score > 0 && (
                    <span className="flex items-center gap-0.5">
                      <TrendingUp className="h-3 w-3" /> {persona.avg_feedback_score.toFixed(1)} fb
                    </span>
                  )}
                  {persona.conversion_rate > 0 && (
                    <span className="flex items-center gap-0.5">
                      <Shield className="h-3 w-3" /> {persona.conversion_rate.toFixed(0)}% конв.
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Sparkles className="h-10 w-10 mb-3 opacity-40" />
            <p>Персоны не настроены</p>
            <p className="text-xs mt-1">Выполните SQL миграцию для создания дефолтных персон</p>
          </CardContent>
        </Card>
      )}

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPersona?.id ? 'Редактировать персону' : 'Создать персону'}
            </DialogTitle>
          </DialogHeader>
          {editingPersona && (
            <PersonaForm
              persona={editingPersona}
              onChange={setEditingPersona}
              onSave={() => saveMutation.mutate(editingPersona)}
              saving={saveMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PersonaForm({ persona, onChange, onSave, saving }: {
  persona: Partial<Persona>;
  onChange: (p: Partial<Persona>) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const update = (field: string, value: any) => onChange({ ...persona, [field]: value });

  const toggleArrayItem = (field: 'auto_assign_stages' | 'auto_assign_scenario_types', value: string) => {
    const arr = persona[field] || [];
    const next = arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];
    update(field, next);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Название</Label>
          <Input value={persona.name || ''} onChange={e => update('name', e.target.value)} placeholder="Академический консультант" />
        </div>
        <div>
          <Label>Slug (ID)</Label>
          <Input value={persona.slug || ''} onChange={e => update('slug', e.target.value)} placeholder="academic_guide" />
        </div>
      </div>

      <div>
        <Label>Описание</Label>
        <Textarea value={persona.description || ''} onChange={e => update('description', e.target.value)} rows={2} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label>Тон общения</Label>
          <Input value={persona.tone || ''} onChange={e => update('tone', e.target.value)} placeholder="спокойный, дружелюбный" />
        </div>
        <div>
          <Label>Уровень продажи</Label>
          <Select value={persona.selling_level || 'soft'} onValueChange={v => update('selling_level', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {SELLING_LEVELS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Формальность</Label>
          <Select value={persona.formality || 'neutral'} onValueChange={v => update('formality', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {FORMALITY_OPTIONS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>Макс. длина ответа (слов)</Label>
        <Input type="number" value={persona.max_response_length || 150} onChange={e => update('max_response_length', parseInt(e.target.value))} />
      </div>

      <div>
        <Label>Инструкции по стилю</Label>
        <Textarea value={persona.style_instructions || ''} onChange={e => update('style_instructions', e.target.value)} rows={3}
          placeholder="Объясняй пользу обучения. Не дави на продажу..." />
      </div>

      {/* Auto-assign stages */}
      <div>
        <Label className="mb-2 block">Авто-назначение по стадиям</Label>
        <div className="flex flex-wrap gap-1.5">
          {STAGE_OPTIONS.map(s => (
            <Badge
              key={s.value}
              variant={(persona.auto_assign_stages || []).includes(s.value) ? 'default' : 'outline'}
              className="cursor-pointer text-xs"
              onClick={() => toggleArrayItem('auto_assign_stages', s.value)}
            >
              {s.label}
            </Badge>
          ))}
        </div>
      </div>

      {/* Auto-assign scenarios */}
      <div>
        <Label className="mb-2 block">Авто-назначение по типу сценария</Label>
        <div className="flex flex-wrap gap-1.5">
          {SCENARIO_OPTIONS.map(s => (
            <Badge
              key={s.value}
              variant={(persona.auto_assign_scenario_types || []).includes(s.value) ? 'default' : 'outline'}
              className="cursor-pointer text-xs"
              onClick={() => toggleArrayItem('auto_assign_scenario_types', s.value)}
            >
              {s.label}
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Switch checked={persona.is_default || false} onCheckedChange={v => update('is_default', v)} />
          <Label>По умолчанию</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={persona.is_active !== false} onCheckedChange={v => update('is_active', v)} />
          <Label>Активна</Label>
        </div>
      </div>

      <DialogFooter>
        <Button onClick={onSave} disabled={saving || !persona.name || !persona.slug}>
          {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-1" /> : null}
          Сохранить
        </Button>
      </DialogFooter>
    </div>
  );
}
