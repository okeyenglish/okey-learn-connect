

## Исправление: имя сотрудника не подхватывается при отправке сообщений

### Диагностика

Причина найдена: в self-hosted базе `profiles` у текущего пользователя (Даниил Пышнов, ID `0a5d61cf...`) поля `first_name` и `last_name` равны `null`. Поэтому код:

```typescript
const senderName = authProfile
  ? [authProfile.first_name, authProfile.last_name].filter(Boolean).join(' ') || 'Менеджер поддержки'
  : 'Менеджер поддержки';
```

...всегда возвращает "Менеджер поддержки".

Однако в JWT токене (в `user_metadata`) имя уже есть:
```
"first_name": "Даниил", "last_name": "Пышнов"
```

### Что будет сделано

**1. `src/hooks/useAuth.tsx`** -- при загрузке профиля, если `first_name`/`last_name` пустые, подставлять значения из `user_metadata` JWT токена:

В функции `fetchProfile`, после получения `profileData`, добавить fallback:

```typescript
if (profileData) {
  const userMeta = (await supabase.auth.getUser())?.data?.user?.user_metadata;
  const profileWithFallback = {
    ...profileData,
    first_name: profileData.first_name || userMeta?.first_name || null,
    last_name: profileData.last_name || userMeta?.last_name || null,
    avatar_url: null
  };
  setProfile(profileWithFallback);
}
```

Это решит проблему для всех мест где используется `authProfile` -- и для `managerName` prop, и для `senderName` при отправке сообщений, и для системных сообщений ("Даниил Пышнов отметил(а): ответ не требуется").

### Альтернативный подход (если профиль вообще не найден)

Также добавить обработку случая когда `profileData` = null (профиль не существует в таблице):

```typescript
if (!profileError) {
  const userMeta = (await supabase.auth.getUser())?.data?.user?.user_metadata;
  const profile = profileData || {};
  setProfile({
    id: userId,
    first_name: profile.first_name || userMeta?.first_name || null,
    last_name: profile.last_name || userMeta?.last_name || null,
    email: profile.email || userMeta?.email || null,
    // ... остальные поля
  });
}
```

### Затронутые файлы

- `src/hooks/useAuth.tsx` -- одно место в функции `fetchProfile` (строки 145-159)

### Почему это работает

JWT токен уже содержит корректные данные пользователя (`user_metadata`). Не нужно менять базу данных или edge functions -- достаточно использовать эти данные как fallback при загрузке профиля.
