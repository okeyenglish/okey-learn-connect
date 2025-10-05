import { Card, CardContent } from "@/components/ui/card";

export const LessonColorLegend = () => {
  return (
    <Card className="border-dashed">
      <CardContent className="p-4">
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-cyan-400" />
            <span>Текущие занятия</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-yellow-400" />
            <span>Занятия закончатся в течение недели</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-lime-300" />
            <span>Занятия начнутся в ближайшее время</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-gray-400" />
            <span>Нет преподавателя</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-orange-500" />
            <span>Преподаватель работает в другом месте</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-black" />
            <span>Пропуск</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};