

# План: Исправление отправки системных сообщений на self-hosted

## Проблема
Системные сообщения о задачах не появляются в чате на self-hosted Supabase. Причина - RLS политика требует `organization_id = get_user_organization_id()`, а default может не срабатывать через PostgREST при INSERT.

## Решение

### Шаг 1: Добавить organization_id в useSendMessage

**Файл:** `src/hooks/useChatMessages.ts`

При вставке сообщения нужно явно получить и передать `organization_id` текущего пользователя:

```typescript
mutationFn: async ({ clientId, messageText, messageType = 'manager', phoneNumberId, metadata }) => {
  // Получаем organization_id текущего пользователя
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', (await supabase.auth.getUser()).data.user?.id)
    .single();
  
  const payload = {
    client_id: clientId,
    message_text: messageText,
    message_type: messageType,
    is_read: messageType === 'manager',
    organization_id: profile?.organization_id, // Явно передаем organization_id
  };
  // ...
}
```

### Шаг 2: Кэширование organization_id

Чтобы не делать дополнительный запрос при каждой отправке, можно использовать React Query для кэширования profile с organization_id (уже есть в useAuth).

**Оптимизированное решение:**

```typescript
export const useSendMessage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ clientId, messageText, messageType, phoneNumberId, metadata }) => {
      // Получаем organization_id из кэша профиля или запрашиваем
      let organizationId: string | null = null;
      
      const cachedProfile = queryClient.getQueryData<{ organization_id: string }>(['profile']);
      if (cachedProfile?.organization_id) {
        organizationId = cachedProfile.organization_id;
      } else {
        // Fallback: запрос organization_id через RPC или profiles
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('organization_id')
            .eq('id', userData.user.id)
            .single();
          organizationId = profile?.organization_id || null;
        }
      }

      const payload = {
        client_id: clientId,
        message_text: messageText,
        message_type: messageType,
        is_read: messageType === 'manager',
        ...(organizationId && { organization_id: organizationId }),
        ...(phoneNumberId && { phone_number_id: phoneNumberId }),
        ...(metadata && { metadata }),
      };
      
      // ... insert logic
    }
  });
};
```

## Технические детали

### Почему default не работает
- PostgREST передает `DEFAULT` только если поле отсутствует в payload
- Если поле передается как `undefined` или не включено явно, оно может интерпретироваться как `null`
- RLS политика `organization_id = get_user_organization_id()` проверяет значение, не default

### Изменяемые файлы

| Файл | Изменение |
|------|-----------|
| `src/hooks/useChatMessages.ts` | Добавить явную передачу organization_id в useSendMessage |

### Альтернативный подход

Если не хочется модифицировать mutation, можно изменить RLS политику на self-hosted:

```sql
-- Разрешить INSERT если organization_id NULL (сработает default) 
-- или если он совпадает с организацией пользователя
CREATE POLICY "Users can create messages in their organization" 
ON chat_messages FOR INSERT 
WITH CHECK (
  organization_id IS NULL 
  OR organization_id = get_user_organization_id()
);
```

Но это менее безопасно. Рекомендуется первый подход с явной передачей organization_id.

