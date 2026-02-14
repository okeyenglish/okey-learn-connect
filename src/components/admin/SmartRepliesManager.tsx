/**
 * Admin panel for managing Smart Replies: edit texts, reorder, view usage stats.
 * Data comes from self-hosted Supabase table smart_reply_stats + local rules.
 */
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, TrendingUp, Users, User, Search, ChevronDown, ChevronUp, BarChart3, MessageSquare } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';

// Import rules from the smart replies hook
import { type SmartReplyCategory } from '@/hooks/useSmartReplies';

// Re-define rules here to avoid circular deps — we just need category+triggers+replies
const CATEGORIES: { category: SmartReplyCategory; label: string; triggers: string[]; replies: string[] }[] = [
  { category: 'gratitude', label: 'Благодарность', triggers: ['спасибо', 'благодарю', 'спс'], replies: ['Всегда рады помочь!', 'Обращайтесь, если появятся вопросы!', 'Рады были помочь!', 'Спасибо за обращение!', 'Хорошего вам дня!'] },
  { category: 'greeting', label: 'Приветствие', triggers: ['здравствуйте', 'добрый день', 'привет'], replies: ['Здравствуйте! Чем могу помочь?', 'Добрый день! Слушаю вас 🙂', 'Рады вас слышать! Чем помочь?', 'Здравствуйте! Подскажите, пожалуйста, ваш вопрос'] },
  { category: 'farewell', label: 'Прощание', triggers: ['до свидания', 'пока', 'всего доброго'], replies: ['До свидания! Хорошего дня!', 'Всего доброго! Обращайтесь!', 'Будем рады помочь снова!', 'Хорошего дня и отличного настроения!'] },
  { category: 'agreement', label: 'Согласие', triggers: ['хорошо', 'ок', 'понял', 'договорились'], replies: ['Отлично, договорились!', 'Тогда продолжаем 🙂', 'Принято!', 'Если появятся вопросы — пишите!'] },
  { category: 'apology', label: 'Извинение', triggers: ['извините', 'простите', 'сорри'], replies: ['Ничего страшного!', 'Всё в порядке 🙂', 'Не переживайте!', 'Всё хорошо, продолжаем'] },
  { category: 'waiting_status', label: 'Ожидание ответа', triggers: ['ну что', 'есть новости', 'когда будет'], replies: ['Сейчас проверю и вернусь с ответом', 'Уже уточняю информацию', 'Спасибо за ожидание!', 'Проверяем, скоро напишем'] },
  { category: 'help_request', label: 'Просьба о помощи', triggers: ['помогите', 'не работает', 'ошибка'], replies: ['Сейчас поможем разобраться', 'Опишите, пожалуйста, подробнее ситуацию', 'Проверим и всё исправим', 'Сейчас посмотрю, в чём может быть дело'] },
  { category: 'sent_info', label: 'Отправил информацию', triggers: ['отправил', 'скинул', 'вот', 'держите'], replies: ['Спасибо, получил!', 'Сейчас посмотрю', 'Принято, проверяю', 'Благодарю, изучаю информацию'] },
  { category: 'client_waiting', label: 'Клиент ждёт', triggers: ['сек', 'секунду', 'минуту'], replies: ['Хорошо, ожидаю 🙂', 'Без проблем, жду', 'Напишите, как будете готовы'] },
  { category: 'lesson_meeting', label: 'Урок / встреча', triggers: ['занятие', 'урок', 'встреча', 'записаться'], replies: ['Сейчас проверю расписание', 'Подберём удобное время', 'Сейчас уточню у преподавателя', 'Запишу вас на ближайшее окно'] },
  { category: 'booking_confirm', label: 'Подтверждение записи', triggers: ['подходит', 'записывайте', 'давайте'], replies: ['Отлично, записываю вас!', 'Готово ✅', 'Запись подтверждена', 'Всё оформил 🙂'] },
  { category: 'negative', label: 'Негатив', triggers: ['плохо', 'не нравится', 'жалоба'], replies: ['Понимаю вас, давайте разберёмся', 'Спасибо, что сообщили', 'Сейчас всё проверим', 'Поможем решить ситуацию'] },
  { category: 'price_question', label: 'Вопрос о цене', triggers: ['сколько стоит', 'цена', 'стоимость'], replies: ['Сейчас расскажу по стоимости 🙂', 'Подберём оптимальный вариант', 'Отправляю актуальные тарифы'] },
  { category: 'thinking', label: 'Раздумья', triggers: ['подумаю', 'пока не знаю'], replies: ['Конечно, не спешите 🙂', 'Если появятся вопросы — пишите!', 'Буду на связи'] },
  { category: 'returning', label: 'Возвращение', triggers: ['снова', 'ещё вопрос'], replies: ['Рады снова помочь!', 'Слушаю вас 🙂', 'Чем можем помочь в этот раз?'] },
];

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

export function SmartRepliesManager() {
  const { profile } = useAuth();
  const organizationId = profile?.organization_id;
  const [search, setSearch] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // Fetch all stats for the org
  const { data: stats = [], isLoading: statsLoading } = useQuery({
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

  // Total uses
  const totalUses = useMemo(() => stats.reduce((sum, r) => sum + r.use_count, 0), [stats]);
  const uniqueUsers = useMemo(() => new Set(stats.map(s => s.user_id)).size, [stats]);

  // Top replies sorted by total
  const topReplies = useMemo(() => {
    return [...aggregated.entries()]
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 20);
  }, [aggregated]);

  // Per-category stats
  const categoryStats = useMemo(() => {
    return CATEGORIES.map(cat => {
      const catStats = stats.filter(s => s.category === cat.category);
      const total = catStats.reduce((sum, r) => sum + r.use_count, 0);
      const repliesWithStats = cat.replies.map(reply => {
        const agg = aggregated.get(reply);
        return { text: reply, total: agg?.total || 0, users: agg?.users || new Map() };
      }).sort((a, b) => b.total - a.total);
      return { ...cat, totalUses: total, repliesWithStats };
    }).sort((a, b) => b.totalUses - a.totalUses);
  }, [stats, aggregated]);

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categoryStats;
    const q = search.toLowerCase();
    return categoryStats.filter(c =>
      c.label.toLowerCase().includes(q) ||
      c.replies.some(r => r.toLowerCase().includes(q)) ||
      c.triggers.some(t => t.toLowerCase().includes(q))
    );
  }, [categoryStats, search]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Sparkles className="h-7 w-7 text-primary" />
          Smart Replies
        </h1>
        <p className="text-muted-foreground mt-1">
          Управление быстрыми ответами и статистика использования
        </p>
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
            <div className="text-2xl font-bold">{CATEGORIES.reduce((s, c) => s + c.replies.length, 0)}</div>
            <p className="text-xs text-muted-foreground">{CATEGORIES.length} категорий</p>
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
              return (
                <Card key={cat.category} className="overflow-hidden">
                  <button
                    className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
                    onClick={() => setExpandedCategory(isExpanded ? null : cat.category)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{cat.label}</span>
                      <Badge variant="secondary" className="text-xs">
                        {cat.replies.length} ответов
                      </Badge>
                      {cat.totalUses > 0 && (
                        <Badge variant="outline" className="text-xs">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          {cat.totalUses} исп.
                        </Badge>
                      )}
                    </div>
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>

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
                      const catLabel = CATEGORIES.find(c => c.category === data.category)?.label || data.category;
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
    </div>
  );
}
