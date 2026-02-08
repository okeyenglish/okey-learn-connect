
## План исправления: Регистрация Edge Functions в config.toml

### Проблема

Edge Functions для групп сотрудников (`get-staff-group-chats`, `get-today-messages-count` и др.) **не зарегистрированы** в файле `supabase/config.toml`, хотя их папки и код существуют в репозитории.

Без регистрации в config.toml:
- Lovable Cloud не деплоит эти функции
- При вызове возвращается ошибка или HTML-страница вместо JSON
- Хук `useStaffGroupChats` получает пустой массив групп

### Решение

Добавить все недостающие Edge Functions в `supabase/config.toml`:

```toml
[functions.get-staff-group-chats]
verify_jwt = false

[functions.get-staff-group-members]
verify_jwt = false

[functions.add-staff-group-member]
verify_jwt = false

[functions.remove-staff-group-member]
verify_jwt = false

[functions.create-staff-group-chat]
verify_jwt = false

[functions.init-branch-groups]
verify_jwt = false

[functions.add-employee-to-branch-groups]
verify_jwt = false

[functions.get-today-messages-count]
verify_jwt = false

[functions.holihope-settings]
verify_jwt = true

[functions.wpp-qr]
verify_jwt = true

[functions.wpp-create]
verify_jwt = true
```

---

## Технические детали

### Почему `verify_jwt = false`?

Эти функции вызываются с self-hosted сервера (api.academyos.ru), где JWT токены от Lovable Cloud не валидны. Функции сами проверяют авторизацию через `user_id` в теле запроса и используют service role key для доступа к базе.

### Что изменится

| Функция | Назначение |
|---------|------------|
| `get-staff-group-chats` | Получить список групп сотрудников |
| `get-staff-group-members` | Получить участников группы |
| `add-staff-group-member` | Добавить участника |
| `remove-staff-group-member` | Удалить участника |
| `create-staff-group-chat` | Создать новую группу |
| `init-branch-groups` | Инициализировать группы филиалов |
| `add-employee-to-branch-groups` | Добавить сотрудника во все группы |
| `get-today-messages-count` | Счётчик отправленных сообщений за день |

### Порядок действий

1. Добавить записи в `supabase/config.toml`
2. После деплоя Lovable Cloud — функции станут доступны
3. После синхронизации на self-hosted (GitHub Actions) — функции станут доступны там тоже
4. UI начнёт показывать группы в ChatOS

---

## Дополнительно: Проверить другие функции

При просмотре папок обнаружены ещё незарегистрированные функции:
- `holihope-settings`
- `wpp-qr`
- `wpp-create`

Их тоже нужно добавить для полноты.
