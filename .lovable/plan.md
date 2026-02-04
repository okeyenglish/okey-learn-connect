

# План: Упрощённый флоу подключения WPP WhatsApp

## ✅ РЕАЛИЗОВАНО

## Текущий флоу (сложный) → ЗАМЕНЁН
```text
Пользователь → Вводит API Key → Вводит номер телефона → Сохраняет → Нажимает "Подключить" → QR → Сканирует
```

## Новый флоу (упрощённый) → РАБОТАЕТ
```text
Пользователь → Нажимает "Подключить WhatsApp" → QR появляется сразу → Сканирует → Готово!
```

---

## Созданные файлы

| Файл | Описание |
|------|----------|
| `supabase/functions/wpp-provision/index.ts` | Edge Function для auto-provisioning |
| `src/components/admin/integrations/WppQuickConnect.tsx` | UI компонент с QR модалкой |

## Изменённые файлы

| Файл | Изменения |
|------|-----------|
| `src/lib/wppApi.ts` | Добавлена функция `wppProvision()` |
| `src/components/admin/integrations/WhatsAppIntegrations.tsx` | Добавлен WppQuickConnect, убраны поля для WPP |
| `supabase/config.toml` | Добавлена конфигурация wpp-provision |

---

## Архитектура решения

### Ключевые изменения:
1. **Глобальный API Key** — один ключ `WPP_API_KEY` для всех организаций (уже в секретах)
2. **Автоматический account number** — генерируется как `org_${orgId.substring(0,8)}`
3. **Edge Function `wpp-provision`** — создаёт интеграцию + запускает аккаунт + возвращает QR

---

## Деплой на Self-Hosted

Для применения на `api.academyos.ru`:

```bash
# Скопировать файлы:
supabase/functions/wpp-provision/index.ts

# Деплой:
supabase functions deploy wpp-provision
```

---

## Результат

После реализации:
- Пользователь видит одну кнопку "Подключить WhatsApp"
- Нажимает → видит QR
- Сканирует телефоном → подключено
- Никаких API ключей, никаких номеров вводить не нужно!

