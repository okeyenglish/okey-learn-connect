import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Search, 
  ChevronDown, 
  ChevronRight,
  CheckCircle, 
  XCircle, 
  Clock, 
  Zap,
  MessageSquare,
  Bot,
  CreditCard,
  Phone,
  Upload,
  Settings,
  Globe,
  Shield
} from "lucide-react";

interface FunctionInfo {
  name: string;
  category: string;
  description: string;
  verifyJwt: boolean;
  status?: 'healthy' | 'unhealthy' | 'timeout' | 'unknown';
  responseTime?: number;
}

interface HealthCheckResult {
  function_name: string;
  status: 'healthy' | 'unhealthy' | 'timeout';
  response_time_ms: number;
}

// Edge Functions catalog with categories
const EDGE_FUNCTIONS_CATALOG: FunctionInfo[] = [
  // Messengers - WhatsApp WPP
  { name: "wpp-start", category: "WhatsApp WPP", description: "Запуск WPP сессии", verifyJwt: true },
  { name: "wpp-status", category: "WhatsApp WPP", description: "Статус сессии", verifyJwt: true },
  { name: "wpp-send", category: "WhatsApp WPP", description: "Отправка сообщения", verifyJwt: true },
  { name: "wpp-webhook", category: "WhatsApp WPP", description: "Входящий webhook", verifyJwt: false },
  { name: "wpp-disconnect", category: "WhatsApp WPP", description: "Отключение сессии", verifyJwt: true },
  { name: "wpp-edit", category: "WhatsApp WPP", description: "Редактирование сообщения", verifyJwt: true },
  { name: "wpp-delete", category: "WhatsApp WPP", description: "Удаление сообщения", verifyJwt: true },
  { name: "wpp-download", category: "WhatsApp WPP", description: "Скачивание файла", verifyJwt: true },
  { name: "wpp-diagnostics", category: "WhatsApp WPP", description: "Диагностика сессии", verifyJwt: true },
  
  // Messengers - Wappi
  { name: "wappi-whatsapp-send", category: "WhatsApp Wappi", description: "Отправка через Wappi", verifyJwt: true },
  { name: "wappi-whatsapp-webhook", category: "WhatsApp Wappi", description: "Входящий webhook Wappi", verifyJwt: false },
  { name: "wappi-whatsapp-status", category: "WhatsApp Wappi", description: "Статус Wappi", verifyJwt: true },
  { name: "wappi-whatsapp-edit", category: "WhatsApp Wappi", description: "Редактирование", verifyJwt: true },
  { name: "wappi-whatsapp-delete", category: "WhatsApp Wappi", description: "Удаление", verifyJwt: true },
  { name: "wappi-whatsapp-download", category: "WhatsApp Wappi", description: "Скачивание", verifyJwt: true },
  
  // Messengers - Green API
  { name: "whatsapp-send", category: "WhatsApp Green", description: "Отправка через Green API", verifyJwt: true },
  { name: "whatsapp-webhook", category: "WhatsApp Green", description: "Входящий webhook", verifyJwt: false },
  { name: "whatsapp-check-availability", category: "WhatsApp Green", description: "Проверка номера", verifyJwt: true },
  { name: "whatsapp-get-avatar", category: "WhatsApp Green", description: "Получение аватара", verifyJwt: false },
  { name: "whatsapp-get-contacts", category: "WhatsApp Green", description: "Получение контактов", verifyJwt: true },
  { name: "whatsapp-get-contact-info", category: "WhatsApp Green", description: "Информация о контакте", verifyJwt: true },
  { name: "whatsapp-typing", category: "WhatsApp Green", description: "Статус печати", verifyJwt: true },
  { name: "delete-whatsapp-message", category: "WhatsApp Green", description: "Удаление сообщения", verifyJwt: true },
  { name: "download-whatsapp-file", category: "WhatsApp Green", description: "Скачивание файла", verifyJwt: true },
  { name: "edit-whatsapp-message", category: "WhatsApp Green", description: "Редактирование", verifyJwt: true },
  
  // Messengers - Telegram
  { name: "telegram-webhook", category: "Telegram", description: "Входящий webhook", verifyJwt: false },
  { name: "telegram-send", category: "Telegram", description: "Отправка сообщения", verifyJwt: true },
  { name: "telegram-channels", category: "Telegram", description: "Управление каналами", verifyJwt: true },
  { name: "telegram-get-avatar", category: "Telegram", description: "Получение аватара", verifyJwt: true },
  { name: "telegram-get-contact-info", category: "Telegram", description: "Информация о контакте", verifyJwt: true },
  
  // Messengers - MAX
  { name: "max-webhook", category: "MAX", description: "Входящий webhook", verifyJwt: false },
  { name: "max-send", category: "MAX", description: "Отправка сообщения", verifyJwt: true },
  { name: "max-channels", category: "MAX", description: "Управление каналами", verifyJwt: true },
  { name: "max-edit", category: "MAX", description: "Редактирование", verifyJwt: true },
  { name: "max-delete", category: "MAX", description: "Удаление", verifyJwt: true },
  { name: "max-typing", category: "MAX", description: "Статус печати", verifyJwt: true },
  { name: "max-check-availability", category: "MAX", description: "Проверка доступности", verifyJwt: true },
  { name: "max-get-avatar", category: "MAX", description: "Получение аватара", verifyJwt: true },
  { name: "max-get-contacts", category: "MAX", description: "Получение контактов", verifyJwt: true },
  { name: "max-get-contact-info", category: "MAX", description: "Информация о контакте", verifyJwt: true },
  
  // AI/ML
  { name: "voice-assistant", category: "AI/ML", description: "Голосовой ассистент", verifyJwt: true },
  { name: "ai-consultant", category: "AI/ML", description: "AI консультант", verifyJwt: true },
  { name: "chat-with-ai", category: "AI/ML", description: "Чат с AI", verifyJwt: true },
  { name: "ask", category: "AI/ML", description: "Публичный RAG чат-бот", verifyJwt: true },
  { name: "generate-gpt-response", category: "AI/ML", description: "Генерация ответа GPT", verifyJwt: true },
  { name: "generate-delayed-gpt-response", category: "AI/ML", description: "Отложенный ответ GPT", verifyJwt: true },
  { name: "transcribe-audio", category: "AI/ML", description: "Транскрипция аудио", verifyJwt: true },
  { name: "generate-image", category: "AI/ML", description: "Генерация изображения", verifyJwt: true },
  { name: "teacher-assistant", category: "AI/ML", description: "Ассистент учителя", verifyJwt: true },
  { name: "homework-suggestions", category: "AI/ML", description: "Рекомендации ДЗ", verifyJwt: true },
  { name: "suggest-or-generate", category: "AI/ML", description: "Предложения или генерация", verifyJwt: true },
  { name: "ai-settings", category: "AI/ML", description: "Настройки AI", verifyJwt: true },
  { name: "get-ai-provider", category: "AI/ML", description: "Получить провайдера AI", verifyJwt: true },
  { name: "set-ai-provider", category: "AI/ML", description: "Установить провайдера AI", verifyJwt: true },
  { name: "test-vertex-ai", category: "AI/ML", description: "Тест Vertex AI", verifyJwt: true },
  { name: "generate-call-summary", category: "AI/ML", description: "Саммари звонка", verifyJwt: true },
  { name: "analyze-call", category: "AI/ML", description: "Анализ звонка AI", verifyJwt: true },
  { name: "generate-mini-group-name", category: "AI/ML", description: "Генерация названия группы", verifyJwt: true },
  { name: "openrouter-provisioner", category: "AI/ML", description: "Провижн OpenRouter", verifyJwt: true },
  
  // SEO
  { name: "seo-suggest-ideas", category: "SEO", description: "Идеи для контента", verifyJwt: true },
  { name: "seo-create-brief", category: "SEO", description: "Создание брифа", verifyJwt: true },
  { name: "seo-generate-content", category: "SEO", description: "Генерация контента", verifyJwt: true },
  { name: "seo-analyze-page", category: "SEO", description: "Анализ страницы", verifyJwt: true },
  { name: "seo-reoptimize-page", category: "SEO", description: "Реоптимизация", verifyJwt: true },
  { name: "seo-yandex-export", category: "SEO", description: "Экспорт в Яндекс", verifyJwt: true },
  { name: "seo-indexnow", category: "SEO", description: "IndexNow", verifyJwt: true },
  { name: "seo-collect-wordstat", category: "SEO", description: "Сбор Wordstat", verifyJwt: true },
  { name: "seo-import-gsc", category: "SEO", description: "Импорт GSC", verifyJwt: true },
  { name: "seo-yandex-info", category: "SEO", description: "Информация Яндекс", verifyJwt: true },
  { name: "seo-check-tokens", category: "SEO", description: "Проверка токенов", verifyJwt: true },
  { name: "seo-wordstat", category: "SEO", description: "Wordstat API", verifyJwt: true },
  { name: "seo-enrich-clusters", category: "SEO", description: "Обогащение кластеров", verifyJwt: true },
  { name: "seo-auto-cluster", category: "SEO", description: "Авто-кластеризация", verifyJwt: true },
  { name: "sitemap", category: "SEO", description: "Генерация sitemap", verifyJwt: false },
  { name: "index-content", category: "SEO", description: "Индексация контента", verifyJwt: true },
  
  // Payments
  { name: "tbank-init", category: "Платежи", description: "Инициализация платежа", verifyJwt: true },
  { name: "tbank-init-client", category: "Платежи", description: "Платёж клиента", verifyJwt: true },
  { name: "tbank-webhook", category: "Платежи", description: "Webhook T-Bank", verifyJwt: false },
  { name: "tbank-status", category: "Платежи", description: "Статус платежа", verifyJwt: true },
  { name: "auto-payment-notifications", category: "Платежи", description: "Авто-уведомления", verifyJwt: true },
  { name: "send-payment-notifications", category: "Платежи", description: "Отправка уведомлений", verifyJwt: true },
  
  // Telephony
  { name: "onlinepbx-call", category: "Телефония", description: "Инициирование звонка", verifyJwt: true },
  { name: "onlinepbx-webhook", category: "Телефония", description: "Webhook OnlinePBX", verifyJwt: false },
  { name: "onlinepbx-settings", category: "Телефония", description: "Настройки", verifyJwt: true },
  { name: "test-onlinepbx", category: "Телефония", description: "Тест подключения", verifyJwt: true },
  { name: "migrate-onlinepbx-settings", category: "Телефония", description: "Миграция настроек", verifyJwt: true },
  { name: "request-callback", category: "Телефония", description: "Запрос callback", verifyJwt: false },
  
  // Import/Export
  { name: "import-holihope", category: "Импорт", description: "Импорт Holihope", verifyJwt: true },
  { name: "import-students", category: "Импорт", description: "Импорт студентов", verifyJwt: true },
  { name: "import-salebot-chats", category: "Импорт", description: "Импорт чатов Salebot", verifyJwt: true },
  { name: "import-salebot-chats-auto", category: "Импорт", description: "Авто-импорт Salebot", verifyJwt: true },
  { name: "import-salebot-ids-csv", category: "Импорт", description: "Импорт ID из CSV", verifyJwt: true },
  { name: "salebot-webhook", category: "Импорт", description: "Webhook Salebot", verifyJwt: false },
  { name: "salebot-stop", category: "Импорт", description: "Остановка Salebot", verifyJwt: true },
  { name: "get-employees", category: "Импорт", description: "Получение сотрудников", verifyJwt: true },
  { name: "sync-auto-groups", category: "Импорт", description: "Синхронизация групп", verifyJwt: true },
  { name: "sync-single-auto-group", category: "Импорт", description: "Синхронизация группы", verifyJwt: true },
  
  // System
  { name: "edge-health-monitor", category: "Система", description: "Мониторинг Edge Functions", verifyJwt: false },
  { name: "sla-monitor", category: "Система", description: "SLA мониторинг", verifyJwt: false },
  { name: "process-events", category: "Система", description: "Обработка событий", verifyJwt: false },
  { name: "refresh-chat-threads-mv", category: "Система", description: "Обновление MV чатов", verifyJwt: false },
  { name: "lesson-reminders", category: "Система", description: "Напоминания об уроках", verifyJwt: false },
  { name: "send-push-notification", category: "Система", description: "Push уведомления", verifyJwt: true },
  { name: "admin-reset-password", category: "Система", description: "Сброс пароля", verifyJwt: true },
  { name: "check-user-access", category: "Система", description: "Проверка доступа", verifyJwt: false },
  { name: "complete-employee-onboarding", category: "Система", description: "Онбординг сотрудника", verifyJwt: false },
  
  // Auth/SSO
  { name: "qr-login-generate", category: "Авторизация", description: "Генерация QR", verifyJwt: false },
  { name: "qr-login-check", category: "Авторизация", description: "Проверка QR", verifyJwt: false },
  { name: "qr-login-confirm", category: "Авторизация", description: "Подтверждение QR", verifyJwt: false },
  { name: "sso-encrypt", category: "Авторизация", description: "SSO шифрование", verifyJwt: false },
  { name: "sso-decrypt", category: "Авторизация", description: "SSO расшифровка", verifyJwt: false },
  
  // Apps
  { name: "generate-app", category: "Приложения", description: "Генерация приложения", verifyJwt: true },
  { name: "improve-app", category: "Приложения", description: "Улучшение приложения", verifyJwt: true },
  { name: "publish-app", category: "Приложения", description: "Публикация приложения", verifyJwt: true },
  { name: "manage-app", category: "Приложения", description: "Управление приложением", verifyJwt: true },
  
  // Other
  { name: "bbb-meeting", category: "Прочее", description: "BigBlueButton встречи", verifyJwt: true },
  { name: "create-teacher-rooms", category: "Прочее", description: "Создание комнат учителей", verifyJwt: true },
  { name: "webhook-proxy", category: "Прочее", description: "Прокси webhooks", verifyJwt: false },
  { name: "submit-trial-request", category: "Прочее", description: "Заявка на триал", verifyJwt: false },
  { name: "create-teacher-test-data", category: "Прочее", description: "Тестовые данные учителя", verifyJwt: true },
  { name: "create-student-test-data", category: "Прочее", description: "Тестовые данные студента", verifyJwt: true },
  { name: "migrate-messenger-settings", category: "Прочее", description: "Миграция настроек мессенджеров", verifyJwt: true },
];

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "WhatsApp WPP": <MessageSquare className="h-4 w-4 text-green-600" />,
  "WhatsApp Wappi": <MessageSquare className="h-4 w-4 text-green-500" />,
  "WhatsApp Green": <MessageSquare className="h-4 w-4 text-green-400" />,
  "Telegram": <MessageSquare className="h-4 w-4 text-blue-500" />,
  "MAX": <MessageSquare className="h-4 w-4 text-purple-500" />,
  "AI/ML": <Bot className="h-4 w-4 text-violet-500" />,
  "SEO": <Globe className="h-4 w-4 text-orange-500" />,
  "Платежи": <CreditCard className="h-4 w-4 text-emerald-500" />,
  "Телефония": <Phone className="h-4 w-4 text-cyan-500" />,
  "Импорт": <Upload className="h-4 w-4 text-amber-500" />,
  "Система": <Settings className="h-4 w-4 text-gray-500" />,
  "Авторизация": <Shield className="h-4 w-4 text-red-500" />,
  "Приложения": <Zap className="h-4 w-4 text-yellow-500" />,
  "Прочее": <Zap className="h-4 w-4 text-gray-400" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  "WhatsApp WPP": "bg-green-100 text-green-800 border-green-200",
  "WhatsApp Wappi": "bg-green-50 text-green-700 border-green-100",
  "WhatsApp Green": "bg-emerald-50 text-emerald-700 border-emerald-100",
  "Telegram": "bg-blue-100 text-blue-800 border-blue-200",
  "MAX": "bg-purple-100 text-purple-800 border-purple-200",
  "AI/ML": "bg-violet-100 text-violet-800 border-violet-200",
  "SEO": "bg-orange-100 text-orange-800 border-orange-200",
  "Платежи": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Телефония": "bg-cyan-100 text-cyan-800 border-cyan-200",
  "Импорт": "bg-amber-100 text-amber-800 border-amber-200",
  "Система": "bg-gray-100 text-gray-800 border-gray-200",
  "Авторизация": "bg-red-100 text-red-800 border-red-200",
  "Приложения": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "Прочее": "bg-slate-100 text-slate-800 border-slate-200",
};

