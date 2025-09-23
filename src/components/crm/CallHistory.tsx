import { useState } from "react";
import { Phone, PhoneCall, PhoneIncoming, PhoneMissed, Clock, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useCallHistory } from "@/hooks/useCallHistory";

interface CallHistoryProps {
  clientId: string;
}

export const CallHistory: React.FC<CallHistoryProps> = ({ clientId }) => {
  const { data: calls = [], isLoading } = useCallHistory(clientId);

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
              <div key={call.id}>
                <div className="flex items-start justify-between space-x-3">
                  <div className="flex items-start space-x-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 pt-0.5">
                      {getCallIcon(call)}
                    </div>
                    
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">
                            {getDirectionLabel(call.direction)}
                          </span>
                          {getCallStatusBadge(call)}
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
                    </div>
                  </div>
                </div>
                
                {index < calls.length - 1 && <Separator className="mt-3" />}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};