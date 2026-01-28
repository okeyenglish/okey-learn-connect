
# План: Диагностика OnlinePBX для Self-Hosted Supabase

## Проблема

Звонок с номера 79269084335 не отображается в CRM. Без доступа к серверу невозможно понять:
- Пришёл ли webhook от OnlinePBX
- Как он был обработан
- Почему звонок не появился в базе

## Решение

Создать Edge Function `onlinepbx-diagnostics` и UI-панель диагностики прямо в настройках OnlinePBX.

## Архитектура

```text
┌──────────────────────────────────────────────────────────────┐
│  Настройки OnlinePBX (OnlinePBXSettings.tsx)                 │
├──────────────────────────────────────────────────────────────┤
│  [Настройки] [Диагностика]                                   │
├──────────────────────────────────────────────────────────────┤
│  🔍 Поиск по номеру: [79269084335] [Искать]                  │
├──────────────────────────────────────────────────────────────┤
│  Последние Webhooks (webhook_logs):                          │
│  ┌──────────────────────────────────────────────────────────┐│
│  │ Время      │ Тип         │ Номер      │ Статус │ Данные  ││
│  │ 16:55:23   │ raw_webhook │ 7926...    │ ✓      │ [JSON]  ││
│  │ 16:50:01   │ raw_webhook │ 7926...    │ ✓      │ [JSON]  ││
│  └──────────────────────────────────────────────────────────┘│
├──────────────────────────────────────────────────────────────┤
│  Последние звонки (call_logs):                               │
│  ┌──────────────────────────────────────────────────────────┐│
│  │ Время   │ Номер      │ Статус   │ Запись │ AI-анализ    ││
│  │ 16:55   │ 7926...    │ answered │ ✓      │ ✗            ││
│  └──────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────┘
```

## Файлы для создания/изменения

### 1. Новый Edge Function: `supabase/functions/onlinepbx-diagnostics/index.ts`

**Функционал:**
- Получение последних 20 записей из `webhook_logs` (type = 'onlinepbx')
- Получение последних 20 записей из `call_logs`
- Поиск по номеру телефона в обеих таблицах
- Возврат raw webhook data для отладки

**Эндпоинты:**
- `POST { action: 'webhooks' }` → последние webhooks
- `POST { action: 'calls' }` → последние звонки
- `POST { action: 'search', phone: '79269084335' }` → поиск по номеру

### 2. Новый компонент: `src/components/admin/OnlinePBXDiagnostics.tsx`

**Функционал:**
- Поле поиска по номеру телефона
- Таблица последних webhooks с возможностью раскрыть JSON
- Таблица последних звонков с индикаторами (запись, анализ)
- Кнопки "Обновить" и "Запустить анализ" для конкретного звонка

### 3. Изменение: `src/components/admin/OnlinePBXSettings.tsx`

**Добавить:**
- Tabs компонент с вкладками "Настройки" и "Диагностика"
- Импорт и отрисовка `OnlinePBXDiagnostics` на второй вкладке

### 4. Изменение: `supabase/config.toml`

**Добавить:**
- Регистрацию новой функции `onlinepbx-diagnostics` с `verify_jwt = false`

## Технические детали

### Edge Function: onlinepbx-diagnostics

```typescript
// Запрос webhooks
POST /onlinepbx-diagnostics
{ action: 'webhooks', limit: 20 }

// Ответ
{
  success: true,
  webhooks: [
    {
      id: 'uuid',
      created_at: '2026-01-28T16:55:23Z',
      event_type: 'raw_webhook',
      webhook_data: { /* raw OnlinePBX payload */ },
      processed: true
    }
  ]
}

// Запрос поиска
POST /onlinepbx-diagnostics
{ action: 'search', phone: '79269084335' }

// Ответ
{
  success: true,
  webhooks: [...],
  calls: [
    {
      id: 'uuid',
      phone_number: '+7 (926) 908-43-35',
      status: 'answered',
      duration_seconds: 145,
      recording_url: 'https://...',
      ai_evaluation: null,
      started_at: '2026-01-28T16:55:00Z'
    }
  ]
}
```

### UI компонент: OnlinePBXDiagnostics

Использует:
- `selfHostedPost` для запросов к self-hosted API
- `Tabs`, `Table`, `Badge`, `Button`, `Input` из shadcn/ui
- `Collapsible` для раскрытия JSON данных
- `Dialog` для просмотра полного JSON webhook

### Взаимодействие с CallDetailModal

Уже есть кнопка "Запустить анализ" в `CallDetailModal` (строки 366-383), которая вызывает `selfHostedPost('analyze-call', { callId })`. Диагностическая панель будет показывать статус анализа и позволит запустить его из списка.

## Порядок реализации

1. Создать `onlinepbx-diagnostics/index.ts`
2. Обновить `supabase/config.toml`
3. Создать `OnlinePBXDiagnostics.tsx`
4. Обновить `OnlinePBXSettings.tsx` с табами

## Результат

После реализации можно будет:

1. Открыть "Настройки" → "Телефония (OnlinePBX)" → вкладка "Диагностика"
2. Ввести номер `79269084335` и нажать "Искать"
3. Увидеть:
   - Пришёл ли webhook от OnlinePBX (и его raw данные)
   - Создался ли call_log
   - Есть ли запись разговора
   - Выполнен ли AI-анализ
4. При необходимости — запустить анализ вручную
