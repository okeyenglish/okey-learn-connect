import { OnlinePBXWebhookSettings } from "@/components/admin/OnlinePBXWebhookSettings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function OnlinePBXWebhook() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Назад к админке
          </Button>
        </div>

        <div className="flex flex-col items-center justify-center space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
              Интеграция с OnlinePBX
            </h1>
            <p className="text-lg text-muted-foreground">
              Настройка webhook для автоматической фиксации событий звонков
            </p>
          </div>

          <OnlinePBXWebhookSettings />

          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle>Дополнительная информация</CardTitle>
              <CardDescription>
                Что происходит после настройки webhook
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="flex gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium">Автоматическое логирование</h4>
                    <p className="text-sm text-muted-foreground">
                      Все события звонков будут автоматически записываться в базу данных
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium">Привязка к клиентам</h4>
                    <p className="text-sm text-muted-foreground">
                      Система автоматически найдет клиентов по номерам телефонов
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium">История звонков</h4>
                    <p className="text-sm text-muted-foreground">
                      Вся история будет доступна на вкладке "Звонки" в карточке клиента
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium">Аналитика</h4>
                    <p className="text-sm text-muted-foreground">
                      Данные о звонках можно будет использовать для построения отчетов
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}