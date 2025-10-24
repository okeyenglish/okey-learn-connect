import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";

const SeoSettings = () => {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">Настройки</h2>
        <p className="text-muted-foreground">
          Конфигурация интеграций и параметров генерации
        </p>
      </div>

      <Card>
        <CardContent className="py-8 text-center">
          <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <CardTitle className="mb-2">Настройки в разработке</CardTitle>
          <CardDescription>
            Здесь будут настройки токенов API и параметров генерации
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  );
};

export default SeoSettings;
