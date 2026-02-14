/**
 * Admin panel for managing Smart Replies: CRUD categories/triggers/replies + usage stats.
 */
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSmartReplyRules, type SmartReplyRule } from '@/hooks/useSmartReplyRules';
import { DEFAULT_RULES, mergeRules } from '@/hooks/useSmartReplies';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Sparkles, TrendingUp, Users, User, Search, ChevronDown, ChevronUp,
  BarChart3, MessageSquare, Plus, Pencil, Trash2, X, Check, Save,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface StatRow {
  user_id: string;
  reply_text: string;
  category: string;
  use_count: number;
  last_used_at: string;
}

interface ProfileRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

interface EditForm {
  category: string;
  label: string;
  triggers: string;
  replies: string;
}

const emptyForm: EditForm = { category: '', label: '', triggers: '', replies: '' };

export function SmartRepliesManager() {
  const { profile } = useAuth();
  const organizationId = profile?.organization_id;
  const { rules: customRules, createRule, updateRule, deleteRule } = useSmartReplyRules();

  const [search, setSearch] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<(SmartReplyRule & { isDefault?: boolean }) | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SmartReplyRule | null>(null);
  const [form, setForm] = useState<EditForm>(emptyForm);

  // Merged rules (defaults + custom)
  const allCategories = useMemo(() => {
    const merged = mergeRules(customRules.map(r => ({
      category: r.category,
      label: r.label,
      triggers: r.triggers,
      replies: r.replies,
    })));
    // Mark which ones have custom DB record
    return merged.map(rule => {
      const dbRule = customRules.find(cr => cr.category === rule.category);
      return { ...rule, dbId: dbRule?.id, hasCustom: !!dbRule };
    });
  }, [customRules]);

  // Fetch all stats for the org
  const { data: stats = [] } = useQuery({
    queryKey: ['admin-smart-reply-stats', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('smart_reply_stats')
        .select('user_id, reply_text, category, use_count, last_used_at')
        .eq('organization_id', organizationId)
        .order('use_count', { ascending: false });
      if (error) {
        console.warn('smart_reply_stats not available:', error.message);
        return [];
      }
      return (data || []) as StatRow[];
    },
    enabled: !!organizationId,
    staleTime: 30_000,
  });

  // Fetch profiles for user names
  const userIds = useMemo(() => [...new Set(stats.map(s => s.user_id))], [stats]);
  const { data: profiles = [] } = useQuery({
    queryKey: ['admin-profiles-for-stats', userIds],
    queryFn: async () => {
      if (userIds.length === 0) return [];
      const { data } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', userIds);
      return (data || []) as ProfileRow[];
    },
    enabled: userIds.length > 0,
  });

  const profileMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of profiles) {
      map.set(p.id, [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Без имени');
    }
    return map;
  }, [profiles]);

  // Aggregate stats per reply text
  const aggregated = useMemo(() => {
    const map = new Map<string, { total: number; users: Map<string, number>; category: string; lastUsed: string }>();
    for (const row of stats) {
      const existing = map.get(row.reply_text);
      if (existing) {
        existing.total += row.use_count;
        existing.users.set(row.user_id, (existing.users.get(row.user_id) || 0) + row.use_count);
        if (row.last_used_at > existing.lastUsed) existing.lastUsed = row.last_used_at;
      } else {
        const users = new Map<string, number>();
        users.set(row.user_id, row.use_count);
        map.set(row.reply_text, { total: row.use_count, users, category: row.category, lastUsed: row.last_used_at });
      }
    }
    return map;
  }, [stats]);

  const totalUses = useMemo(() => stats.reduce((sum, r) => sum + r.use_count, 0), [stats]);
  const uniqueUsers = useMemo(() => new Set(stats.map(s => s.user_id)).size, [stats]);

  const topReplies = useMemo(() => {
    return [...aggregated.entries()]
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 20);
  }, [aggregated]);

  const categoryStats = useMemo(() => {
    return allCategories.map(cat => {
      const catStats = stats.filter(s => s.category === cat.category);
      const total = catStats.reduce((sum, r) => sum + r.use_count, 0);
      const repliesWithStats = cat.replies.map(reply => {
        const agg = aggregated.get(reply);
        return { text: reply, total: agg?.total || 0, users: agg?.users || new Map() };
      }).sort((a, b) => b.total - a.total);
      return { ...cat, totalUses: total, repliesWithStats };
    }).sort((a, b) => b.totalUses - a.totalUses);
  }, [stats, aggregated, allCategories]);

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categoryStats;
    const q = search.toLowerCase();
    return categoryStats.filter(c =>
      c.label.toLowerCase().includes(q) ||
      c.replies.some(r => r.toLowerCase().includes(q)) ||
      c.triggers.some(t => t.toLowerCase().includes(q))
    );
  }, [categoryStats, search]);

  // ─── CRUD handlers ───

  const openCreate = () => {
    setForm(emptyForm);
    setShowCreateDialog(true);
  };

  const openEdit = (cat: typeof categoryStats[0]) => {
    const dbRule = customRules.find(cr => cr.category === cat.category);
    const defaultRule = DEFAULT_RULES.find(r => r.category === cat.category);
    setForm({
      category: cat.category,
      label: cat.label,
      triggers: cat.triggers.join('\n'),
      replies: cat.replies.join('\n'),
    });
    setEditingRule({
      ...(dbRule || { id: '', organization_id: '', category: cat.category, label: cat.label, triggers: cat.triggers, replies: cat.replies, is_active: true, sort_order: 0, created_at: '', updated_at: '' }),
      isDefault: !!defaultRule && !dbRule,
    });
  };

  const handleSaveNew = () => {
    const triggers = form.triggers.split('\n').map(s => s.trim()).filter(Boolean);
    const replies = form.replies.split('\n').map(s => s.trim()).filter(Boolean);
    if (!form.category.trim() || !form.label.trim() || triggers.length === 0 || replies.length === 0) {
      toast.error('Заполните все поля');
      return;
    }
    createRule.mutate({
      category: form.category.trim().toLowerCase().replace(/\s+/g, '_'),
      label: form.label.trim(),
      triggers,
      replies,
      is_active: true,
      sort_order: allCategories.length,
    }, {
      onSuccess: () => setShowCreateDialog(false),
    });
  };

  const handleSaveEdit = () => {
    if (!editingRule) return;
    const triggers = form.triggers.split('\n').map(s => s.trim()).filter(Boolean);
    const replies = form.replies.split('\n').map(s => s.trim()).filter(Boolean);
    if (!form.label.trim() || triggers.length === 0 || replies.length === 0) {
      toast.error('Заполните все поля');
      return;
    }

    const dbRule = customRules.find(cr => cr.category === editingRule.category);
    if (dbRule) {
      // Update existing
      updateRule.mutate({ id: dbRule.id, label: form.label.trim(), triggers, replies }, {
        onSuccess: () => setEditingRule(null),
      });
    } else {
      // Create new (overriding default)
      createRule.mutate({
        category: editingRule.category,
        label: form.label.trim(),
        triggers,
        replies,
        is_active: true,
        sort_order: allCategories.length,
      }, {
        onSuccess: () => setEditingRule(null),
      });
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    const dbRule = customRules.find(cr => cr.category === (deleteTarget as any).category);
    if (dbRule) {
      deleteRule.mutate(dbRule.id, { onSuccess: () => setDeleteTarget(null) });
    } else {
      toast.error('Нельзя удалить встроенную категорию без кастомной записи');
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-primary" />
            Smart Replies
          </h1>
          <p className="text-muted-foreground mt-1">
            Управление быстрыми ответами и статистика использования
          </p>
        </div>
        <Button onClick={openCreate} className="gap-1.5">
          <Plus className="h-4 w-4" /> Новая категория
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4" /> Всего ответов
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allCategories.reduce((s, c) => s + c.replies.length, 0)}</div>
            <p className="text-xs text-muted-foreground">{allCategories.length} категорий</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4" /> Использований
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUses}</div>
            <p className="text-xs text-muted-foreground">за всё время</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Users className="h-4 w-4" /> Сотрудников
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueUsers}</div>
            <p className="text-xs text-muted-foreground">используют smart replies</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="categories">
        <TabsList>
          <TabsTrigger value="categories">По категориям</TabsTrigger>
          <TabsTrigger value="top">Топ ответов</TabsTrigger>
          <TabsTrigger value="users">По сотрудникам</TabsTrigger>
        </TabsList>

        {/* === CATEGORIES TAB === */}
        <TabsContent value="categories" className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по категориям, ответам, триггерам..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="space-y-2">
            {filteredCategories.map(cat => {
              const isExpanded = expandedCategory === cat.category;
              const isCustom = cat.hasCustom;
              const isDefault = !isCustom && !!DEFAULT_RULES.find(r => r.category === cat.category);
              return (
                <Card key={cat.category} className="overflow-hidden">
                  <div className="flex items-center">
                    <button
                      className="flex-1 text-left px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
                      onClick={() => setExpandedCategory(isExpanded ? null : cat.category)}
                    >
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-medium">{cat.label}</span>
                        <Badge variant="secondary" className="text-xs">
                          {cat.replies.length} ответов
                        </Badge>
                        {isCustom && (
                          <Badge variant="default" className="text-[10px]">кастом</Badge>
                        )}
                        {isDefault && (
                          <Badge variant="outline" className="text-[10px]">встроенная</Badge>
                        )}
                        {cat.totalUses > 0 && (
                          <Badge variant="outline" className="text-xs">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            {cat.totalUses} исп.
                          </Badge>
                        )}
                      </div>
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    <div className="flex items-center gap-1 px-2">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(cat)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {isCustom && (
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(cat as any)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t px-4 py-3 space-y-3">
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium">Триггеры:</span>{' '}
                        {cat.triggers.map((t, i) => (
                          <Badge key={i} variant="outline" className="mr-1 mb-1 text-[10px]">{t}</Badge>
                        ))}
                      </div>

                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[40px]">#</TableHead>
                            <TableHead>Ответ</TableHead>
                            <TableHead className="w-[100px] text-right">Использований</TableHead>
                            <TableHead className="w-[60px] text-right">Юзеров</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cat.repliesWithStats.map((reply, idx) => (
                            <TableRow key={reply.text}>
                              <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                              <TableCell className="font-mono text-sm">{reply.text}</TableCell>
                              <TableCell className="text-right">
                                {reply.total > 0 ? (
                                  <Badge variant={reply.total >= 10 ? 'default' : 'secondary'}>
                                    {reply.total}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground text-xs">—</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right text-xs text-muted-foreground">
                                {reply.users.size || '—'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* === TOP REPLIES TAB === */}
        <TabsContent value="top">
          {topReplies.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Пока нет данных об использовании.</p>
                <p className="text-xs mt-1">Статистика появится когда сотрудники начнут использовать smart replies.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <ScrollArea className="max-h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]">#</TableHead>
                      <TableHead>Ответ</TableHead>
                      <TableHead className="w-[120px]">Категория</TableHead>
                      <TableHead className="w-[100px] text-right">Всего</TableHead>
                      <TableHead className="w-[80px] text-right">Юзеров</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topReplies.map(([text, data], idx) => {
                      const catLabel = allCategories.find(c => c.category === data.category)?.label || data.category;
                      return (
                        <TableRow key={text}>
                          <TableCell className="font-bold text-primary">{idx + 1}</TableCell>
                          <TableCell className="font-mono text-sm">{text}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{catLabel}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold">{data.total}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{data.users.size}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </Card>
          )}
        </TabsContent>

        {/* === USERS TAB === */}
        <TabsContent value="users">
          {uniqueUsers === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Нет данных по сотрудникам.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {[...new Set(stats.map(s => s.user_id))].map(userId => {
                const userStats = stats.filter(s => s.user_id === userId);
                const userTotal = userStats.reduce((sum, r) => sum + r.use_count, 0);
                const userName = profileMap.get(userId) || userId.slice(0, 8);
                const topUserReplies = [...userStats].sort((a, b) => b.use_count - a.use_count).slice(0, 5);

                return (
                  <Card key={userId}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {userName}
                        </CardTitle>
                        <Badge>{userTotal} исп.</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1.5">
                        {topUserReplies.map(r => (
                          <div key={r.reply_text} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground truncate max-w-[80%]">{r.reply_text}</span>
                            <Badge variant="secondary" className="text-xs shrink-0">{r.use_count}</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* === CREATE DIALOG === */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Новая категория Smart Reply</DialogTitle>
            <DialogDescription>
              Создайте категорию с триггерными словами и вариантами ответов
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Код категории</Label>
                <Input
                  placeholder="delivery_status"
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                />
                <p className="text-[10px] text-muted-foreground">Латиница, snake_case</p>
              </div>
              <div className="space-y-1.5">
                <Label>Название</Label>
                <Input
                  placeholder="Статус доставки"
                  value={form.label}
                  onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Триггерные слова (каждое с новой строки)</Label>
              <Textarea
                placeholder={"доставка\nгде заказ\nкогда привезут"}
                value={form.triggers}
                onChange={e => setForm(f => ({ ...f, triggers: e.target.value }))}
                rows={4}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Варианты ответов (каждый с новой строки)</Label>
              <Textarea
                placeholder={"Сейчас проверю статус доставки\nИнформация отправлена на вашу почту"}
                value={form.replies}
                onChange={e => setForm(f => ({ ...f, replies: e.target.value }))}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Отмена</Button>
            <Button onClick={handleSaveNew} disabled={createRule.isPending} className="gap-1.5">
              <Save className="h-4 w-4" /> Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* === EDIT DIALOG === */}
      <Dialog open={!!editingRule} onOpenChange={open => !open && setEditingRule(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Редактировать категорию «{form.label}»</DialogTitle>
            <DialogDescription>
              {editingRule?.isDefault
                ? 'Это встроенная категория. Изменения сохранятся как кастомное правило.'
                : 'Отредактируйте триггеры и ответы'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Название</Label>
              <Input
                value={form.label}
                onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Триггерные слова (каждое с новой строки)</Label>
              <Textarea
                value={form.triggers}
                onChange={e => setForm(f => ({ ...f, triggers: e.target.value }))}
                rows={5}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Варианты ответов (каждый с новой строки)</Label>
              <Textarea
                value={form.replies}
                onChange={e => setForm(f => ({ ...f, replies: e.target.value }))}
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRule(null)}>Отмена</Button>
            <Button onClick={handleSaveEdit} disabled={updateRule.isPending || createRule.isPending} className="gap-1.5">
              <Check className="h-4 w-4" /> Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* === DELETE CONFIRM === */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить категорию?</AlertDialogTitle>
            <AlertDialogDescription>
              Кастомное правило будет удалено. Если это была модификация встроенной категории, она вернётся к значениям по умолчанию.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
