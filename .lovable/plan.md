
## План: ✅ DONE - Исправление обработки медиа в wpp-webhook

### Проблема (решена)

WPP платформа отправляла медиа с плейсхолдерами `[Image]`, `[Video]` в поле text.

### Что сделано (v2.7.0)

1. ✅ Добавлена функция `stripMediaPlaceholder()` для очистки плейсхолдеров
2. ✅ Изменено построение текста - теперь показывается только реальный caption
3. ✅ Улучшено логирование ошибок загрузки в storage с подсказкой о бакете

### Результат

| До | После |
|----|-------|
| `[Image]` в тексте | Пустой текст, медиа отображается UI |
| `[Image] фото с отпуска` | `фото с отпуска` + медиа |

### Self-hosted deployment

```bash
# На api.academyos.ru:
# 1. Скопировать supabase/functions/wpp-webhook/index.ts
# 2. Перезапустить
docker compose restart functions
```

### Проверка бакета

```sql
-- Если медиа не загружается:
SELECT * FROM storage.buckets WHERE id = 'chat-media';

-- Создать если нет:
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-media', 'chat-media', true);
```
