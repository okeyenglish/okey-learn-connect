
# План: Добавление Push Diagnostics в настройки CRM

## Проблема
Сейчас в CRM нет доступа к диагностике Push-уведомлений. Кнопка диагностики существует в коде, но параметр `showDiagnostics={true}` нигде не передаётся.

## Что будет сделано

### 1. Добавить вкладку "Уведомления" в Settings.tsx
- Добавить новую вкладку в настройки CRM
- Иконка: Bell (колокольчик)
- Название: "Уведомления"

### 2. Разместить на вкладке:
- **PushNotificationToggle** с параметрами:
  - `variant="card"` — карточный вид
  - `showDiagnostics={true}` — включить кнопку диагностики
  - `showFocusWarning={true}` — показывать предупреждение о режиме "Не беспокоить"

### 3. Функционал диагностики
После этого в настройках появится карточка Push-уведомлений с кнопкой ⚙️ (шестерёнка), которая открывает диалог диагностики со следующими данными:
- Версия Service Worker
- Статус подписки
- Проверка VAPID ключей
- **Raw Payloads** — последние полученные push-уведомления в сыром виде

## Как проверить после реализации

1. Открыть CRM → Настройки (шестерёнка в меню)
2. Перейти на вкладку "Уведомления"
3. Нажать на иконку ⚙️ рядом с заголовком "Push-уведомления"
4. В открывшемся диалоге развернуть секцию "Raw Payloads"
5. Отправить тестовый push через кнопку "Тест" в диагностике
6. Посмотреть полученный payload

---

## Техническая часть

### Изменения в файлах:

**src/pages/Settings.tsx:**
```typescript
// Добавить импорт
import { Bell } from 'lucide-react';
import { PushNotificationToggle } from '@/components/notifications/PushNotificationToggle';

// Добавить новую вкладку в TabsList (после telephony)
<TabsTrigger value="notifications" className="gap-2">
  <Bell className="h-4 w-4" />
  <span className="hidden sm:inline">Уведомления</span>
</TabsTrigger>

// Добавить TabsContent
<TabsContent value="notifications" className="space-y-4">
  <PushNotificationToggle 
    variant="card" 
    showDiagnostics={true} 
    showFocusWarning={true} 
  />
</TabsContent>
```

### Количество изменяемых файлов: 1
### Оценка времени: 2 минуты
