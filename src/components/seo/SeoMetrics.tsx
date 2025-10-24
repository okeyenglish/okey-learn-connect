import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart } from "lucide-react";

const SeoMetrics = () => {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">Метрики</h2>
        <p className="text-muted-foreground">
          Статистика производительности контента
        </p>
      </div>

      <Card>
        <CardContent className="py-8 text-center">
          <BarChart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <CardTitle className="mb-2">Метрики в разработке</CardTitle>
          <CardDescription>
            Здесь будут отображаться данные из Яндекс.Метрики и Вебмастера
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  );
};

export default SeoMetrics;