interface EdgeFunctionsVisualizationProps {
  healthResults?: HealthCheckResult[];
}

export function EdgeFunctionsVisualization({ healthResults }: EdgeFunctionsVisualizationProps) {
  const [search, setSearch] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Merge health results with catalog
  const functionsWithStatus = useMemo(() => {
    const healthMap = new Map<string, HealthCheckResult>();
    healthResults?.forEach(r => healthMap.set(r.function_name, r));

    return EDGE_FUNCTIONS_CATALOG.map(fn => ({
      ...fn,
      status: healthMap.get(fn.name)?.status || 'unknown' as const,
      responseTime: healthMap.get(fn.name)?.response_time_ms,
    }));
  }, [healthResults]);

  // Filter by search
  const filteredFunctions = useMemo(() => {
    if (!search.trim()) return functionsWithStatus;
    const q = search.toLowerCase();
    return functionsWithStatus.filter(
      fn => fn.name.toLowerCase().includes(q) || 
            fn.description.toLowerCase().includes(q) ||
            fn.category.toLowerCase().includes(q)
    );
  }, [functionsWithStatus, search]);

  // Group by category
  const groupedFunctions = useMemo(() => {
    const groups: Record<string, FunctionInfo[]> = {};
    filteredFunctions.forEach(fn => {
      if (!groups[fn.category]) groups[fn.category] = [];
      groups[fn.category].push(fn);
    });
    return groups;
  }, [filteredFunctions]);

  // Statistics
  const stats = useMemo(() => {
    const total = functionsWithStatus.length;
    const healthy = functionsWithStatus.filter(f => f.status === 'healthy').length;
    const unhealthy = functionsWithStatus.filter(f => f.status === 'unhealthy').length;
    const timeout = functionsWithStatus.filter(f => f.status === 'timeout').length;
    const unknown = functionsWithStatus.filter(f => f.status === 'unknown').length;
    const publicFns = functionsWithStatus.filter(f => !f.verifyJwt).length;
    const categories = Object.keys(groupedFunctions).length;
    
    return { total, healthy, unhealthy, timeout, unknown, publicFns, categories };
  }, [functionsWithStatus, groupedFunctions]);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedCategories(new Set(Object.keys(groupedFunctions)));
  };

  const collapseAll = () => {
    setExpandedCategories(new Set());
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-3.5 w-3.5 text-green-500" />;
      case 'unhealthy':
        return <XCircle className="h-3.5 w-3.5 text-red-500" />;
      case 'timeout':
        return <Clock className="h-3.5 w-3.5 text-yellow-500" />;
      default:
        return <div className="h-3.5 w-3.5 rounded-full bg-gray-300" />;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Каталог Edge Functions
            <Badge variant="secondary">{stats.total}</Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={expandAll}>
              Развернуть
            </Button>
            <Button variant="ghost" size="sm" onClick={collapseAll}>
              Свернуть
            </Button>
          </div>
        </div>
        
        {/* Stats bar */}
        <div className="flex flex-wrap gap-4 mt-3 text-sm">
          <div className="flex items-center gap-1.5">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>{stats.healthy} здоровых</span>
          </div>
          <div className="flex items-center gap-1.5">
            <XCircle className="h-4 w-4 text-red-500" />
            <span>{stats.unhealthy} ошибок</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-yellow-500" />
            <span>{stats.timeout} таймаутов</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-4 w-4 rounded-full bg-gray-300" />
            <span>{stats.unknown} не проверено</span>
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span>{stats.publicFns} публичных</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по названию, описанию или категории..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Categories grid */}
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-3">
            {Object.entries(groupedFunctions).map(([category, functions]) => (
              <Collapsible
                key={category}
                open={expandedCategories.has(category)}
                onOpenChange={() => toggleCategory(category)}
              >
                <CollapsibleTrigger asChild>
                  <div className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors ${CATEGORY_COLORS[category] || 'bg-muted'}`}>
                    <div className="flex items-center gap-2">
                      {expandedCategories.has(category) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      {CATEGORY_ICONS[category]}
                      <span className="font-medium">{category}</span>
                      <Badge variant="outline" className="ml-2">
                        {functions.length}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      {functions.filter(f => f.status === 'healthy').length > 0 && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          {functions.filter(f => f.status === 'healthy').length} ✓
                        </Badge>
                      )}
                      {functions.filter(f => f.status === 'unhealthy').length > 0 && (
                        <Badge variant="secondary" className="bg-red-100 text-red-800">
                          {functions.filter(f => f.status === 'unhealthy').length} ✗
                        </Badge>
                      )}
                    </div>
                  </div>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mt-2 pl-6">
                    {functions.map(fn => (
                      <TooltipProvider key={fn.name}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className={`flex items-center gap-2 p-2 rounded border bg-background hover:bg-muted/50 transition-colors ${
                              fn.status === 'unhealthy' ? 'border-red-300' :
                              fn.status === 'timeout' ? 'border-yellow-300' :
                              fn.status === 'healthy' ? 'border-green-300' : ''
                            }`}>
                              {getStatusIcon(fn.status || 'unknown')}
                              <code className="text-xs font-mono truncate flex-1">
                                {fn.name}
                              </code>
                              {!fn.verifyJwt && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0">
                                  public
                                </Badge>
                              )}
                              {fn.responseTime !== undefined && (
                                <span className="text-[10px] text-muted-foreground">
                                  {fn.responseTime}ms
                                </span>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="space-y-1">
                              <div className="font-medium">{fn.name}</div>
                              <div className="text-xs text-muted-foreground">{fn.description}</div>
                              <div className="text-xs">
                                {fn.verifyJwt ? '🔒 Требует авторизации' : '🌐 Публичный'}
                              </div>
                              {fn.responseTime !== undefined && (
                                <div className="text-xs">⏱ {fn.responseTime}ms</div>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default EdgeFunctionsVisualization;
