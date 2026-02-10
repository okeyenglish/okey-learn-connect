

# Исправление SQL: отсутствующие колонки на self-hosted

## Проблема

Колонка `whatsapp_id` не существует в таблице `clients` на self-hosted сервере (api.academyos.ru). Из предыдущего опыта известно, что на self-hosted также отсутствует `avatar_url` в `clients`.

## Исправление

В файле `docs/sql-optimizations/optimize_rpc_functions.sql` заменить строку 128:

```
-- Было:
c.whatsapp_id as whatsapp_chat_id,

-- Стало:
NULL::text as whatsapp_chat_id,
```

Также на строке 126 заменить `c.avatar_url` на `NULL::text` если колонка отсутствует:

```
-- Было:
c.avatar_url,

-- Стало:
NULL::text as avatar_url,
```

## Рекомендация

Перед выполнением SQL проверьте какие колонки есть в таблице `clients`:

```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'clients' AND table_schema = 'public' 
ORDER BY ordinal_position;
```

Это позволит точно убедиться какие колонки доступны и избежать повторных ошибок.

## Файлы для изменения

| Файл | Изменение |
|------|-----------|
| `docs/sql-optimizations/optimize_rpc_functions.sql` | Заменить `c.whatsapp_id` и `c.avatar_url` на `NULL::text` |

