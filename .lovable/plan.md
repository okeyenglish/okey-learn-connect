

## Исправление схемы БД для wpp-delete и wpp-edit

### Проблема

Текущий код использует колонки Lovable Cloud (`external_id`, `content`), но self-hosted база данных использует другие названия (`external_message_id`, `message_text`).

### Изменения

#### 1. Файл: `supabase/functions/wpp-delete/index.ts`

| Строка | Было | Станет |
|--------|------|--------|
| 35 | `external_id` | `external_message_id` |
| 44 | `messageData.external_id` | `messageData.external_message_id` |
| 98 | `content: '[Сообщение удалено]'` | `message_text: '[Сообщение удалено]'` |
| 99 | `external_id: null` | `external_message_id: null` |

#### 2. Файл: `supabase/functions/wpp-edit/index.ts`

| Строка | Было | Станет |
|--------|------|--------|
| 40 | `external_id` | `external_message_id` |
| 49 | `messageData.external_id` | `messageData.external_message_id` |
| 135 | `content: newMessage.trim()` | `message_text: newMessage.trim()` |
| 136 | `external_id: newTaskId` | `external_message_id: newTaskId` |

### После изменений

Нужно скопировать файлы на self-hosted сервер (`api.academyos.ru`):
```bash
# На сервере
docker compose restart functions
```

### Ожидаемый результат

- Удаление сообщений через WPP работает
- Редактирование сообщений через WPP работает
- Совместимость с self-hosted схемой БД

