
# План: Оптимизация начальной загрузки CRM

## Выявленные проблемы

### Проблема 1: Последовательная загрузка чанков в useChatStatesDB
В строках 61-84 файла `useChatStatesDB.ts` чанки обрабатываются последовательно:
```typescript
for (let i = 0; i < currentChatIds.length; i += CHUNK_SIZE) {
  const { data, error } = await supabase... // Последовательный await!
}
```
При 200 чатах = 2 последовательных запроса вместо параллельных.

### Проблема 2: Последовательная проверка permissions в useAuth
В строках 159-168 файла `useAuth.tsx`:
```typescript
for (const perm of commonPermissions) {
  const { data } = await supabase.rpc('user_has_permission', ...);
  // 7 последовательных RPC вызовов!
}
```

### Проблема 3: Каскадная зависимость загрузки
Цепочка ожиданий:
1. `useAuth` загружает user → 
2. `useChatThreadsInfinite` загружает threads →
3. `visibleChatIds` формируется →
4. `useChatStatesDB` начинает загрузку

## Решение

### Задача 1: Параллельная загрузка чанков в useChatStatesDB
Заменить последовательный `for` на `Promise.all`:

```typescript
// БЫЛО:
for (let i = 0; i < currentChatIds.length; i += CHUNK_SIZE) {
  const { data } = await supabase.from('chat_states')...
}

// СТАНЕТ:
const chunks = [];
for (let i = 0; i < currentChatIds.length; i += CHUNK_SIZE) {
  chunks.push(currentChatIds.slice(i, i + CHUNK_SIZE));
}

const results = await Promise.all(
  chunks.map(chunk => 
    supabase.from('chat_states')
      .select('chat_id, is_pinned, is_archived, is_unread')
      .eq('user_id', user.id)
      .in('chat_id', chunk)
  )
);
```

### Задача 2: Параллельная загрузка permissions в useAuth
Заменить последовательный `for` на `Promise.all`:

```typescript
// БЫЛО:
for (const perm of commonPermissions) {
  const { data } = await supabase.rpc('user_has_permission', ...);
}

// СТАНЕТ:
const permResults = await Promise.all(
  commonPermissions.map(perm =>
    supabase.rpc('user_has_permission', {
      _user_id: userId,
      _permission: perm.permission,
      _resource: perm.resource
    }).then(({ data }) => ({
      key: `${perm.permission}:${perm.resource}`,
      value: data || false
    }))
  )
);
```

## Файлы для изменения

| Файл | Изменение |
|------|-----------|
| `src/hooks/useChatStatesDB.ts` | Параллельная загрузка чанков через Promise.all |
| `src/hooks/useAuth.tsx` | Параллельная проверка permissions через Promise.all |

## Ожидаемый результат

| Метрика | До | После |
|---------|-----|-------|
| Загрузка chat_states (2 чанка) | ~400мс (200+200) | ~200мс (параллельно) |
| Загрузка permissions (7 RPC) | ~700мс | ~100мс |
| Общее время "Загрузка данных..." | 1-2 сек | < 500мс |
