

## Диагностика клиентов Salebot без диалогов

### ✅ Проблема найдена и исправлена

**Причина:** 100% клиентов (18 511) не имели `salebot_client_type` — поле, определяющее тип мессенджера. Без него импорт сообщений не мог корректно определить источник диалога.

**Исправления (уже задеплоены):**
1. `salebot-webhook` — теперь сохраняет `salebot_client_type` при создании/обновлении клиентов
2. `import-salebot-chats-auto` — теперь сохраняет `salebot_client_type` во всех режимах

---

### Следующие шаги

#### Шаг 1: Backfill существующих клиентов

Запустите режим **"Заполнить Salebot ID"** (Fill Salebot IDs) в SyncDashboard. 
Теперь этот режим также заполняет `salebot_client_type`.

**Ограничение:** API лимит 6000 запросов/день. При 18 511 клиентах потребуется ~3 дня.

#### Шаг 2: Проверка прогресса

После каждого батча проверяйте на self-hosted:
```sql
-- Сколько клиентов получили client_type
SELECT 
  COUNT(*) as total,
  COUNT(salebot_client_type) as with_type,
  COUNT(*) - COUNT(salebot_client_type) as without_type
FROM clients
WHERE salebot_client_id IS NOT NULL;

-- Распределение по типам
SELECT 
  salebot_client_type,
  CASE salebot_client_type
    WHEN 0 THEN 'VK'
    WHEN 1 THEN 'Telegram'
    WHEN 2 THEN 'Viber'
    WHEN 6 THEN 'WhatsApp'
    WHEN 16 THEN 'TG Bot'
    WHEN 20 THEN 'Max'
    WHEN 21 THEN 'TG Personal'
    ELSE 'Unknown'
  END as messenger,
  COUNT(*) as count
FROM clients
WHERE salebot_client_id IS NOT NULL
  AND salebot_client_type IS NOT NULL
GROUP BY salebot_client_type
ORDER BY count DESC;
```

#### Шаг 3: Импорт сообщений для клиентов без диалогов

После заполнения `salebot_client_type`:
1. Запустите режим **"Импорт только новых"** (Sync New Clients Only)
2. Этот режим импортирует сообщения только для клиентов, у которых их ещё нет

---

### Важно: Self-hosted деплой

⚠️ Исправления задеплоены в Lovable Cloud, но **не на self-hosted сервер** (api.academyos.ru)!

Для применения на self-hosted:
1. Скопируйте обновлённые файлы функций:
   - `supabase/functions/salebot-webhook/index.ts`
   - `supabase/functions/import-salebot-chats-auto/index.ts`
2. Задеплойте через Supabase CLI или перезапустите сервисы

---

### Статистика (текущая)

| Показатель | Значение |
|------------|----------|
| Всего клиентов Salebot | 18 511 |
| Без сообщений | 11 151 (60%) |
| Без `salebot_client_type` | 18 511 (100%) ← **исправляется** |
