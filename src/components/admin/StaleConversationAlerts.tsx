import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { selfHostedGet } from '@/lib/selfHostedApi';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AlertTriangle, Bell, Clock, User, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useState } from 'react';

const STAGE_LABELS: Record<string, string> = {
  greeting: 'Приветствие',
  qualification: 'Квалификация',
  need_discovery: 'Выявление потребности',
  value_explanation: 'Презентация ценности',
  objection: 'Возражение',
  offer: 'Предложение',
  closing: 'Закрытие',
  follow_up: 'Follow-up',
};

const STAGE_URGENCY: Record<string, string> = {
  objection: 'text-red-600 bg-red-50 border-red-200',
  follow_up: 'text-amber-600 bg-amber-50 border-amber-200',
};

interface StaleConversation {
  id: string;
  client_id: string;
  client_name: string;
  client_phone: string;
  current_stage: string;
  stage_entered_at: string;
  hours_stuck: number;
  confidence: number;
  alert_count: number;
}

export function StaleConversationAlerts() {
  const [triggeringCheck, setTriggeringCheck] = useState(false);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['stale-conversations'],
    queryFn: async () => {
      // Query conversation_states directly for stuck conversations
      const thresholdDate = new Date();
      thresholdDate.setHours(thresholdDate.getHours() - 24);

      const { data: states, error: statesErr } = await supabase
        .from('conversation_states')
        .select('id, client_id, current_stage, stage_entered_at, confidence, metadata')
        .in('current_stage', ['objection', 'follow_up', 'hesitation'])
        .lt('stage_entered_at', thresholdDate.toISOString())
        .order('stage_entered_at', { ascending: true })
        .limit(50);

      if (statesErr) throw statesErr;
      if (!states || states.length === 0) return [];

      // Get client info
      const clientIds = states.map((s: any) => s.client_id);
      const { data: clients } = await supabase
        .from('clients')
        .select('id, name, phone')
        .in('id', clientIds);

      const clientMap = new Map((clients || []).map((c: any) => [c.id, c]));

      return states.map((s: any) => {
        const client = clientMap.get(s.client_id) as any;
        const meta = (s.metadata || {}) as Record<string, unknown>;
        return {
          id: s.id,
          client_id: s.client_id,
          client_name: client?.name || 'Неизвестный',
          client_phone: client?.phone || '',
          current_stage: s.current_stage,
          stage_entered_at: s.stage_entered_at,
          hours_stuck: Math.round((Date.now() - new Date(s.stage_entered_at).getTime()) / (1000 * 60 * 60)),
          confidence: s.confidence,
          alert_count: (meta.stale_alert_count as number) || 0,
        } as StaleConversation;
      });
    },
    refetchInterval: 300000, // 5 min
  });

  const handleTriggerCheck = async () => {
    setTriggeringCheck(true);
    try {
      await selfHostedGet('stale-conversation-alerts');
      refetch();
    } finally {
      setTriggeringCheck(false);
    }
  };

  const staleCount = data?.length || 0;

  return (
    <Card className={staleCount > 0 ? 'border-destructive/50' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className={`h-5 w-5 ${staleCount > 0 ? 'text-destructive animate-pulse' : 'text-muted-foreground'}`} />
            <CardTitle className="text-lg">
              Застрявшие диалоги
              {staleCount > 0 && (
                <Badge variant="destructive" className="ml-2">{staleCount}</Badge>
              )}
            </CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleTriggerCheck}
            disabled={triggeringCheck || isFetching}
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${(triggeringCheck || isFetching) ? 'animate-spin' : ''}`} />
            Проверить
          </Button>
        </div>
        <CardDescription>
          Клиенты, находящиеся на стадии возражения/follow-up более 24ч
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">Ошибка загрузки: {(error as Error).message}</p>
        ) : staleCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <Clock className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm">Нет застрявших диалогов</p>
            <p className="text-xs mt-1">Все клиенты продвигаются по воронке</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2">
              {data?.map((item) => {
                const urgencyClass = STAGE_URGENCY[item.current_stage] || 'text-muted-foreground bg-muted border-border';
                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${urgencyClass}`}
                  >
                    <div className="shrink-0">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{item.client_name}</span>
                        {item.client_phone && (
                          <span className="text-xs opacity-70">{item.client_phone}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-xs">
                          {STAGE_LABELS[item.current_stage] || item.current_stage}
                        </Badge>
                        <span className="text-xs opacity-70">
                          {formatDistanceToNow(new Date(item.stage_entered_at), { addSuffix: true, locale: ru })}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold">{item.hours_stuck}ч</p>
                      {item.alert_count > 0 && (
                        <p className="text-xs opacity-60">{item.alert_count} алерт{item.alert_count > 1 ? 'а' : ''}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
