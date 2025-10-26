import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Send, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SeoSettings = () => {
  const [testUrl, setTestUrl] = useState("");
  const [isTestingIndexNow, setIsTestingIndexNow] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single();
        
        if (profile?.organization_id) {
          setOrganizationId(profile.organization_id);
        }
      }
    };
    
    fetchProfile();
  }, []);

  const handleTestIndexNow = async () => {
    if (!testUrl) {
      toast.error("Введите URL для тестирования");
      return;
    }

    if (!organizationId) {
      toast.error("Не найдена организация");
      return;
    }

    setIsTestingIndexNow(true);
    setTestResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('seo-indexnow', {
        body: {
          urls: [testUrl],
          host: "okeyenglish.ru",
          organizationId: organizationId
        }
      });

      if (error) throw error;

      setTestResult({
        success: true,
        message: `Успешно отправлено! Статус: ${data.status}`
      });
      toast.success("URL успешно отправлен в IndexNow");
    } catch (error) {
      console.error("IndexNow test error:", error);
      setTestResult({
        success: false,
        message: error.message || "Ошибка при отправке"
      });
      toast.error("Ошибка при тестировании IndexNow");
    } finally {
      setIsTestingIndexNow(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">Настройки</h2>
        <p className="text-muted-foreground">
          Конфигурация интеграций и параметров генерации
        </p>
      </div>

      {/* IndexNow Testing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Тестирование IndexNow
          </CardTitle>
          <CardDescription>
            Проверьте работу интеграции с IndexNow (Яндекс, Bing, Seznam)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="test-url">URL для тестирования</Label>
            <Input
              id="test-url"
              type="url"
              placeholder="https://okeyenglish.ru/test-page"
              value={testUrl}
              onChange={(e) => setTestUrl(e.target.value)}
            />
          </div>

          <Button 
            onClick={handleTestIndexNow} 
            disabled={isTestingIndexNow || !testUrl}
            className="w-full"
          >
            {isTestingIndexNow ? "Отправка..." : "Отправить тестовый URL"}
          </Button>

          {testResult && (
            <div className={`flex items-start gap-2 p-3 rounded-lg ${
              testResult.success ? "bg-green-50 text-green-900" : "bg-red-50 text-red-900"
            }`}>
              {testResult.success ? (
                <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
              ) : (
                <XCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
              )}
              <div className="text-sm">{testResult.message}</div>
            </div>
          )}

          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>Проверка настройки:</strong></p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Файл верификации: <a href="https://okeyenglish.ru/483ea48ec6a84d4094ccdca9c7b1aeaf.txt" target="_blank" rel="noopener noreferrer" className="text-primary underline">проверить</a></li>
              <li>Отправьте тестовый URL выше</li>
              <li>HTTP 200 или 202 = успешно</li>
            </ol>
          </div>
        </CardContent>
      </Card>

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
