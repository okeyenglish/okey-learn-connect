import { useState } from "react";
import { Copy, Eye, EyeOff, Check, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export const OnlinePBXWebhookSettings = () => {
  const [showUrl, setShowUrl] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const webhookUrl = `https://kbojujfwtvmsgudumown.supabase.co/functions/v1/onlinepbx-webhook`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      toast({
        title: "Скопировано!",
        description: "URL webhook скопирован в буфер обмена",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось скопировать URL",
        variant: "destructive",
      });
    }
  };

  const supportedEvents = [
    "call.started",
    "call.answered", 
    "call.ended",
    "call.missed",
    "call.busy",
    "call.failed"
  ];

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Настройка Webhook для OnlinePBX
        </CardTitle>
        <CardDescription>
          Настройте webhook в панели OnlinePBX для автоматической фиксации всех событий звонков
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Этот webhook будет принимать и логировать все события от OnlinePBX для дальнейшего анализа и интеграции с CRM.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="webhook-url">URL для Webhook</Label>
          <div className="flex gap-2">
            <Input
              id="webhook-url"
              type={showUrl ? "text" : "password"}
              value={webhookUrl}
              readOnly
              className="font-mono text-sm"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowUrl(!showUrl)}
            >
              {showUrl ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={copyToClipboard}
              className={copied ? "text-green-600" : ""}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <Label>Поддерживаемые события</Label>
          <div className="flex flex-wrap gap-2">
            {supportedEvents.map((event) => (
              <Badge key={event} variant="secondary" className="font-mono">
                {event}
              </Badge>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Label>Инструкции по настройке</Label>
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <h4 className="font-medium">Шаги настройки в панели OnlinePBX:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Войдите в панель управления OnlinePBX</li>
              <li>Перейдите в раздел "API и интеграции"</li>
              <li>Найдите настройки Webhooks</li>
              <li>Добавьте новый webhook с URL выше</li>
              <li>Выберите события, которые нужно отслеживать</li>
              <li>Установите метод отправки: POST</li>
              <li>Сохраните настройки</li>
            </ol>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Формат данных</Label>
          <div className="bg-muted p-3 rounded font-mono text-xs">
            <pre>{`{
  "event": "call.started",
  "data": {
    "call_id": "123456",
    "from": "+7xxxxxxxxxx",
    "to": "+7xxxxxxxxxx", 
    "direction": "incoming",
    "started_at": "2025-01-01T12:00:00Z"
  },
  "timestamp": "2025-01-01T12:00:00Z"
}`}</pre>
          </div>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Безопасность:</strong> Webhook доступен без аутентификации для приема данных от OnlinePBX. 
            Все полученные события логируются в базе данных для дальнейшего анализа.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};