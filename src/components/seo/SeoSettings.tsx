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

  const [isCollecting, setIsCollecting] = useState(false);
  const [isImportingGSC, setIsImportingGSC] = useState(false);
  const [gscSiteUrl, setGscSiteUrl] = useState("sc-domain:okeyenglish.ru");

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

  const handleCollectWordstat = async () => {
    if (!organizationId) {
      toast.error("Не найдена организация");
      return;
    }

    setIsCollecting(true);

    try {
      const { data, error } = await supabase.functions.invoke('seo-collect-wordstat', {
        body: { organizationId }
      });

      if (error) throw error;

      toast.success(`Собрано ${data.collected} запросов, создано ${data.clusters_created} кластеров`);
    } catch (error) {
      console.error("Wordstat collection error:", error);
      toast.error("Ошибка при сборе данных из Яндекс.Вордстат");
    } finally {
      setIsCollecting(false);
    }
  };

  const handleImportGSC = async () => {
    if (!organizationId) {
      toast.error("Не найдена организация");
      return;
    }

    if (!gscSiteUrl) {
      toast.error("Введите URL сайта в GSC");
      return;
    }

    setIsImportingGSC(true);

    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 90); // Последние 90 дней

      const { data, error } = await supabase.functions.invoke('seo-import-gsc', {
        body: {
          siteUrl: gscSiteUrl,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          organizationId
        }
      });

      if (error) throw error;

      toast.success(`Импортировано ${data.imported} записей из Google Search Console`);
    } catch (error) {
      console.error("GSC import error:", error);
      toast.error("Ошибка при импорте данных из Google Search Console");
    } finally {
      setIsImportingGSC(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Настройки</h2>
          <p className="text-muted-foreground">
            Конфигурация интеграций и параметров генерации
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleCollectWordstat} disabled={isCollecting} variant="outline">
            {isCollecting ? "Сбор данных..." : "Собрать Яндекс.Вордстат"}
          </Button>
          <Button onClick={handleImportGSC} disabled={isImportingGSC}>
            {isImportingGSC ? "Импорт..." : "Импорт Google Search Console"}
          </Button>
        </div>
      </div>

      {/* Google Search Console Import */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Google Search Console
          </CardTitle>
          <CardDescription>
            Импорт данных о поисковых запросах за последние 90 дней
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gsc-site-url">URL сайта в GSC</Label>
            <Input
              id="gsc-site-url"
              type="text"
              placeholder="sc-domain:okeyenglish.ru"
              value={gscSiteUrl}
              onChange={(e) => setGscSiteUrl(e.target.value)}
            />
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>Формат URL:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Domain property: <code>sc-domain:example.com</code></li>
              <li>URL prefix: <code>https://example.com/</code></li>
            </ul>
            <p className="mt-2"><strong>Service Account:</strong> {gscSiteUrl ? 'lovable@seo-okey.iam.gserviceaccount.com' : 'не настроен'}</p>
            <p className="text-xs">Добавьте этот email с правами "Viewer" в Google Search Console</p>
          </div>

          <Button 
            onClick={handleImportGSC} 
            disabled={isImportingGSC || !gscSiteUrl}
            className="w-full"
          >
            {isImportingGSC ? "Импортирование..." : "Импортировать данные (90 дней)"}
          </Button>
        </CardContent>
      </Card>

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
