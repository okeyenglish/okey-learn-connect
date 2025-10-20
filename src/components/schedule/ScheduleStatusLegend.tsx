import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";

export const ScheduleStatusLegend = () => {
  const statusItems = [
    { 
      color: "bg-info-100 text-info-600 border-info-600/20", 
      label: "Текущие занятия",
      description: "Идут в этот период"
    },
    { 
      color: "bg-warning-100 text-warning-600 border-warning-600/20", 
      label: "Заканчиваются",
      description: "В течение недели"
    },
    { 
      color: "bg-success-100 text-success-600 border-success-600/20", 
      label: "Начинаются",
      description: "В ближайшее время"
    },
    { 
      color: "bg-warning-100 text-warning-600 border-warning-600/20", 
      label: "Нет преподавателя",
      description: "Требуется назначение"
    },
    { 
      color: "bg-info-100 text-info-600 border-info-600/20", 
      label: "Другое место",
      description: "Преподаватель в другом филиале"
    },
    { 
      color: "bg-neutral-100 text-neutral-500 border-neutral-500/20", 
      label: "Отменено",
      description: "Пропуск/отмена занятия"
    }
  ];

  return (
    <Card className="card-base bg-surface">
      <CardHeader className="pb-3 border-b border-border/50">
        <CardTitle className="flex items-center gap-2 text-sm text-text-primary">
          <Info className="h-4 w-4 text-brand" />
          Статусы занятий
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-3">
        <div className="space-y-3">
          {statusItems.map((item, index) => (
            <div key={index} className="flex items-start gap-3">
              <Badge 
                variant="outline" 
                className={`${item.color} text-xs px-2 py-1 min-w-[8px] justify-center`}
              >
                ●
              </Badge>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-text-primary">
                  {item.label}
                </div>
                <div className="text-xs text-text-secondary">
                  {item.description}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};