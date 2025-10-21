import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, Mail, Calendar, User, MapPin, BookOpen } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { usePinnedModalsDB } from "@/hooks/usePinnedModalsDB";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface LeadCardProps {
  lead: any;
  onUpdate: () => void;
  onOpen?: (lead: any) => void;
}

export const LeadCard = ({ lead, onUpdate, onOpen }: LeadCardProps) => {
  const fullName = `${lead.first_name} ${lead.last_name}`;
  const navigate = useNavigate();
  const { toast } = useToast();
  const { pinModal, openPinnedModal } = usePinnedModalsDB();
  const [opening, setOpening] = useState(false);

  const handleOpen = async () => {
    if (onOpen) {
      onOpen(lead);
      return;
    }
    if (opening) return;
    setOpening(true);
    try {
      // Проверяем, существует ли студент
      const { data, error } = await supabase
        .from('students')
        .select('id, name')
        .eq('id', lead.id)
        .single();

      if (error || !data) {
        toast({ title: 'Студент не найден', description: 'Запись отсутствует или нет доступа', variant: 'destructive' });
        return;
      }

      // Находимся в CRM и открываем закрепленную карточку студента
      navigate('/newcrm');
      await pinModal({
        id: lead.id,
        type: 'student',
        title: `Студент: ${fullName}`,
        props: { student: { id: lead.id, name: fullName } }
      });
      await openPinnedModal(lead.id, 'student');
    } catch (e) {
      toast({ title: 'Ошибка', description: 'Не удалось открыть карточку студента' });
    } finally {
      setOpening(false);
    }
  };

  const handleScheduleTrial = () => {
    toast({
      title: "Пробное занятие",
      description: `Назначение пробного занятия для ${fullName}`,
    });
    // TODO: Открыть модалку создания пробного занятия
  };
  
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="font-semibold text-lg">{fullName}</h3>
            {lead.status && (
              <Badge 
                style={{ 
                  backgroundColor: lead.status.color + '20',
                  color: lead.status.color,
                  borderColor: lead.status.color 
                }}
                className="border"
              >
                {lead.status.name}
              </Badge>
            )}
          </div>
          {lead.age && (
            <span className="text-sm text-muted-foreground">{lead.age} лет</span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {lead.phone && (
          <div className="flex items-center gap-2 text-sm">
            <Phone className="w-4 h-4 text-muted-foreground" />
            <a href={`tel:${lead.phone}`} className="hover:underline">
              {lead.phone}
            </a>
          </div>
        )}
        
        {lead.email && (
          <div className="flex items-center gap-2 text-sm">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <a href={`mailto:${lead.email}`} className="hover:underline truncate">
              {lead.email}
            </a>
          </div>
        )}
        
        {lead.subject && (
          <div className="flex items-center gap-2 text-sm">
            <BookOpen className="w-4 h-4 text-muted-foreground" />
            <span>{lead.subject} ({lead.level || 'Не указан'})</span>
          </div>
        )}
        
        {lead.branch && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span>{lead.branch}</span>
          </div>
        )}
        
        {lead.lead_source && (
          <div className="flex items-center gap-2 text-sm">
            <User className="w-4 h-4 text-muted-foreground" />
            <span>Источник: {lead.lead_source.name}</span>
          </div>
        )}
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="w-4 h-4" />
          <span>
            {format(new Date(lead.created_at), "d MMMM yyyy, HH:mm", { locale: ru })}
          </span>
        </div>
        
        {lead.notes && (
          <p className="text-sm text-muted-foreground line-clamp-2 pt-2 border-t">
            {lead.notes}
          </p>
        )}
        
        <div className="flex gap-2 pt-2">
          <Button size="sm" className="flex-1" onClick={handleOpen} disabled={opening}>
            {opening ? 'Открываю…' : 'Открыть'}
          </Button>
          <Button size="sm" variant="outline" className="flex-1" onClick={handleScheduleTrial}>
            Назначить пробный
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
