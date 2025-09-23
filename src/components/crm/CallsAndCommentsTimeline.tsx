import { useState } from "react";
import { Phone, PhoneCall, PhoneIncoming, PhoneMissed, Clock, Calendar, MessageCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useCallHistory } from "@/hooks/useCallHistory";
import { useCallComments, useCreateCallComment } from "@/hooks/useCallComments";
import { useToast } from "@/hooks/use-toast";

interface CallsAndCommentsTimelineProps {
  clientId: string;
}

interface TimelineEvent {
  id: string;
  type: 'call' | 'comment';
  timestamp: Date;
  // Call properties
  direction?: 'incoming' | 'outgoing';
  status?: 'answered' | 'missed' | 'busy' | 'failed' | 'initiated';
  duration_seconds?: number | null;
  phone_number?: string;
  // Comment properties
  comment_text?: string;
  call_log_id?: string | null;
}

export const CallsAndCommentsTimeline: React.FC<CallsAndCommentsTimelineProps> = ({ clientId }) => {
  const [commentText, setCommentText] = useState("");
  
  const { data: calls = [], isLoading: callsLoading } = useCallHistory(clientId);
  const { data: comments = [], isLoading: commentsLoading } = useCallComments(clientId);
  const createCommentMutation = useCreateCallComment();
  const { toast } = useToast();

  const getCallIcon = (call: TimelineEvent) => {
    if (call.direction === 'incoming') {
      return call.status === 'answered' ? 
        <PhoneIncoming className="h-4 w-4 text-green-600" /> :
        <PhoneMissed className="h-4 w-4 text-red-600" />;
    } else {
      return call.status === 'answered' ?
        <PhoneCall className="h-4 w-4 text-blue-600" /> :
        <PhoneMissed className="h-4 w-4 text-orange-600" />;
    }
  };

  const getCallStatusBadge = (call: TimelineEvent) => {
    if (call.type !== 'call') return null;
    
    const statusColors = {
      answered: "bg-green-100 text-green-800 border-green-200",
      missed: "bg-red-100 text-red-800 border-red-200", 
      busy: "bg-yellow-100 text-yellow-800 border-yellow-200",
      failed: "bg-red-100 text-red-800 border-red-200",
      initiated: "bg-blue-100 text-blue-800 border-blue-200"
    };

    const statusLabels = {
      answered: "Состоялся",
      missed: "Пропущен",
      busy: "Занято",
      failed: "Не удался",
      initiated: "Инициирован"
    };

    return (
      <Badge 
        variant="secondary" 
        className={`text-xs ${statusColors[call.status!]}`}
      >
        {statusLabels[call.status!]}
      </Badge>
    );
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "—";
    
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    
    if (mins === 0) {
      return `${secs}с`;
    }
    
    return `${mins}м ${secs}с`;
  };

  const getDirectionLabel = (direction: string) => {
    return direction === 'incoming' ? 'Входящий' : 'Исходящий';
  };

  const saveComment = async () => {
    if (!commentText.trim()) return;
    
    try {
      await createCommentMutation.mutateAsync({
        clientId,
        commentText: commentText.trim(),
        callLogId: null, // General comment not tied to specific call
      });

      toast({
        title: "Комментарий сохранен",
        description: "Комментарий успешно добавлен в историю",
      });
      
      setCommentText("");
    } catch (error: any) {
      toast({
        title: "Ошибка сохранения",
        description: error.message || "Не удалось сохранить комментарий",
        variant: "destructive",
      });
    }
  };

  // Combine calls and comments into timeline events
  const timelineEvents: TimelineEvent[] = [
    // Add calls
    ...calls.map(call => ({
      id: call.id,
      type: 'call' as const,
      timestamp: new Date(call.started_at),
      direction: call.direction,
      status: call.status,
      duration_seconds: call.duration_seconds,
      phone_number: call.phone_number
    })),
    // Add call comments
    ...comments.map(comment => ({
      id: comment.id,
      type: 'comment' as const,
      timestamp: new Date(comment.created_at),
      comment_text: comment.comment_text,
      call_log_id: comment.call_log_id
    }))
  ].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()); // Sort by oldest first (like chat)

  if (callsLoading || commentsLoading) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Phone className="h-4 w-4" />
            История звонков и комментариев
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Загружаем данные...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Phone className="h-4 w-4" />
          История звонков и комментариев ({timelineEvents.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <ScrollArea className="h-96 px-4">
          <div className="space-y-4">
            {/* Timeline events */}
            {timelineEvents.length > 0 ? (
              timelineEvents.map((event, index) => (
                <div key={event.id}>
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 pt-0.5">
                      {event.type === 'call' ? 
                        getCallIcon(event) : 
                        <MessageCircle className="h-4 w-4 text-yellow-600" />
                      }
                    </div>
                    
                    <div className="flex-1 min-w-0 space-y-2">
                      {event.type === 'call' ? (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-foreground">
                                {getDirectionLabel(event.direction!)}
                              </span>
                              {getCallStatusBadge(event)}
                            </div>
                            
                            {event.duration_seconds !== null && event.status === 'answered' && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {formatDuration(event.duration_seconds)}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {format(event.timestamp, "dd MMM, HH:mm", { locale: ru })}
                          </div>
                          
                          <div className="text-xs text-muted-foreground">
                            {event.phone_number}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-yellow-700">
                              Комментарий менеджера
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {format(event.timestamp, "dd MMM, HH:mm", { locale: ru })}
                          </div>
                          
                          <div className="text-sm bg-yellow-50 border border-yellow-200 rounded p-2 mt-1">
                            {event.comment_text}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {index < timelineEvents.length - 1 && <Separator className="mt-4" />}
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground text-center py-4">
                Пока нет звонков и комментариев
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};