

## Диагностика клиентов Salebot без диалогов

### SQL-запросы для запуска на self-hosted сервере

**1. Общая статистика:**
```sql
-- Сколько клиентов с salebot_client_id всего
SELECT COUNT(*) as total_salebot_clients
FROM clients
WHERE salebot_client_id IS NOT NULL;

-- Сколько клиентов БЕЗ сообщений
SELECT COUNT(*) as clients_without_messages
FROM clients c
WHERE c.salebot_client_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM chat_messages m 
    WHERE m.client_id = c.id
  );

-- Сколько клиентов БЕЗ импортированных сообщений (salebot_message_id)
SELECT COUNT(*) as clients_without_imported_messages
FROM clients c
WHERE c.salebot_client_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM chat_messages m 
    WHERE m.client_id = c.id 
      AND m.salebot_message_id IS NOT NULL
  );
```

**2. Детализация по причинам:**
```sql
-- Клиенты с salebot_id, но невалидным ID (0 или пусто)
SELECT COUNT(*) as invalid_salebot_ids
FROM clients
WHERE salebot_client_id IS NOT NULL
  AND (salebot_client_id = '0' OR salebot_client_id = '' OR salebot_client_id ~ '^0+$');

-- Клиенты без salebot_client_type (не смогут импортироваться корректно)
SELECT COUNT(*) as clients_without_client_type
FROM clients
WHERE salebot_client_id IS NOT NULL
  AND salebot_client_type IS NULL;

-- Распределение по типам мессенджеров
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
GROUP BY salebot_client_type
ORDER BY count DESC;
```

**3. Топ-10 клиентов без сообщений (для проверки):**
```sql
SELECT 
  c.id, 
  c.name, 
  c.salebot_client_id,
  c.salebot_client_type,
  c.created_at
FROM clients c
WHERE c.salebot_client_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM chat_messages m 
    WHERE m.client_id = c.id 
      AND m.salebot_message_id IS NOT NULL
  )
ORDER BY c.created_at DESC
LIMIT 10;
```

---

### Возможные причины отсутствия диалогов

| Причина | Описание |
|---------|----------|
| **API лимит** | Достигнут дневной лимит 6000 запросов к Salebot API |
| **Невалидный salebot_client_id** | ID равен 0, пустой или содержит некорректные символы |
| **Нет истории в Salebot** | У клиента в Salebot нет сообщений (новый или удалённый диалог) |
| **Ошибка API** | Salebot API вернул ошибку для конкретного клиента |
| **Импорт не завершён** | Процесс импорта прерван до обработки всех клиентов |
| **salebot_client_type = NULL** | Тип мессенджера не определён, импорт может работать некорректно |

---

### Рекомендуемые действия

1. **Запустите SQL-запросы выше** на self-hosted сервере
2. **Проверьте прогресс импорта** в SyncDashboard - поле "Клиентов без импортированных сообщений"
3. **Используйте режим "Импорт только новых"** в SyncDashboard для импорта клиентов без сообщений
4. **Проверьте API лимит** - если достигнут 6000 запросов, ждите до следующего дня

