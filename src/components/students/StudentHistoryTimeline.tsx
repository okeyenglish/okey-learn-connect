import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  UserPlus, 
  UserMinus, 
  Edit, 
  Archive,
  DollarSign,
  Unlock,
  Lock,
  ArrowRight
} from "lucide-react";
import { useStudentOperationLogs } from "@/hooks/useStudentOperationLogs";

interface StudentHistoryTimelineProps {
  studentId: string;
}

export const StudentHistoryTimeline = ({ studentId }: StudentHistoryTimelineProps) => {
  const { data: logs, isLoading } = useStudentOperationLogs(studentId);

  const getOperationIcon = (operationType: string) => {
    const icons: Record<string, any> = {
      created: UserPlus,
      updated: Edit,
      status_changed: ArrowRight,
      enrolled_to_group: UserPlus,
      expelled_from_group: UserMinus,
      transferred: ArrowRight,
      archived: Archive,
      restored: UserPlus,
      payment_added: DollarSign,
      lk_access_granted: Unlock,
      lk_access_revoked: Lock,
    };
    const Icon = icons[operationType] || Clock;
    return <Icon className="h-4 w-4" />;
  };

  const getOperationLabel = (operationType: string) => {
    const labels: Record<string, string> = {
      created: "Создан",
      updated: "Обновлен",
      status_changed: "Изменен статус",
      enrolled_to_group: "Записан в группу",
      expelled_from_group: "Отчислен из группы",
      transferred: "Переведен",
      archived: "Архивирован",
      restored: "Восстановлен",
      payment_added: "Добавлена оплата",
      lk_access_granted: "ЛК открыт",
      lk_access_revoked: "ЛК закрыт",
    };
    return labels[operationType] || operationType;
  };

  const getOperationColor = (operationType: string) => {
    const colors: Record<string, string> = {
      created: "bg-green-500/10 text-green-700",
      updated: "bg-blue-500/10 text-blue-700",
      status_changed: "bg-purple-500/10 text-purple-700",
      enrolled_to_group: "bg-green-500/10 text-green-700",
      expelled_from_group: "bg-red-500/10 text-red-700",
      transferred: "bg-yellow-500/10 text-yellow-700",
      archived: "bg-gray-500/10 text-gray-700",
      restored: "bg-green-500/10 text-green-700",
      payment_added: "bg-emerald-500/10 text-emerald-700",
      lk_access_granted: "bg-blue-500/10 text-blue-700",
      lk_access_revoked: "bg-red-500/10 text-red-700",
    };
    return colors[operationType] || "bg-secondary";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4" />
            История операций
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Загрузка...</p>
        </CardContent>
      </Card>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4" />
            История операций
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">История пуста</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="h-4 w-4" />
          История операций
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {logs.map((log) => (
            <div key={log.id} className="flex gap-3 pb-4 border-b last:border-0 last:pb-0">
              <div className={`mt-1 p-2 rounded-full ${getOperationColor(log.operation_type)}`}>
                {getOperationIcon(log.operation_type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className={getOperationColor(log.operation_type)}>
                    {getOperationLabel(log.operation_type)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(log.performed_at).toLocaleString('ru-RU')}
                  </span>
                </div>
                {log.notes && (
                  <p className="text-sm text-muted-foreground mb-1">{log.notes}</p>
                )}
                {log.performer && (
                  <p className="text-xs text-muted-foreground">
                    Выполнил: {log.performer.first_name} {log.performer.last_name}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
