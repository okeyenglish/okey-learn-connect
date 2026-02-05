
## Исправление восстановления удалённых клиентов

### Проблема
При создании нового чата с телефоном удалённого клиента:
1. `checkExistingPhone` не находит клиента (из-за формата телефона)
2. `createClient` выбрасывает ошибку 23505 (unique constraint)
3. Логика восстановления в catch-блоке не срабатывает корректно

### Причина
Код проверяет `error?.code === '23505'`, но после этого при fetch клиента или его восстановлении что-то идёт не так, и показывается fallback toast "Ошибка при создании клиента".

### Решение

#### `src/components/crm/NewChatModal.tsx`

Улучшить обработку ошибки 23505:

```typescript
// Строки 178-226: улучшить catch-блок

} catch (error: any) {
  console.error('Error creating client:', error);
  
  // Handle unique constraint violation (23505)
  if (error?.code === '23505' || error?.message?.includes('23505')) {
    // Extract client ID from error message
    const idMatch = error?.message?.match(/ID:\s*([a-f0-9-]{36})/i);
    
    if (idMatch) {
      const existingId = idMatch[1];
      console.log('[NewChatModal] Found existing client ID:', existingId);
      
      try {
        // Fetch existing client
        const { data: existingClient, error: fetchError } = await supabase
          .from('clients')
          .select('id, name, status')
          .eq('id', existingId)
          .maybeSingle();  // Использовать maybeSingle вместо single
        
        console.log('[NewChatModal] Fetched client:', existingClient, 'error:', fetchError);
        
        if (existingClient) {
          // Restore if deleted, or just navigate
          if (existingClient.status === 'deleted') {
            const { error: restoreError } = await supabase
              .from('clients')
              .update({ status: 'active', name: newContactData.name })
              .eq('id', existingId);
            
            if (restoreError) {
              console.error('[NewChatModal] Restore error:', restoreError);
            } else {
              invalidateAfterRestore();
              toast.success(`Чат восстановлен: ${newContactData.name}`);
            }
          } else {
            toast.info(`Клиент найден: ${existingClient.name}`);
          }
          
          onExistingClientFound?.(existingId);
          setNewContactData({ name: "", phone: "" });
          setOpen(false);
          return;  // Важно: return здесь чтобы не показывать ошибку
        }
      } catch (restoreError) {
        console.error('[NewChatModal] Error in restore flow:', restoreError);
      }
    }
  }
  
  toast.error("Ошибка при создании клиента");
}
```

### Ключевые изменения:
1. Добавить проверку `error?.message?.includes('23505')` как fallback
2. Использовать `.maybeSingle()` вместо `.single()` чтобы избежать ошибки если клиент не найден
3. Добавить console.log для отладки
4. Убедиться что return вызывается после успешного восстановления

### Также исправить в MobileNewChatModal.tsx
Аналогичные изменения нужно внести в мобильную версию модального окна.
