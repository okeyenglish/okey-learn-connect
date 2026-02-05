
## Исправление: колонка `status` не существует на self-hosted

### Проблема
Из логов консоли:
```
column clients.status does not exist
```

На self-hosted схеме (api.academyos.ru) используется поле `is_active` (boolean), а не `status` (string):
- `is_active = true` → активный клиент
- `is_active = false` → удалённый клиент

Код пытается обращаться к `status`, которой не существует.

---

### Технические изменения

#### `src/components/crm/NewChatModal.tsx`

**Строки 192-220** - заменить `status` на `is_active`:

```typescript
// БЫЛО:
const { data: existingClient, error: fetchError } = await supabase
  .from('clients')
  .select('id, name, status')
  .eq('id', existingId)
  .maybeSingle();

if (existingClient) {
  if (existingClient.status === 'deleted') {
    const { error: restoreError } = await supabase
      .from('clients')
      .update({ status: 'active', name: newContactData.name })
      .eq('id', existingId);
    ...
  }
}

// СТАНЕТ:
const { data: existingClient, error: fetchError } = await supabase
  .from('clients')
  .select('id, name, is_active')
  .eq('id', existingId)
  .maybeSingle();

if (existingClient) {
  // is_active = false means deleted
  if (existingClient.is_active === false) {
    const { error: restoreError } = await supabase
      .from('clients')
      .update({ is_active: true, name: newContactData.name })
      .eq('id', existingId);
    ...
  }
}
```

#### `src/components/crm/MobileNewChatModal.tsx`

Аналогичные изменения - заменить `status` на `is_active`.

---

### Схема полей

| Lovable Cloud | Self-hosted | Значение |
|--------------|-------------|----------|
| `status: 'active'` | `is_active: true` | Активный |
| `status: 'deleted'` | `is_active: false` | Удалён |

---

### Результат
После исправления при создании чата с удалённым телефоном:
1. Ловится ошибка 23505
2. Извлекается ID клиента из сообщения
3. Запрашивается клиент с полем `is_active` (не `status`)
4. Если `is_active = false` → восстанавливаем через `update({ is_active: true })`
5. Переходим к существующему чату
