

## План: Исправление системы групповых чатов сотрудников

### Корневая проблема
Таблицы `staff_group_chats`, `staff_group_chat_members`, `staff_group_messages` созданы **только на self-hosted сервере** (api.academyos.ru), но функция `complete-employee-onboarding` работает на **Lovable Cloud** и пытается записать в несуществующие таблицы.

Только 2 группы в базе - они были созданы либо вручную, либо в ходе тестирования.

### Решение

#### 1. Создать недостающие Edge Functions для self-hosted сервера

**Файлы для создания в `supabase/functions/`:**

| Функция | Назначение |
|---------|------------|
| `create-staff-group-chat` | Создание пользовательских групп (не филиальных) |
| `get-staff-group-members` | Получение списка участников группы |
| `add-staff-group-member` | Добавление участника в группу |
| `remove-staff-group-member` | Удаление участника из группы |

#### 2. Обновить complete-employee-onboarding

Функция `addEmployeeToBranchGroups` должна вызывать self-hosted API вместо прямого обращения к таблицам Lovable Cloud.

```text
Текущий код (не работает):
┌──────────────────────────────────────┐
│ complete-employee-onboarding         │
│ (Lovable Cloud)                      │
│                                      │
│   supabaseAdmin                      │
│     .from("staff_group_chats")  ────┐│
│                                      ││
└──────────────────────────────────────┘│
                                        │
                                        ▼
                            Таблица НЕ существует
                            на Lovable Cloud!

Правильный код:
┌──────────────────────────────────────┐
│ complete-employee-onboarding         │
│ (Lovable Cloud)                      │
│                                      │
│   fetch(SELF_HOSTED_URL +            │
│     "/functions/v1/                  │
│      add-employee-to-branch-groups") │────┐
│                                      │    │
└──────────────────────────────────────┘    │
                                            ▼
                               ┌──────────────────────────┐
                               │ Self-hosted server       │
                               │ (api.academyos.ru)       │
                               │                          │
                               │ staff_group_chats    ✓   │
                               │ staff_group_chat_members │
                               └──────────────────────────┘
```

#### 3. Создать функцию для инициализации групп филиалов

Новая функция `init-branch-groups` для создания групп по всем существующим филиалам и добавления сотрудников.

### Технические детали

**Файлы для создания:**

1. `supabase/functions/create-staff-group-chat/index.ts`
2. `supabase/functions/get-staff-group-members/index.ts`
3. `supabase/functions/add-staff-group-member/index.ts`
4. `supabase/functions/remove-staff-group-member/index.ts`
5. `supabase/functions/init-branch-groups/index.ts` (для первоначальной миграции)

**Файлы для изменения:**

1. `supabase/functions/complete-employee-onboarding/index.ts` - заменить прямые запросы на вызов self-hosted API

### Порядок действий

1. Создать все Edge Functions на Lovable Cloud
2. Скопировать функции на self-hosted сервер и задеплоить
3. Запустить `init-branch-groups` для создания групп по филиалам и добавления существующих сотрудников
4. Проверить отображение групп в AI Hub

### Ручной деплой (требуется)

После создания функций нужно:
1. Скопировать содержимое в `/home/automation/supabase-project/volumes/functions/`
2. Выполнить `docker compose restart functions`

