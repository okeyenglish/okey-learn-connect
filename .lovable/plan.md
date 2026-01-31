
# План: Вернуть organization_id в teacher_client_links

## Проблема
После последнего изменения `organization_id` был удалён из `teacher_client_links`, что нарушает изоляцию данных между организациями.

## Анализ
- `organizationId` уже доступен в компоненте (строка 32: `const { organizationId } = useOrganization()`)
- Он получен из профиля текущего пользователя, который связан с организацией клиента
- Нужно просто вернуть это поле в два места `upsert`

## Решение

### Файл: `src/components/crm/ConvertToTeacherModal.tsx`

**Строка ~130-135 (привязка к существующему преподавателю):**
```typescript
const { error: linkError } = await supabase
  .from('teacher_client_links')
  .upsert({
    teacher_id: matchingTeacher.id,
    client_id: clientId,
    organization_id: organizationId,  // ВЕРНУТЬ
  }, {
    onConflict: 'teacher_id,client_id',
  });
```

**Строка ~185-190 (создание нового преподавателя):**
```typescript
const { error: linkError } = await supabase
  .from('teacher_client_links')
  .upsert({
    teacher_id: teacherData.id,
    client_id: clientId,
    organization_id: organizationId,  // ВЕРНУТЬ
  }, {
    onConflict: 'teacher_id,client_id',
  });
```

## Предварительное требование
Перед этим изменением на self-hosted БД (api.academyos.ru) должна быть выполнена миграция добавления колонки `organization_id` в таблицу `teacher_client_links` (см. план `docs/migrations/20250131_add_organization_id_to_teacher_client_links.sql`).

## Результат
- Связи преподаватель-клиент будут содержать `organization_id`
- RLS политики обеспечат изоляцию данных между организациями
- Конфиденциальная информация не утечёт в другие компании
