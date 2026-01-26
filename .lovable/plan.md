

# План: Исправление оставшихся файлов с VITE_SUPABASE

## Найденные проблемы

| Файл | Строка | Текущий код |
|------|--------|-------------|
| `AssistantTab.tsx` | 112 | `import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY` с fallback на неправильный ключ |
| `HomeworkModal.tsx` | 81 | `import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY` с fallback на self-hosted ключ |

---

## Шаги реализации

### Шаг 1: Исправить `AssistantTab.tsx`

Добавить импорт и заменить использование ключа:

```typescript
// Добавить импорт
import { SELF_HOSTED_ANON_KEY } from '@/lib/selfHostedApi';

// Было (строка 112):
'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJ...старый ключ...'}`,

// Станет:
'Authorization': `Bearer ${SELF_HOSTED_ANON_KEY}`,
```

### Шаг 2: Исправить `HomeworkModal.tsx`

Аналогичная замена:

```typescript
// Добавить импорт
import { SELF_HOSTED_ANON_KEY } from '@/lib/selfHostedApi';

// Было (строка 81):
'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJ...'}`,

// Станет:
'Authorization': `Bearer ${SELF_HOSTED_ANON_KEY}`,
```

---

## Изменяемые файлы

| Файл | Изменения |
|------|-----------|
| `src/components/teacher/floating-chat/AssistantTab.tsx` | Импорт + замена ключа |
| `src/components/teacher/modals/HomeworkModal.tsx` | Импорт + замена ключа |

---

## Результат

После изменений:
- Все файлы будут использовать единый self-hosted ключ из `selfHostedApi.ts`
- Не будет зависимости от переменных окружения Lovable Cloud
- Исключён риск использования неправильного ключа

