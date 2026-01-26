import { useState, useMemo } from "react";
import { Phone, PhoneCall, PhoneIncoming, PhoneMissed, Clock, Calendar, Eye, MessageSquare, Sparkles, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useCallHistory } from "@/hooks/useCallHistory";
import { CallDetailModal } from "./CallDetailModal";
import { useUnviewedMissedCallsCount } from "@/hooks/useViewedMissedCalls";

interface CallHistoryProps {
  clientId: string;
}

export const CallHistory: React.FC<CallHistoryProps> = ({ clientId }) => {
  const { data: calls = [], isLoading } = useCallHistory(clientId);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  
  // Get unviewed missed calls from server
  const { data: unviewedData } = useUnviewedMissedCallsCount(clientId);
  const unviewedCallIds = useMemo(() => new Set(unviewedData?.ids || []), [unviewedData?.ids]);
  
  // Check if a call is unviewed (missed and not yet viewed)
  const isCallUnviewed = (call: { id: string; status: string; is_viewed?: boolean | null }) => {
    if (call.status !== 'missed') return false;
    // Check server-side is_viewed flag first, then local unviewed set
    if (call.is_viewed === true) return false;
    return unviewedCallIds.has(call.id);
  };

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

  const openCallDetail = (callId: string) => {
    setSelectedCallId(callId);
    setModalOpen(true);
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Phone className="h-4 w-4" />
            История звонков
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Загружаем историю звонков...</div>
        </CardContent>
      </Card>
    );
  }

  if (calls.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Phone className="h-4 w-4" />
            История звонков
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground text-center py-4">
            Звонков пока не было
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Phone className="h-4 w-4" />
          История звонков ({calls.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <ScrollArea className="h-64 px-4">
          <div className="space-y-3">
            {calls.map((call, index) => (
              <div key={call.id} className="relative">
                {/* Unviewed indicator - red dot for missed calls not yet viewed */}
                {isCallUnviewed(call) && (
                  <span 
                    className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-destructive rounded-full animate-pulse"
                    title="Непросмотренный пропущенный звонок"
                  />
                )}
                <div className="flex items-start justify-between space-x-3">
                  <div className="flex items-start space-x-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 pt-0.5 relative">
                      {getCallIcon(call)}
                      {/* Alternative: small dot on the icon */}
                      {isCallUnviewed(call) && (
                        <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-destructive rounded-full" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">
                            {getDirectionLabel(call.direction)}
                          </span>
                          {getCallStatusBadge(call)}
                          {/* "New" badge for unviewed missed calls */}
                          {isCallUnviewed(call) && (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">
                              Новый
                            </Badge>
                          )}
                        </div>
                        
                        {call.duration_seconds !== null && call.status === 'answered' && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatDuration(call.duration_seconds)}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(call.started_at), "dd MMM, HH:mm", { locale: ru })}
                      </div>
                      
                      <div className="text-xs text-muted-foreground truncate">
                        {call.phone_number}
                      </div>

                      {/* Manager name */}
                      {call.manager_name && (
                        <div className="flex items-center gap-1 text-xs text-primary mt-1">
                          <User className="h-3 w-3" />
                          <span>{call.manager_name}</span>
                        </div>
                      )}

                      {/* AI Summary and Score for answered calls */}
                      {call.status === 'answered' && (call.summary || call.ai_evaluation) && (
                        <div className="mt-2 p-2 bg-muted/50 rounded-md space-y-1.5">
                          {call.ai_evaluation && typeof call.ai_evaluation === 'object' && (call.ai_evaluation as any).overall_score !== undefined && (
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant="secondary" 
                                className={`text-xs ${
                                  (call.ai_evaluation as any).overall_score >= 8 
                                    ? 'bg-green-100 text-green-800 border-green-200'
                                    : (call.ai_evaluation as any).overall_score >= 6
                                    ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                                    : 'bg-red-100 text-red-800 border-red-200'
                                }`}
                              >
                                Оценка: {(call.ai_evaluation as any).overall_score}/10
                              </Badge>
                            </div>
                          )}
                          {call.summary && (
                            <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                              <Sparkles className="h-3 w-3 flex-shrink-0 mt-0.5 text-primary" />
                              <span className="line-clamp-3">{call.summary}</span>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Notes Preview */}
                      {call.notes && (
                        <div className="flex items-start gap-1 text-xs text-muted-foreground mt-1">
                          <MessageSquare className="h-3 w-3 flex-shrink-0 mt-0.5" />
                          <span className="line-clamp-1">{call.notes}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Action Button */}
                    <div className="flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openCallDetail(call.id)}
                        className="h-8 w-8 p-0"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                
                {index < calls.length - 1 && <Separator className="mt-3" />}
              </div>
            ))}
          </div>
        </ScrollArea>
        
        <CallDetailModal 
          callId={selectedCallId}
          open={modalOpen}
          onOpenChange={setModalOpen}
        />
      </CardContent>
    </Card>
  );
};