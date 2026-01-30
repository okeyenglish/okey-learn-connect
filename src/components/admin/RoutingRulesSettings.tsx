import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  Plus, 
  Trash2, 
  Edit,
  RefreshCw, 
  Route,
  Filter,
  Zap,
  MessageSquare,
  Clock,
  Tag,
  ArrowRight
} from 'lucide-react';
import { supabaseTyped as supabase } from '@/integrations/supabase/typedClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { getErrorMessage } from '@/lib/errorUtils';

interface RoutingRule {
  id: string;
  name: string;
  description: string | null;
  channel_type: string;
  channel_id: string | null;
  priority: number;
  conditions: {
    keywords?: string[];
    time_range?: { start: string; end: string };
  };
  actions: {
    assign_to?: string;
    auto_reply?: string;
    create_lead?: boolean;
  };
  is_enabled: boolean;
  created_at: string;
}

export const RoutingRulesSettings = () => {
  const [rules, setRules] = useState<RoutingRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<RoutingRule | null>(null);
  const { toast } = useToast();
  const { user, profile } = useAuth();

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formChannelType, setFormChannelType] = useState('all');
  const [formPriority, setFormPriority] = useState(0);
  const [formKeywords, setFormKeywords] = useState('');
  const [formTimeStart, setFormTimeStart] = useState('');
  const [formTimeEnd, setFormTimeEnd] = useState('');
  const [formAutoReply, setFormAutoReply] = useState('');
  const [formCreateLead, setFormCreateLead] = useState(false);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('routing_rules')
        .select('*')
        .order('priority', { ascending: false });

      if (error) throw error;
      setRules((data as RoutingRule[]) || []);
    } catch (error) {
      console.error('Error fetching rules:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить правила',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormChannelType('all');
    setFormPriority(0);
    setFormKeywords('');
    setFormTimeStart('');
    setFormTimeEnd('');
    setFormAutoReply('');
    setFormCreateLead(false);
    setEditingRule(null);
  };

  const openEditDialog = (rule: RoutingRule) => {
    setEditingRule(rule);
    setFormName(rule.name);
    setFormDescription(rule.description || '');
    setFormChannelType(rule.channel_type);
    setFormPriority(rule.priority);
    setFormKeywords(rule.conditions.keywords?.join(', ') || '');
    setFormTimeStart(rule.conditions.time_range?.start || '');
    setFormTimeEnd(rule.conditions.time_range?.end || '');
    setFormAutoReply(rule.actions.auto_reply || '');
    setFormCreateLead(rule.actions.create_lead || false);
    setShowAddDialog(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;

    const conditions: RoutingRule['conditions'] = {};
    const actions: RoutingRule['actions'] = {};

    if (formKeywords.trim()) {
      conditions.keywords = formKeywords.split(',').map(k => k.trim()).filter(Boolean);
    }
    if (formTimeStart && formTimeEnd) {
      conditions.time_range = { start: formTimeStart, end: formTimeEnd };
    }
    if (formAutoReply.trim()) {
      actions.auto_reply = formAutoReply;
    }
    if (formCreateLead) {
      actions.create_lead = true;
    }

    try {
      if (editingRule) {
        const { error } = await supabase
          .from('routing_rules')
          .update({
            name: formName,
            description: formDescription || null,
            channel_type: formChannelType,
            priority: formPriority,
            conditions: conditions as RoutingRule['conditions'],
            actions: actions as RoutingRule['actions'],
            updated_at: new Date().toISOString()
          })
          .eq('id', editingRule.id);

        if (error) throw error;
        toast({ title: 'Успешно', description: 'Правило обновлено' });
      } else {
        // Use organization_id from AuthProvider profile
        const organizationId = (profile as any)?.organization_id;
        if (!user) throw new Error('Not authenticated');
        if (!organizationId) throw new Error('No organization');

        const { error } = await supabase
          .from('routing_rules')
          .insert({
            organization_id: organizationId,
            name: formName,
            description: formDescription || null,
            channel_type: formChannelType,
            priority: formPriority,
            conditions: conditions as RoutingRule['conditions'],
            actions: actions as RoutingRule['actions'],
            is_enabled: true
          });

        if (error) throw error;
        toast({ title: 'Успешно', description: 'Правило создано' });
      }

      setShowAddDialog(false);
      resetForm();
      fetchRules();
    } catch (error: unknown) {
      console.error('Error saving rule:', error);
      toast({
        title: 'Ошибка',
        description: getErrorMessage(error),
        variant: 'destructive'
      });
    }
  };

  const toggleRule = async (rule: RoutingRule) => {
    try {
      const { error } = await supabase
        .from('routing_rules')
        .update({ is_enabled: !rule.is_enabled })
        .eq('id', rule.id);

      if (error) throw error;
      fetchRules();
    } catch (error) {
      console.error('Error toggling rule:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось изменить статус правила',
        variant: 'destructive'
      });
    }
  };

  const deleteRule = async (ruleId: string) => {
    try {
      const { error } = await supabase
        .from('routing_rules')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;
      toast({ title: 'Успешно', description: 'Правило удалено' });
      fetchRules();
    } catch (error) {
      console.error('Error deleting rule:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить правило',
        variant: 'destructive'
      });
    }
  };

  const getChannelTypeBadge = (type: string) => {
    switch (type) {
      case 'max':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">MAX</Badge>;
      case 'whatsapp':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">WhatsApp</Badge>;
      case 'telegram':
        return <Badge variant="outline" className="bg-sky-500/10 text-sky-600 border-sky-500/30">Telegram</Badge>;
      default:
        return <Badge variant="secondary">Все каналы</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Route className="h-5 w-5" />
                Правила маршрутизации
              </CardTitle>
              <CardDescription>
                Автоматическое распределение и обработка входящих сообщений
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchRules} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Обновить
              </Button>
              <Dialog open={showAddDialog} onOpenChange={(open) => {
                setShowAddDialog(open);
                if (!open) resetForm();
              }}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Новое правило
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>{editingRule ? 'Редактировать правило' : 'Новое правило'}</DialogTitle>
                    <DialogDescription>
                      Настройте условия и действия для автоматической обработки сообщений
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                    <div className="space-y-2">
                      <Label htmlFor="rule-name">Название правила *</Label>
                      <Input
                        id="rule-name"
                        placeholder="Автоответ на вопрос о ценах"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="rule-desc">Описание</Label>
                      <Input
                        id="rule-desc"
                        placeholder="Опционально"
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Канал</Label>
                        <Select value={formChannelType} onValueChange={setFormChannelType}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Все каналы</SelectItem>
                            <SelectItem value="max">MAX</SelectItem>
                            <SelectItem value="whatsapp">WhatsApp</SelectItem>
                            <SelectItem value="telegram">Telegram</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="priority">Приоритет</Label>
                        <Input
                          id="priority"
                          type="number"
                          value={formPriority}
                          onChange={(e) => setFormPriority(parseInt(e.target.value) || 0)}
                        />
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <h4 className="font-medium flex items-center gap-2 mb-3">
                        <Filter className="h-4 w-4" />
                        Условия
                      </h4>
                      
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="keywords" className="flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            Ключевые слова
                          </Label>
                          <Input
                            id="keywords"
                            placeholder="цена, стоимость, прайс"
                            value={formKeywords}
                            onChange={(e) => setFormKeywords(e.target.value)}
                          />
                          <p className="text-xs text-muted-foreground">Через запятую</p>
                        </div>

                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Время действия
                          </Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="time"
                              value={formTimeStart}
                              onChange={(e) => setFormTimeStart(e.target.value)}
                              className="w-32"
                            />
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            <Input
                              type="time"
                              value={formTimeEnd}
                              onChange={(e) => setFormTimeEnd(e.target.value)}
                              className="w-32"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <h4 className="font-medium flex items-center gap-2 mb-3">
                        <Zap className="h-4 w-4" />
                        Действия
                      </h4>
                      
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="auto-reply" className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            Автоответ
                          </Label>
                          <Textarea
                            id="auto-reply"
                            placeholder="Здравствуйте! Наши цены вы можете посмотреть на сайте..."
                            value={formAutoReply}
                            onChange={(e) => setFormAutoReply(e.target.value)}
                            rows={3}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>Создать лид</Label>
                            <p className="text-sm text-muted-foreground">Автоматически создать лид в CRM</p>
                          </div>
                          <Switch checked={formCreateLead} onCheckedChange={setFormCreateLead} />
                        </div>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => { setShowAddDialog(false); resetForm(); }}>
                      Отмена
                    </Button>
                    <Button onClick={handleSave} disabled={!formName.trim()}>
                      {editingRule ? 'Сохранить' : 'Создать'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Route className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Нет правил маршрутизации</p>
              <p className="text-sm mt-1">Создайте правила для автоматической обработки сообщений</p>
              <Button className="mt-4" onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Создать правило
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {rules.map((rule) => (
                <div 
                  key={rule.id} 
                  className={`border rounded-lg p-4 transition-opacity ${!rule.is_enabled ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{rule.name}</h4>
                        {getChannelTypeBadge(rule.channel_type)}
                        <Badge variant="outline">Приоритет: {rule.priority}</Badge>
                      </div>
                      {rule.description && (
                        <p className="text-sm text-muted-foreground">{rule.description}</p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {rule.conditions.keywords && rule.conditions.keywords.length > 0 && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Tag className="h-3 w-3" />
                            {rule.conditions.keywords.join(', ')}
                          </div>
                        )}
                        {rule.conditions.time_range && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {rule.conditions.time_range.start} — {rule.conditions.time_range.end}
                          </div>
                        )}
                        {rule.actions.auto_reply && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MessageSquare className="h-3 w-3" />
                            Автоответ
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={rule.is_enabled} 
                        onCheckedChange={() => toggleRule(rule)} 
                      />
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(rule)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Удалить правило?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Правило «{rule.name}» будет удалено. Это действие нельзя отменить.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Отмена</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => deleteRule(rule.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Удалить
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};