import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEvents, useEventStats, useProcessPendingEvents } from '@/hooks/useEventBus';
import { Button } from '@/components/ui/button';
import { Play, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const EventBusMonitor = () => {
  const { data: stats, isLoading: isStatsLoading } = useEventStats();
  const { data: pendingEvents } = useEvents({ status: 'pending' });
  const { data: failedEvents } = useEvents({ status: 'failed' });
  const processMutation = useProcessPendingEvents();

  if (isStatsLoading) {
    return <div className="p-4">Loading event bus stats...</div>;
  }

  const getStatusColor = (status: string): "default" | "destructive" | "outline" | "secondary" => {
    switch (status) {
      case 'pending':
        return 'default';
      case 'processing':
        return 'secondary';
      case 'failed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Event Bus Monitor</h2>
        <Button
          onClick={() => processMutation.mutate(100)}
          disabled={processMutation.isPending || !stats?.pending}
          variant="outline"
        >
          <Play className={`mr-2 h-4 w-4 ${processMutation.isPending ? 'animate-pulse' : ''}`} />
          Process Events ({stats?.pending || 0})
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total (24h)</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Badge variant="default">{stats?.pending || 0}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pending || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
            <Badge variant="secondary">{stats?.processing || 0}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.processing || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processed</CardTitle>
            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">{stats?.processed || 0}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.processed || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <Badge variant="destructive">{stats?.failed || 0}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.failed || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">Pending Events</TabsTrigger>
          <TabsTrigger value="failed">Failed Events</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Events Queue</CardTitle>
            </CardHeader>
            <CardContent>
              {pendingEvents && pendingEvents.length > 0 ? (
                <div className="space-y-4">
                  {pendingEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between border-b pb-2"
                    >
                      <div>
                        <Badge variant={getStatusColor(event.status)} className="mb-1">
                          {event.event_type}
                        </Badge>
                        <p className="text-sm text-muted-foreground">
                          {event.aggregate_type} · {event.aggregate_id.slice(0, 8)}
                        </p>
                      </div>
                      <div className="text-sm text-right">
                        <p>{new Date(event.created_at).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">
                          Retry: {event.retry_count}/3
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  No pending events
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="failed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Failed Events</CardTitle>
            </CardHeader>
            <CardContent>
              {failedEvents && failedEvents.length > 0 ? (
                <div className="space-y-4">
                  {failedEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-start justify-between border-b pb-2"
                    >
                      <div className="flex-1">
                        <Badge variant="destructive" className="mb-1">
                          {event.event_type}
                        </Badge>
                        <p className="text-sm text-muted-foreground mb-1">
                          {event.aggregate_type} · {event.aggregate_id.slice(0, 8)}
                        </p>
                        {event.error_message && (
                          <p className="text-xs text-destructive">{event.error_message}</p>
                        )}
                      </div>
                      <div className="text-sm text-right">
                        <p>{new Date(event.created_at).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">
                          Retries: {event.retry_count}/3
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  No failed events! 🎉
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
