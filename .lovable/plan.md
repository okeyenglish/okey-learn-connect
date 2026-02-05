
## Исправление отображения сообщений преподавателей

### Проблема

На скриншоте видно, что все преподаватели показывают "Нет сообщений" и в чате справа крутится "Проверка наличия WhatsApp...". Причина — fallback логика в `useTeacherChats.ts` использует неправильные имена колонок для self-hosted схемы:

| Что используется | Правильно для self-hosted |
|-----------------|---------------------------|
| `direction = 'incoming'` | `is_outgoing = false` |
| `content` | `message_text` |
| `messenger` | `messenger_type` |

### План исправления

#### Изменения в файле `src/hooks/useTeacherChats.ts`

**1. Строки 303-310** — Исправить SELECT запрос для получения последнего сообщения:

```typescript
// Было:
const { data: lastMsg } = await supabase
  .from('chat_messages')
  .select('content, created_at, messenger, is_read, direction')

// Станет:
const { data: lastMsg } = await supabase
  .from('chat_messages')
  .select('message_text, content, created_at, messenger_type, messenger, is_read, is_outgoing')
```

**2. Строки 312-317** — Исправить запрос подсчёта непрочитанных:

```typescript
// Было:
const { count: unreadCount } = await supabase
  .from('chat_messages')
  .select('id', { count: 'exact', head: true })
  .eq('client_id', matchedClient.id)
  .eq('direction', 'incoming')
  .eq('is_read', false);

// Станет:
const { count: unreadCount } = await supabase
  .from('chat_messages')
  .select('id', { count: 'exact', head: true })
  .eq('client_id', matchedClient.id)
  .eq('is_outgoing', false)  // ← КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ
  .eq('is_read', false);
```

**3. Строки 319-326** — Исправить формирование результата:

```typescript
// Было:
results.push({
  teacher_id: teacher.id,
  client_id: matchedClient.id,
  unread_count: unreadCount || 0,
  last_message_time: lastMsg?.created_at || null,
  last_message_text: lastMsg?.content || null,
  last_messenger_type: lastMsg?.messenger || null,
});

// Станет:
results.push({
  teacher_id: teacher.id,
  client_id: matchedClient.id,
  unread_count: unreadCount || 0,
  last_message_time: lastMsg?.created_at || null,
  last_message_text: lastMsg?.message_text || lastMsg?.content || null,  // ← Поддержка обоих
  last_messenger_type: lastMsg?.messenger_type || lastMsg?.messenger || null,  // ← Поддержка обоих
});
```

**4. Строки 348-372** — Аналогичные исправления во втором блоке fallback (поиск по имени):

- Изменить `.select()` на `message_text, content, created_at, messenger_type, messenger, is_read, is_outgoing`
- Изменить `.eq('direction', 'incoming')` на `.eq('is_outgoing', false)`
- Изменить маппинг `lastMsg?.content` на `lastMsg?.message_text || lastMsg?.content`
- Изменить маппинг `lastMsg?.messenger` на `lastMsg?.messenger_type || lastMsg?.messenger`

### Ожидаемый результат

После исправления:
1. Сообщения преподавателей будут корректно подгружаться из self-hosted базы
2. Превью последнего сообщения отобразится в списке
3. Счётчик непрочитанных будет работать
4. При клике на преподавателя откроется история чата

### Дополнительно: WPP интеграция

Сообщение "Проверка наличия WhatsApp..." указывает на проблему с WPP статусом. Это отдельная задача — нужно проверить:
- Статус WPP сессии в `messenger_integrations`
- Логи Edge Function `wpp-status`
