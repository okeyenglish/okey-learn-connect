import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEvents, useEventStats, useProcessPendingEvents } from "@/hooks/useEventBus";
import { RefreshCw, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";

export default function EventBusMonitor() {
  const { data: events, isLoading } = useEvents();
  const { data: stats } = useEventStats();
  const processPendingEvents = useProcessPendingEvents();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'processing':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      processed: "default",
      failed: "destructive",
      processing: "secondary",
      pending: "outline",
    };
    return (
      <Badge variant={variants[status] || "outline"} className="gap-1">
        {getStatusIcon(status)}
        {status}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Event Bus Monitor</h1>
        <Button
          onClick={() => processPendingEvents.mutate(100)}
          disabled={processPendingEvents.isPending}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${processPendingEvents.isPending ? 'animate-spin' : ''}`} />
          Process Pending Events
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Total (24h)</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> Pending
            </div>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <RefreshCw className="h-3 w-3" /> Processing
            </div>
            <div className="text-2xl font-bold text-blue-600">{stats.processing}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <CheckCircle className="h-3 w-3" /> Processed
            </div>
            <div className="text-2xl font-bold text-green-600">{stats.processed}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <XCircle className="h-3 w-3" /> Failed
            </div>
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
          </Card>
        </div>
      )}

      {/* Events List */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Events (Last 100)</h2>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading events...</div>
        ) : !events || events.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No events found. Create a lead to see events appear here.
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <Card key={event.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{event.event_type}</Badge>
                      <Badge variant="secondary">{event.aggregate_type}</Badge>
                      {getStatusBadge(event.status)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Aggregate ID: <code className="text-xs bg-muted px-1 rounded">{event.aggregate_id}</code>
                    </div>
                    {event.payload && Object.keys(event.payload).length > 0 && (
                      <details className="text-sm">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                          View payload
                        </summary>
                        <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                          {JSON.stringify(event.payload, null, 2)}
                        </pre>
                      </details>
                    )}
                    {event.error_message && (
                      <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                        Error: {event.error_message}
                      </div>
                    )}
                  </div>
                  <div className="text-right text-sm text-muted-foreground ml-4">
                    <div>{format(new Date(event.created_at), 'dd MMM yyyy')}</div>
                    <div>{format(new Date(event.created_at), 'HH:mm:ss')}</div>
                    {event.retry_count > 0 && (
                      <div className="text-xs text-orange-600 mt-1">
                        Retries: {event.retry_count}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
