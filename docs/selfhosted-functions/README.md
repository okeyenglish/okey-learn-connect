# Self-Hosted Edge Functions для Staff Group Chats

Эти функции нужно задеплоить на self-hosted сервер `api.academyos.ru`.

## Список функций

| Функция | Назначение |
|---------|------------|
| `get-staff-group-chats` | Получить все группы организации |
| `get-staff-group-members` | Получить участников группы |
| `create-staff-group-chat` | Создать пользовательскую группу |
| `add-staff-group-member` | Добавить участника в группу |
| `remove-staff-group-member` | Удалить участника из группы |
| `update-staff-group-chat` | Переименовать группу |
| `delete-staff-group-chat` | Удалить группу и все данные |
| `add-employee-to-branch-groups` | Добавить сотрудника в группы филиала (вызывается из Lovable Cloud) |
| `init-branch-groups` | Миграция: создать группы для всех филиалов |

## Деплой на self-hosted сервер

```bash
# 1. Подключиться к серверу
ssh user@api.academyos.ru

# 2. Перейти в директорию функций
cd /home/automation/supabase-project/volumes/functions/

# 3. Создать папки для функций (если нет)
mkdir -p get-staff-group-chats
mkdir -p get-staff-group-members
mkdir -p create-staff-group-chat
mkdir -p add-staff-group-member
mkdir -p remove-staff-group-member
mkdir -p add-employee-to-branch-groups
mkdir -p init-branch-groups

# 4. Скопировать файлы из этой папки в соответствующие директории
# Пример:
cp get-staff-group-chats.ts get-staff-group-chats/index.ts
cp get-staff-group-members.ts get-staff-group-members/index.ts
cp create-staff-group-chat.ts create-staff-group-chat/index.ts
cp add-staff-group-member.ts add-staff-group-member/index.ts
cp remove-staff-group-member.ts remove-staff-group-member/index.ts
cp add-employee-to-branch-groups.ts add-employee-to-branch-groups/index.ts
cp init-branch-groups.ts init-branch-groups/index.ts

# 5. Перезапустить контейнер функций
cd /home/automation/supabase-project
docker compose restart functions

# 6. Проверить логи
docker compose logs -f functions
```

## Инициализация групп (первый запуск)

После деплоя функций выполнить миграцию для создания групп филиалов:

```bash
# 1. Сначала dry-run для проверки
curl -X POST https://api.academyos.ru/functions/v1/init-branch-groups \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"organization_id": "YOUR_ORG_ID", "dry_run": true}'

# 2. Если всё ок, выполнить реальную миграцию
curl -X POST https://api.academyos.ru/functions/v1/init-branch-groups \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"organization_id": "YOUR_ORG_ID", "dry_run": false}'
```

## Проверка работы

```bash
# Получить все группы
curl -X POST https://api.academyos.ru/functions/v1/get-staff-group-chats \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"organization_id": "YOUR_ORG_ID", "user_id": "YOUR_USER_ID"}'
```
