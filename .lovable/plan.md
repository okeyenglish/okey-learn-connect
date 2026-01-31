
# План: Исправление схемы teacher_client_links

## Проблема
Ошибка при переводе клиента в преподаватели:
```
Could not find the 'organization_id' column of 'teacher_client_links' in the schema cache
```

## Анализ
На self-hosted Supabase таблица `teacher_client_links` имеет упрощённую схему:
- `teacher_id` - UUID преподавателя
- `client_id` - UUID клиента
- Возможно `created_at`

**Отсутствуют колонки** (в отличие от типов Lovable Cloud):
- `organization_id` 
- `link_type`
- `is_primary`

## Решение

### Файл: `src/components/crm/ConvertToTeacherModal.tsx`

Удалить `organization_id` из двух мест upsert:

**Строка ~130 (привязка к существующему преподавателю):**
```typescript
// БЫЛО:
.upsert({
  teacher_id: matchingTeacher.id,
  client_id: clientId,
  organization_id: organizationId,  // УДАЛИТЬ
}, ...)

// СТАНЕТ:
.upsert({
  teacher_id: matchingTeacher.id,
  client_id: clientId,
}, ...)
```

**Строка ~186 (создание нового преподавателя):**
```typescript
// БЫЛО:
.upsert({
  teacher_id: teacherData.id,
  client_id: clientId,
  organization_id: organizationId,  // УДАЛИТЬ
}, ...)

// СТАНЕТ:
.upsert({
  teacher_id: teacherData.id,
  client_id: clientId,
}, ...)
```

## Результат
После изменений кнопка "Сделать преподавателем" будет:
1. Создавать запись в `teachers`
2. Успешно создавать связь в `teacher_client_links`
3. Чат переместится в папку "Преподаватели"
