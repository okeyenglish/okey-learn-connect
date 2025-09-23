import { useState } from "react";
import { Phone, PhoneCall, PhoneIncoming, PhoneMissed, Clock, Calendar, MessageCircle, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useCallHistory } from "@/hooks/useCallHistory";
import { useCallComments, useAddCallComment } from "@/hooks/useCallComments";

interface CallHistoryProps {
  clientId: string;
}

export const CallHistory: React.FC<CallHistoryProps> = ({ clientId }) => {
  const { data: calls = [], isLoading } = useCallHistory(clientId);
  const { data: comments = [] } = useCallComments(clientId);
  const addCommentMutation = useAddCallComment();
  const [newComment, setNewComment] = useState("");

  const getCallIcon = (call: any) => {
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

  const getCallStatusBadge = (call: any) => {
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
        className={`text-xs ${statusColors[call.status]}`}
      >
        {statusLabels[call.status]}
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

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    
    try {
      await addCommentMutation.mutateAsync({
        clientId,
        commentText: newComment.trim()
      });
      setNewComment("");
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  // Создаем объединенный список звонков и комментариев, отсортированный по времени
  const callsAndComments = [
    ...calls.map(call => ({ type: 'call', data: call, timestamp: call.started_at })),
    ...comments.map(comment => ({ type: 'comment', data: comment, timestamp: comment.created_at }))
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-muted-foreground">Загрузка истории звонков...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="space-y-4 p-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                История звонков и комментариев ({callsAndComments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {callsAndComments.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  История звонков и комментариев пуста
                </div>
              ) : (
                callsAndComments.map((item, index) => (
                  <div key={`${item.type}-${item.data.id}`}>
                    {item.type === 'call' ? (
                      <div className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                        <div className="flex items-center gap-3">
                          {getCallIcon(item.data as any)}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{getDirectionLabel((item.data as any).direction)}</span>
                              {getCallStatusBadge(item.data as any)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {(item.data as any).phone_number}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            {formatDuration((item.data as any).duration_seconds)}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {format(new Date((item.data as any).started_at), 'dd.MM.yyyy HH:mm', { locale: ru })}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg border bg-amber-50 border-amber-200">
                        <div className="flex items-center gap-2 mb-2">
                          <MessageCircle className="h-4 w-4 text-amber-600" />
                          <span className="text-sm font-medium text-amber-700">Комментарий менеджера</span>
                        </div>
                        <p className="text-sm text-amber-800 mb-2">{(item.data as any).comment_text}</p>
                        <div className="flex items-center gap-1 text-xs text-amber-600">
                          <Calendar className="h-3 w-3" />
                          {format(new Date((item.data as any).created_at), 'dd.MM.yyyy HH:mm', { locale: ru })}
                        </div>
                      </div>
                    )}
                    {index < callsAndComments.length - 1 && <Separator className="my-3" />}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
      
      {/* Форма добавления комментария */}
      <div className="border-t p-4 bg-background">
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Добавить комментарий к звонку</h3>
          <Textarea
            placeholder="Комментарий о разговоре или звонке..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-[80px] resize-none"
          />
          <Button 
            onClick={handleAddComment}
            disabled={!newComment.trim() || addCommentMutation.isPending}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            {addCommentMutation.isPending ? 'Добавление...' : 'Добавить комментарий'}
          </Button>
        </div>
      </div>
    </div>
  );
};