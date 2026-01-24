import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Phone, PhoneCall, PhoneIncoming, PhoneMissed, Clock, Calendar, User, MessageSquare, Sparkles, Save, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/typedClient";
import { useToast } from "@/hooks/use-toast";

interface CallDetailModalProps {
  callId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CallLog {
  id: string;
  phone_number: string;
  direction: string;
  status: string;
  duration_seconds: number | null;
  started_at: string;
  ended_at: string | null;
  summary: string | null;
  notes: string | null;
  clients?: {
    name?: string;
  } | null;
}

export const CallDetailModal: React.FC<CallDetailModalProps> = ({ 
  callId, 
  open, 
  onOpenChange 
}) => {
  const { toast } = useToast();
  const [call, setCall] = useState<CallLog | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);

  useEffect(() => {
    if (callId && open) {
      fetchCallDetails();
    }
  }, [callId, open]);

  const fetchCallDetails = async () => {
    if (!callId) return;
    
    setLoading(true);
    try {
      const { data: callData, error } = await supabase
        .from('call_logs')
        .select('*')
        .eq('id', callId)
        .maybeSingle();

      if (error || !callData) {
        console.error('Error fetching call details:', error);
        toast({
          title: "Ошибка",
          description: "Не удалось загрузить детали звонка",
          variant: "destructive",
        });
        return;
      }

      // Get client name separately if client_id exists
      let clientName = "Неизвестный клиент";
      if (callData.client_id) {
        const { data: clientData } = await supabase
          .from('clients')
          .select('name')
          .eq('id', callData.client_id)
          .maybeSingle();
        
        if (clientData?.name) {
          clientName = clientData.name;
        }
      }

      const callWithClient = {
        ...callData,
        clients: { name: clientName }
      };

      setCall(callWithClient);
      setNotes(callData.notes || "");
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveNotes = async () => {
    if (!callId) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('call_logs')
        .update({ notes })
        .eq('id', callId);

      if (error) {
        console.error('Error saving notes:', error);
        toast({
          title: "Ошибка",
          description: "Не удалось сохранить комментарий",
          variant: "destructive",
        });
        return;
      }

      setCall(prev => prev ? { ...prev, notes } : null);
      toast({
        title: "Успешно",
        description: "Комментарий сохранен",
      });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSaving(false);
    }
  };

  const generateSummary = async () => {
    if (!callId || !call) return;

    setGeneratingSummary(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-call-summary', {
        body: { callId, callDetails: call }
      });

      if (error) {
        console.error('Error generating summary:', error);
        toast({
          title: "Ошибка",
          description: "Не удалось создать резюме звонка",
          variant: "destructive",
        });
        return;
      }

      setCall(prev => prev ? { ...prev, summary: data.summary } : null);
      toast({
        title: "Успешно",
        description: "Резюме звонка создано",
      });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setGeneratingSummary(false);
    }
  };

  const getCallIcon = (call: CallLog) => {
    if (call.direction === 'incoming') {
      return call.status === 'answered' ? 
        <PhoneIncoming className="h-5 w-5 text-green-600" /> :
        <PhoneMissed className="h-5 w-5 text-red-600" />;
    } else {
      return call.status === 'answered' ?
        <PhoneCall className="h-5 w-5 text-blue-600" /> :
        <PhoneMissed className="h-5 w-5 text-orange-600" />;
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
        className={`${statusColors[call.status] || statusColors.failed}`}
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
    return direction === 'incoming' ? 'Входящий звонок' : 'Исходящий звонок';
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Загружаем детали звонка...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!call) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getCallIcon(call)}
            Детали звонка
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Call Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {call.clients?.name || "Неизвестный клиент"}
                </div>
                {getCallStatusBadge(call)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Направление</div>
                  <div className="font-medium">{getDirectionLabel(call.direction)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Номер телефона</div>
                  <div className="font-medium">{call.phone_number}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Дата и время</div>
                  <div className="font-medium flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(call.started_at), "dd MMM yyyy, HH:mm", { locale: ru })}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Длительность</div>
                  <div className="font-medium flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {formatDuration(call.duration_seconds)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Резюме звонка
                </div>
                {!call.summary && (
                  <Button
                    onClick={generateSummary}
                    disabled={generatingSummary}
                    size="sm"
                    variant="outline"
                  >
                    {generatingSummary ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Создается...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Создать резюме
                      </>
                    )}
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {call.summary ? (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm leading-relaxed">{call.summary}</p>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Резюме звонка пока не создано</p>
                  <p className="text-xs">Нажмите кнопку выше, чтобы создать автоматическое резюме</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Комментарии
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                placeholder="Добавьте комментарий к звонку..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <div className="flex justify-end">
                <Button 
                  onClick={saveNotes}
                  disabled={saving}
                  size="sm"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Сохраняем...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Сохранить
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};