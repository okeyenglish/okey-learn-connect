

## Проблема

Таблица `students` на self-hosted **не имеет колонки `client_id`**. Связь клиент-ученик идёт исключительно через цепочку:

```text
clients -> family_members (по client_id) -> family_group_id -> students (по family_group_id)
```

Текущий `fetchClientDirectFallback` загружает данные клиента, но всегда возвращает `students: []`, потому что не запрашивает таблицу `students`.

## Решение

Добавить поиск студентов в `fetchClientDirectFallback` через путь `family_members -> students.family_group_id`.

## Изменения в `src/components/crm/FamilyCardWrapper.tsx`

### 1. Добавить поиск студентов в `fetchClientDirectFallback` (после строки 195, где получены clientData)

Логика:

```text
1. Запросить family_members WHERE client_id = clientId -> получить family_group_id
2. Если найден family_group_id -> запросить students WHERE family_group_id = найденный ID
3. Маппинг полей студентов: id, first_name (= name в таблице), last_name, middle_name, date_of_birth, avatar_url, status -> is_active
4. Обернуть в try/catch — если таблицы нет, students останется пустым массивом
```

### 2. Конкретный код

В функции `fetchClientDirectFallback`, между получением `clientData` (строка 195) и формированием `result` (строка 197):

```typescript
// Try to find students via family_members -> family_group_id -> students
let students: FamilyGroup['students'] = [];
try {
  const { data: memberData } = await supabase
    .from('family_members')
    .select('family_group_id')
    .eq('client_id', clientId)
    .limit(1)
    .maybeSingle();

  if (memberData?.family_group_id) {
    const { data: studentsData } = await supabase
      .from('students')
      .select('id, name, first_name, last_name, middle_name, date_of_birth, avatar_url, status')
      .eq('family_group_id', memberData.family_group_id);

    if (studentsData?.length) {
      students = studentsData.map((s: any) => ({
        id: s.id,
        name: s.name || [s.first_name, s.last_name].filter(Boolean).join(' '),
        firstName: s.first_name || s.name || '',
        lastName: s.last_name || '',
        middleName: s.middle_name || '',
        age: calculateAge(s.date_of_birth),
        dateOfBirth: s.date_of_birth || undefined,
        status: s.status === 'active' || s.is_active ? 'active' : 'inactive',
        courses: [],
      }));
      console.log(`[FamilyCardWrapper] Found ${students.length} students via family_group_id`);
    }

    // Also update the family group id in the result
    // so it uses the real family_group_id instead of clientId
  }
} catch (err) {
  console.warn('[FamilyCardWrapper] Could not fetch students:', err);
}
```

Затем в объекте `result` на строке 213 заменить `students: []` на `students`.

### 3. Импорт `calculateAge`

Функция `calculateAge` уже определена в `useFamilyData.ts`, но не экспортируется. Нужно либо:
- Продублировать простую функцию расчёта возраста в `FamilyCardWrapper.tsx`
- Либо инлайнить расчёт

Проще продублировать (3 строки кода).

## Техническая секция

- Колонка `client_id` в таблице `students` **не существует** на self-hosted — это подтверждено ошибкой `42703`
- Связь всегда через `family_members.client_id` + `family_members.family_group_id` = `students.family_group_id`
- Таблица `students` имеет колонку `name` (полное имя) и возможно `first_name`/`last_name`
- Все запросы обёрнуты в try/catch для устойчивости к отсутствию таблиц
