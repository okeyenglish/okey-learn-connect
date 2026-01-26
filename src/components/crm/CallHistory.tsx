import { useState, useMemo } from "react";
import { Phone, PhoneCall, PhoneIncoming, PhoneMissed, PhoneOutgoing, Clock, Calendar, Eye, MessageSquare, Sparkles, User, AlertCircle, Search, X, CheckCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useCallHistory, CallLog } from "@/hooks/useCallHistory";
import { CallDetailModal } from "./CallDetailModal";
import { useUnviewedMissedCallsCount, useViewedMissedCalls } from "@/hooks/useViewedMissedCalls";

interface CallHistoryProps {
  clientId: string;
}

type StatusFilter = 'all' | 'answered' | 'missed';
type DirectionFilter = 'all' | 'incoming' | 'outgoing';

export const CallHistory: React.FC<CallHistoryProps> = ({ clientId }) => {
  const { data: calls = [], isLoading } = useCallHistory(clientId);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  
  // Get unviewed missed calls from server
  const { data: unviewedData } = useUnviewedMissedCallsCount(clientId);
  const { markCallsAsViewed } = useViewedMissedCalls(clientId);
  const unviewedCallIds = useMemo(() => new Set(unviewedData?.ids || []), [unviewedData?.ids]);
  
  // Check if a call is unviewed (missed and not yet viewed)
  const isCallUnviewed = (call: { id: string; status: string; is_viewed?: boolean | null }) => {
    if (call.status !== 'missed') return false;
    if (call.is_viewed === true) return false;
    return unviewedCallIds.has(call.id);
  };

  // Normalize phone for search (remove non-digits)
  const normalizePhone = (phone: string) => phone.replace(/\D/g, '');

  // Filter calls by status, direction, and search query
  const filteredCalls = useMemo(() => {
    const normalizedSearch = normalizePhone(searchQuery);
    
    return calls.filter(call => {
      const statusMatch = statusFilter === 'all' || call.status === statusFilter;
      const directionMatch = directionFilter === 'all' || call.direction === directionFilter;
      const searchMatch = !normalizedSearch || normalizePhone(call.phone_number).includes(normalizedSearch);
      return statusMatch && directionMatch && searchMatch;
    });
  }, [calls, statusFilter, directionFilter, searchQuery]);

  // Count calls by status and direction for badges
  const statusCounts = useMemo(() => ({
    all: calls.length,
    answered: calls.filter(c => c.status === 'answered').length,
    missed: calls.filter(c => c.status === 'missed').length,
  }), [calls]);

  const directionCounts = useMemo(() => ({
    all: calls.length,
    incoming: calls.filter(c => c.direction === 'incoming').length,
    outgoing: calls.filter(c => c.direction === 'outgoing').length,
  }), [calls]);

  // Group calls: unviewed missed calls first, then the rest
  const { unviewedCalls, viewedCalls } = useMemo(() => {
    const unviewed: CallLog[] = [];
    const viewed: CallLog[] = [];
    
    for (const call of filteredCalls) {
      if (isCallUnviewed(call)) {
        unviewed.push(call);
      } else {
        viewed.push(call);
      }
    }
    
    return { unviewedCalls: unviewed, viewedCalls: viewed };
  }, [filteredCalls, unviewedCallIds]);

  const getCallIcon = (call: CallLog) => {
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

  const getCallStatusBadge = (call: CallLog) => {
    const statusColors: Record<string, string> = {
      answered: "bg-green-100 text-green-800 border-green-200",
      missed: "bg-red-100 text-red-800 border-red-200", 
      busy: "bg-yellow-100 text-yellow-800 border-yellow-200",
      failed: "bg-red-100 text-red-800 border-red-200",
      initiated: "bg-blue-100 text-blue-800 border-blue-200"
    };

    const statusLabels: Record<string, string> = {
      answered: "Состоялся",
      missed: "Пропущен",
      busy: "Занято",
      failed: "Не удался",
      initiated: "Инициирован"
    };

    return (
      <Badge 
        variant="secondary" 
        className={`text-xs ${statusColors[call.status] || ''}`}
      >
        {statusLabels[call.status] || call.status}
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

  const renderCallItem = (call: CallLog, showUnviewedIndicator: boolean = false) => (
    <div key={call.id} className="relative">
      {showUnviewedIndicator && (
        <span 
          className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-destructive rounded-full animate-pulse"
          title="Непросмотренный пропущенный звонок"
        />
      )}
      <div className="flex items-start justify-between space-x-3">
        <div className="flex items-start space-x-3 flex-1 min-w-0">
          <div className="flex-shrink-0 pt-0.5 relative">
            {getCallIcon(call)}
            {showUnviewedIndicator && (
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
                {showUnviewedIndicator && (
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

            {call.manager_name && (
              <div className="flex items-center gap-1 text-xs text-primary mt-1">
                <User className="h-3 w-3" />
                <span>{call.manager_name}</span>
              </div>
            )}

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
            
            {call.notes && (
              <div className="flex items-start gap-1 text-xs text-muted-foreground mt-1">
                <MessageSquare className="h-3 w-3 flex-shrink-0 mt-0.5" />
                <span className="line-clamp-1">{call.notes}</span>
              </div>
            )}
          </div>
          
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
    </div>
  );

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
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Phone className="h-4 w-4" />
          История звонков ({calls.length})
          {unviewedCalls.length > 0 && (
            <Badge variant="destructive" className="ml-auto">
              {unviewedCalls.length} новых
            </Badge>
          )}
        </CardTitle>

        {/* Phone search */}
        <div className="relative mt-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Поиск по номеру..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 pr-8 text-xs"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchQuery('')}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        
        {/* Status filter */}
        <ToggleGroup 
          type="single" 
          value={statusFilter} 
          onValueChange={(value) => value && setStatusFilter(value as StatusFilter)}
          className="justify-start mt-2"
        >
          <ToggleGroupItem value="all" size="sm" className="text-xs h-7 px-2.5">
            Все
            <Badge variant="outline" className="ml-1.5 h-4 px-1 text-[10px]">
              {statusCounts.all}
            </Badge>
          </ToggleGroupItem>
          <ToggleGroupItem value="answered" size="sm" className="text-xs h-7 px-2.5">
            Состоялись
            <Badge variant="outline" className="ml-1.5 h-4 px-1 text-[10px] bg-green-50 text-green-700 border-green-200">
              {statusCounts.answered}
            </Badge>
          </ToggleGroupItem>
          <ToggleGroupItem value="missed" size="sm" className="text-xs h-7 px-2.5">
            Пропущенные
            <Badge variant="outline" className="ml-1.5 h-4 px-1 text-[10px] bg-red-50 text-red-700 border-red-200">
              {statusCounts.missed}
            </Badge>
          </ToggleGroupItem>
        </ToggleGroup>

        {/* Direction filter */}
        <ToggleGroup 
          type="single" 
          value={directionFilter} 
          onValueChange={(value) => value && setDirectionFilter(value as DirectionFilter)}
          className="justify-start"
        >
          <ToggleGroupItem value="all" size="sm" className="text-xs h-7 px-2.5">
            Все
          </ToggleGroupItem>
          <ToggleGroupItem value="incoming" size="sm" className="text-xs h-7 px-2.5 gap-1">
            <PhoneIncoming className="h-3 w-3" />
            Входящие
            <Badge variant="outline" className="ml-1 h-4 px-1 text-[10px]">
              {directionCounts.incoming}
            </Badge>
          </ToggleGroupItem>
          <ToggleGroupItem value="outgoing" size="sm" className="text-xs h-7 px-2.5 gap-1">
            <PhoneOutgoing className="h-3 w-3" />
            Исходящие
            <Badge variant="outline" className="ml-1 h-4 px-1 text-[10px]">
              {directionCounts.outgoing}
            </Badge>
          </ToggleGroupItem>
        </ToggleGroup>
      </CardHeader>
      <CardContent className="px-0 pt-2">
        <ScrollArea className="h-64 px-4">
          <div className="space-y-3">
            {/* Unviewed missed calls section */}
            {unviewedCalls.length > 0 && (
              <>
                <div className="flex items-center justify-between pb-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <span className="text-xs font-medium text-destructive">
                      Непросмотренные пропущенные ({unviewedCalls.length})
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs gap-1 text-muted-foreground hover:text-foreground"
                    disabled={isMarkingAll}
                    onClick={async () => {
                      setIsMarkingAll(true);
                      const allIds = unviewedCalls.map(c => c.id);
                      await markCallsAsViewed(allIds);
                      setIsMarkingAll(false);
                    }}
                  >
                    <CheckCheck className="h-3 w-3" />
                    {isMarkingAll ? 'Отмечаем...' : 'Отметить все'}
                  </Button>
                </div>
                <div className="space-y-3 pl-1 border-l-2 border-destructive/30">
                  {unviewedCalls.map((call) => renderCallItem(call, true))}
                </div>
                {viewedCalls.length > 0 && (
                  <div className="py-2">
                    <Separator />
                  </div>
                )}
              </>
            )}

            {/* Regular calls section */}
            {viewedCalls.length > 0 && (
              <div className="space-y-3">
                {unviewedCalls.length > 0 && (
                  <div className="flex items-center gap-2 pb-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">
                      Остальные звонки ({viewedCalls.length})
                    </span>
                  </div>
                )}
                {viewedCalls.map((call, index) => (
                  <div key={call.id}>
                    {renderCallItem(call, false)}
                    {index < viewedCalls.length - 1 && <Separator className="mt-3" />}
                  </div>
                ))}
              </div>
            )}
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
