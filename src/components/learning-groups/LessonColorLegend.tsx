import { Card, CardContent } from "@/components/ui/card";

export const LessonColorLegend = () => {
  return (
    <Card className="border-dashed">
      <CardContent className="p-4">
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-green-500" />
            <span>Оплаченные занятия</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-white border border-gray-300" />
            <span>Не оплаченные (будущие)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-red-500" />
            <span>Задолженность (не оплачено и прошло)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-orange-500" />
            <span>Бесплатное занятие</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-black" />
            <span>Отменено</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};