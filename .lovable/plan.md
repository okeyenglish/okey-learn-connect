
## План исправления ошибок приложения

### Проблема 1: useTodayMessagesCount использует несуществующие колонки

**Файл:** `src/hooks/useTodayMessagesCount.ts`

**Текущий код (строки 23-29):**
```typescript
const { count, error } = await supabase
  .from('chat_messages')
  .select('*', { count: 'exact', head: true })
  .eq('direction', 'outgoing')     // НЕТ в self-hosted
  .eq('sender_id', user.id)         // НЕТ в self-hosted
```

**Решение:**
Использовать колонки self-hosted схемы: `is_outgoing = true` и `user_id`

```typescript
const { count, error } = await supabase
  .from('chat_messages')
  .select('*', { count: 'exact', head: true })
  .eq('is_outgoing', true)
  .eq('user_id', user.id)
  .gte('created_at', startOfDay)
  .lte('created_at', endOfDay);
```

---

### Проблема 2: UnreadByMessenger включает "calls" как messenger_type

**Файлы:**
- `src/hooks/usePinnedChatThreads.ts`
- `src/hooks/useChatThreadsOptimized.ts`
- `src/hooks/useChatThreadsInfinite.ts`
- `src/hooks/usePhoneSearchThreads.ts`

**Проблема:** `messenger_type` enum в базе не содержит значение `calls`, но код пытается использовать его

**Решение:**
1. Не добавлять `calls` как `messenger_type` при подсчёте
2. Хранить счётчик звонков отдельно (через `missed_calls_count`)
3. Убрать попытки записывать `calls` в `messenger_type`

Изменения в файлах:
- В `usePinnedChatThreads.ts` строка 149: проверять что `type` не равен 'calls' перед инкрементом
- В остальных файлах аналогично

---

### Проблема 3: Button внутри button (NewChatModal в TabsTrigger)

**Файл:** `src/pages/CRM.tsx` (строки 2216-2228)

**Текущий код:**
```tsx
<TabsTrigger value="chats" className="...">
  <span>Чаты</span>
  <div className="absolute right-3">
    <NewChatModal>
      <Button size="sm">  {/* КНОПКА внутри TabsTrigger (тоже button) */}
        <Plus />
      </Button>
    </NewChatModal>
  </div>
</TabsTrigger>
```

**Решение:**
Вынести NewChatModal за пределы TabsTrigger и позиционировать абсолютно:

```tsx
<TabsList className="...">
  <TabsTrigger value="menu">Меню</TabsTrigger>
  <TabsTrigger value="chats">
    <span>Чаты</span>
  </TabsTrigger>
</TabsList>
{/* Кнопка вне TabsTrigger */}
<div className="absolute right-5 top-3 z-10">
  <NewChatModal>
    <Button size="sm" variant="ghost">
      <Plus className="h-3 w-3" />
    </Button>
  </NewChatModal>
</div>
```

---

### Проблема 4: JSON.parse ошибки (Uncaught in promise)

**Причина:** API возвращает не-JSON (HTML страницу ошибки или пустой ответ)

**Решение:**
Добавить проверку Content-Type перед JSON.parse в API хелперах

**Файл:** `src/lib/selfHostedApi.ts` - добавить try/catch вокруг response.json() с информативным сообщением об ошибке

---

## Файлы для изменения

| Файл | Изменение |
|------|-----------|
| `src/hooks/useTodayMessagesCount.ts` | Использовать `is_outgoing` и `user_id` вместо `direction` и `sender_id` |
| `src/hooks/usePinnedChatThreads.ts` | Исключить 'calls' из messenger_type инкремента |
| `src/hooks/useChatThreadsInfinite.ts` | Исключить 'calls' из messenger_type инкремента |
| `src/hooks/usePhoneSearchThreads.ts` | Исключить 'calls' из messenger_type инкремента |
| `src/pages/CRM.tsx` | Вынести NewChatModal из TabsTrigger |

---

## Порядок выполнения

1. Исправить `useTodayMessagesCount.ts` (критично - ломает функционал)
2. Исправить проблему с `calls` в messenger_type (критично - вызывает ошибки БД)
3. Исправить вложенность кнопок в CRM.tsx (accessibility + React warning)
4. Проверить что ошибки исчезли в консоли
