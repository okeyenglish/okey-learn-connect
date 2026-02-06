
## План: Исправление отображения медиафайлов WPP

### Статус: ✅ Исправлено (v2.8.0)

### Проблемы

1. **Медленная загрузка списка преподавателей** - `useTeacherConversations` загружал ВСЕ сообщения без лимита
2. **Медиафайлы не отображались** - `file_type` содержал 'image' вместо 'image/jpeg'

### Исправления

#### 1. `src/hooks/useTeacherConversations.ts`

- Добавлен лимит загрузки (~50 сообщений на преподавателя)
- Добавлена пакетная обработка для предотвращения таймаутов

#### 2. `src/components/crm/OptimizedAttachedFile.tsx`

- Улучшена функция `getEffectiveMimeType()` для обработки коротких типов ('image', 'video', 'audio', 'ptt')
- Автоматическое преобразование: 'image' → 'image/jpeg', 'video' → 'video/mp4', etc.

#### 3. `supabase/functions/wpp-webhook/index.ts` (v2.8.0)

- Добавлена обработка нового формата `delivery` статусов
- Исправлено сохранение полного MIME типа для входящих медиа

### Развёртывание

```bash
# Скопировать на self-hosted сервер
scp supabase/functions/wpp-webhook/index.ts server:/path/to/functions/wpp-webhook/

# Перезапустить
docker compose restart functions
```

---

## Предыдущее: Исправление реакций на сообщения

✅ Выполнено. Убрана колонка `user_type` из upsert операций в `useBatchMessageReactions.ts` и `useMessageReactions.ts`.
