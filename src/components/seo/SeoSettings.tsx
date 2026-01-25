import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Send, CheckCircle, XCircle, Sparkles, RefreshCw, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/typedClient";
import { toast } from "sonner";

const SeoSettings = () => {
  const [testUrl, setTestUrl] = useState("");
  const [isTestingIndexNow, setIsTestingIndexNow] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  const [isCollecting, setIsCollecting] = useState(false);
  const [isImportingGSC, setIsImportingGSC] = useState(false);
  const [gscSiteUrl, setGscSiteUrl] = useState("sc-domain:okeyenglish.ru");
  
  const [isFetchingYandex, setIsFetchingYandex] = useState(false);
  const [yandexInfo, setYandexInfo] = useState<{ userId: string; hosts: any[] } | null>(null);
  
  const [isCheckingTokens, setIsCheckingTokens] = useState(false);
  const [tokensCheck, setTokensCheck] = useState<any>(null);
  
  const [isEnrichingClusters, setIsEnrichingClusters] = useState(false);
  const [enrichResult, setEnrichResult] = useState<any>(null);
  const [wordstatResult, setWordstatResult] = useState<any>(null);
  const [isAutoClustering, setIsAutoClustering] = useState(false);
  const [clusterResult, setClusterResult] = useState<any>(null);

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
    setWordstatResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('seo-collect-wordstat', {
        body: { organizationId }
      });

      if (data && data.success === false) {
        // Возвращаем читабельное сообщение пользователю
        throw new Error(data.message || 'Ошибка при сборе данных из Яндекс.Вордстат');
      }

      setWordstatResult(data);
      toast.success(`Собрано ${data.collected} запросов, создано ${data.clusters_created} кластеров`);
    } catch (error) {
      console.error("Wordstat collection error:", error);
      const errorObj = error as Error | { message?: string; error?: { message?: string } };
      const msg = ('message' in errorObj ? errorObj.message : undefined) || 
                  (typeof errorObj === 'object' && 'error' in errorObj && errorObj.error?.message) || 
                  "Ошибка при сборе данных из Яндекс.Вордстат";
      toast.error(msg);
    } finally {
      setIsCollecting(false);
    }
  };

  const handleEnrichClusters = async () => {
    if (!organizationId) {
      toast.error("Не найдена организация");
      return;
    }

    setIsEnrichingClusters(true);
    setEnrichResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('seo-enrich-clusters', {
        body: { organizationId }
      });

      if (error) throw error;

      setEnrichResult(data);
      toast.success(`Обогащено ${data.enriched} кластеров из ${data.total}`);
    } catch (error) {
      console.error("Cluster enrichment error:", error);
      toast.error("Ошибка при обогащении кластеров");
    } finally {
      setIsEnrichingClusters(false);
    }
  };

  const handleAutoCluster = async () => {
    if (!organizationId) {
      toast.error("Не найдена организация");
      return;
    }

    setIsAutoClustering(true);
    setClusterResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('seo-auto-cluster', {
        body: { organizationId }
      });

      if (error) throw error;

      setClusterResult(data);
      toast.success(`Создано ${data.clustersCreated} кластеров из ${data.totalKeywords} запросов`);
    } catch (error) {
      console.error("Auto clustering error:", error);
      toast.error("Ошибка при автоматической кластеризации");
    } finally {
      setIsAutoClustering(false);
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

  const handleFetchYandexInfo = async () => {
    setIsFetchingYandex(true);
    setYandexInfo(null);

    try {
      const { data, error } = await supabase.functions.invoke('seo-yandex-info');

      if (error) throw error;

      setYandexInfo({
        userId: data.userId,
        hosts: data.hosts
      });
      toast.success(`Получено: user_id и ${data.hosts.length} хостов`);
    } catch (error) {
      console.error("Yandex info fetch error:", error);
      toast.error("Ошибка при получении данных из Яндекс.Вебмастер");
    } finally {
      setIsFetchingYandex(false);
    }
  };

  const handleCheckTokens = async () => {
    setIsCheckingTokens(true);
    setTokensCheck(null);

    try {
      const { data, error } = await supabase.functions.invoke('seo-check-tokens');

      if (error) throw error;

      setTokensCheck(data);
      
      if (data.summary.all_tokens_valid) {
        toast.success("Все токены валидны и работают корректно!");
      } else {
        toast.warning("Некоторые токены имеют проблемы, проверьте детали ниже");
      }
    } catch (error) {
      console.error("Tokens check error:", error);
      toast.error("Ошибка при проверке токенов");
    } finally {
      setIsCheckingTokens(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Настройки</h2>
          <p className="text-muted-foreground">
            Автоматизация SEO: сбор данных, кластеризация и аналитика
          </p>
        </div>
      </div>

      {/* Step 1: Wordstat Collection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">1</span>
            Сбор данных Яндекс.Вордстат
          </CardTitle>
          <CardDescription>
            Автоматический сбор частотности и конкуренции по ключевым запросам
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleCollectWordstat} disabled={isCollecting} className="w-full">
            {isCollecting ? "Сбор данных..." : "Собрать базовую статистику"}
          </Button>
          
          {wordstatResult && wordstatResult.collected > 0 && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-semibold mb-2">✅ Статистика собрана</p>
              <p className="text-sm">
                Собрано <strong>{wordstatResult.collected}</strong> ключевых слов
              </p>
            </div>
          )}
          {wordstatResult && wordstatResult.success === false && (
            <div className="p-4 rounded-lg bg-destructive/10 text-destructive">
              <p className="text-sm font-semibold mb-1">⚠️ Ошибка сбора Wordstat</p>
              <p className="text-sm">{wordstatResult.message}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Auto Clustering */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">2</span>
            Автоматическая кластеризация
          </CardTitle>
          <CardDescription>
            Группировка запросов в кластеры и формирование ядра
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleAutoCluster} disabled={isAutoClustering} className="w-full" variant="default">
            {isAutoClustering ? "Создание кластеров..." : "Создать кластеры автоматически"}
          </Button>
          
          {clusterResult && (
            <div className="p-4 bg-muted rounded-lg space-y-3">
              <p className="text-sm font-semibold">✅ Кластеры созданы</p>
              <p className="text-sm">
                Создано <strong>{clusterResult.clustersCreated}</strong> кластеров из <strong>{clusterResult.totalKeywords}</strong> запросов
              </p>
              {clusterResult.clusters?.slice(0, 5).map((c: any, i: number) => (
                <div key={i} className="text-xs text-muted-foreground pl-4 border-l-2 border-primary/20">
                  <strong>{c.head_term}</strong> • score: {c.score} • {c.members.length} запросов
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 3: Enrich Clusters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">3</span>
            Обогащение кластеров
          </CardTitle>
          <CardDescription>
            Обновление статистики Wordstat для существующих кластеров
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleEnrichClusters} disabled={isEnrichingClusters} variant="outline" className="w-full">
            {isEnrichingClusters ? "Обогащение..." : "Обновить существующие кластеры"}
          </Button>
          
          {enrichResult && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-semibold mb-2">✅ Обогащение завершено</p>
              <p className="text-sm">
                Обогащено <strong>{enrichResult.enriched}</strong> из <strong>{enrichResult.total}</strong> кластеров
                {enrichResult.errors > 0 && <span className="text-destructive"> ({enrichResult.errors} ошибок)</span>}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

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

      {/* Yandex Webmaster Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Яндекс.Вебмастер - ID параметры
          </CardTitle>
          <CardDescription>
            Получите user_id и host_id для настройки интеграций
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleFetchYandexInfo} 
            disabled={isFetchingYandex}
            className="w-full"
          >
            {isFetchingYandex ? "Получение данных..." : "Получить ID из Яндекс.Вебмастер"}
          </Button>

          {yandexInfo && (
            <div className="space-y-4 p-4 bg-muted rounded-lg">
              <div>
                <Label className="text-xs font-semibold">YANDEX_WEBMASTER_USER_ID</Label>
                <code className="block mt-1 p-2 bg-background rounded text-sm">{yandexInfo.userId}</code>
              </div>

              {yandexInfo.hosts.length > 0 && (
                <div>
                  <Label className="text-xs font-semibold">Доступные хосты (YANDEX_WEBMASTER_HOST_ID):</Label>
                  <div className="space-y-2 mt-2">
                    {yandexInfo.hosts.map((host: any, idx: number) => (
                      <div key={idx} className="p-2 bg-background rounded">
                        <div className="text-sm font-medium">{host.unicode_host_url || host.host_url}</div>
                        <code className="text-xs text-muted-foreground">{host.host_id}</code>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            <p>Эти значения необходимо добавить в секреты для работы автоматизации SEO</p>
          </div>
        </CardContent>
      </Card>

      {/* Tokens Check */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Проверка токенов API
          </CardTitle>
          <CardDescription>
            Проверка корректности всех токенов для работы SEO автоматизации
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleCheckTokens} 
            disabled={isCheckingTokens}
            className="w-full"
          >
            {isCheckingTokens ? "Проверка токенов..." : "Проверить все токены"}
          </Button>

          {tokensCheck && (
            <div className="space-y-4">
              {/* Summary */}
              <div className={`p-4 rounded-lg ${
                tokensCheck.summary.all_tokens_valid 
                  ? "bg-green-50 text-green-900" 
                  : "bg-yellow-50 text-yellow-900"
              }`}>
                <div className="font-semibold mb-2">
                  {tokensCheck.summary.all_tokens_valid ? "✅ Все токены работают" : "⚠️ Есть проблемы с токенами"}
                </div>
                <div className="space-y-1 text-sm">
                  <div>OAuth Token (Webmaster): {tokensCheck.summary.tokens_status.oauth_token}</div>
                  <div>Метрика Counter ID: {tokensCheck.summary.tokens_status.metrika_counter}</div>
                  <div>Webmaster Host ID: {tokensCheck.summary.tokens_status.webmaster_host}</div>
                  <div>Webmaster User ID: {tokensCheck.summary.tokens_status.webmaster_user}</div>
                  <div>Direct Token (Wordstat): {tokensCheck.summary.tokens_status.direct_token}</div>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-3">
                {Object.entries(tokensCheck.details).map(([key, value]: [string, any]) => (
                  <div key={key} className="p-3 bg-muted rounded-lg">
                    <div className="font-semibold text-sm mb-1">
                      {key.replace(/_/g, ' ').toUpperCase()}
                    </div>
                    <div className="text-xs space-y-1">
                      {!value.exists && <div className="text-red-600">❌ Токен не настроен</div>}
                      {value.exists && value.valid && <div className="text-green-600">✅ Работает корректно</div>}
                      {value.exists && !value.valid && value.error === 'PENDING_LOAD' && (
                        <div className="text-yellow-600">⏳ Ожидает загрузки в Яндекс.Вебмастер (1-7 дней)</div>
                      )}
                      {value.exists && !value.valid && value.error !== 'PENDING_LOAD' && (
                        <div className="text-red-600">❌ Ошибка: {value.error}</div>
                      )}
                      {value.value && <code className="block mt-1 p-1 bg-background rounded text-xs">{value.value}</code>}
                      {value.data && (
                        <pre className="mt-1 p-2 bg-background rounded text-xs overflow-auto max-h-32">
                          {JSON.stringify(value.data, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>Проверяемые токены:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>YANDEX_OAUTH_TOKEN - доступ к Webmaster API</li>
              <li>YANDEX_METRIKA_COUNTER_ID - ID счетчика метрики</li>
              <li>YANDEX_WEBMASTER_HOST_ID - ID хоста в вебмастере</li>
              <li>YANDEX_WEBMASTER_USER_ID - ID пользователя в вебмастере</li>
              <li>YANDEX_DIRECT_TOKEN - доступ к Wordstat API</li>
            </ul>
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
