import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, ExternalLink } from "lucide-react";

interface StudentInfoBlockProps {
  firstName: string;
  studentNumber?: string | null;
  age?: number | null;
  status: string;
  hollihopeId?: string | null;
  onClick?: () => void;
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'active': return 'Занимается';
    case 'inactive': return 'Не занимается';
    case 'trial': return 'Пробный';
    case 'not_started': return 'Не начал';
    case 'archived': return 'Архивный';
    case 'expelled': return 'Отчислен';
    case 'on_pause': return 'На паузе';
    default: return status;
  }
};

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'active':
      return 'bg-green-500 text-white hover:bg-green-600';
    case 'inactive':
    case 'archived':
      return 'bg-muted text-muted-foreground';
    case 'trial':
      return 'bg-purple-100 text-purple-700';
    default:
      return '';
  }
};

export const StudentInfoBlock = ({
  firstName,
  studentNumber,
  age,
  status,
  hollihopeId,
  onClick,
}: StudentInfoBlockProps) => {
  // Определяем тип ссылки: лиды (trial, not_started) идут в /Lead/, остальные в /Profile/
  const isLead = status === 'trial' || status === 'not_started';
  const holyHopeUrl = hollihopeId
    ? `https://okeyenglish.t8s.ru/${isLead ? 'Lead' : 'Profile'}/${hollihopeId}`
    : null;

  const handleHolyHopeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (holyHopeUrl) {
      window.open(holyHopeUrl, '_blank');
    }
  };

  return (
    <div
      className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <User className="h-5 w-5 text-muted-foreground flex-shrink-0" />
      
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="font-medium truncate">{firstName || 'Без имени'}</span>
      </div>

      {age != null && (
        <div className="px-2 py-1 border rounded text-sm font-medium text-center min-w-[50px]">
          {age}
          <span className="text-xs text-muted-foreground ml-1">лет</span>
        </div>
      )}

      <Badge variant="secondary" className={getStatusStyle(status)}>
        {getStatusLabel(status)}
      </Badge>

      {holyHopeUrl && (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 flex-shrink-0"
          onClick={handleHolyHopeClick}
          title="Открыть в HolyHope"
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};
