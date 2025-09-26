import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";

export const ScheduleStatusLegend = () => {
  const statusItems = [
    { 
      color: "bg-blue-100 text-blue-800 border-blue-200", 
      label: "Текущие занятия",
      description: "Идут в этот период"
    },
    { 
      color: "bg-yellow-100 text-yellow-800 border-yellow-200", 
      label: "Заканчиваются",
      description: "В течение недели"
    },
    { 
      color: "bg-green-100 text-green-800 border-green-200", 
      label: "Начинаются",
      description: "В ближайшее время"
    },
    { 
      color: "bg-amber-100 text-amber-800 border-amber-200", 
      label: "Нет преподавателя",
      description: "Требуется назначение"
    },
    { 
      color: "bg-purple-100 text-purple-800 border-purple-200", 
      label: "Другое место",
      description: "Преподаватель в другом филиале"
    },
    { 
      color: "bg-gray-900 text-white border-gray-900", 
      label: "Отменено",
      description: "Пропуск/отмена занятия"
    }
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Info className="h-4 w-4" />
          Статусы занятий
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
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
                <div className="text-xs font-medium text-foreground">
                  {item.label}
                </div>
                <div className="text-xs text-muted-foreground">
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