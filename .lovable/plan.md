

## План: Исправление WPP Provision и деплой на self-hosted

### Диагностика проблемы

Логи показывают, что `wpp-qr` и `wpp-status` работают на self-hosted, но `wpp-provision` (которую вызывает UI) - **не оставляет логов**. Это означает:

1. **Функция `wpp-provision` не задеплоена** на self-hosted сервер (api.academyos.ru)
2. Edge Functions на self-hosted не синхронизируются автоматически с Lovable Cloud

### Архитектура проблемы

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                          Текущая ситуация                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  [Браузер]                                                              │
│      │                                                                  │
│      ├─→ POST /wpp-provision ─→ api.academyos.ru ─→ 404 или старый код │
│      │                                                                  │
│      ├─→ POST /wpp-qr ─────────→ api.academyos.ru ─→ Работает (логи +) │
│      │                                                                  │
│      └─→ POST /wpp-status ─────→ api.academyos.ru ─→ Работает (логи +) │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Необходимые действия

#### 1. Проверить наличие функции на сервере

```bash
docker exec supabase-edge-functions ls -la /home/deno/functions/ | grep wpp
```

Ожидаемый результат должен включать:
- wpp-create
- wpp-provision
- wpp-qr
- wpp-status
- и другие wpp-* функции

#### 2. Исправить баг в wpp-provision

В строке 155 используется `is_enabled: true`, но схема базы данных использует `is_active`. Нужно исправить:

```typescript
// БЫЛО:
is_enabled: true,

// СТАНЕТ:
is_active: true,
```

#### 3. Деплой функций на self-hosted

После исправления кода необходимо скопировать обновлённые edge functions на self-hosted сервер:

```bash
# На сервере - остановить функции
docker stop supabase-edge-functions

# Скопировать обновлённые функции
# (требуется scp или rsync с локальной машины)

# Запустить функции
docker start supabase-edge-functions
```

#### 4. Проверить логи после деплоя

```bash
docker logs supabase-edge-functions --tail 50 2>&1 | grep -i provision
```

### Изменения в файлах

#### `supabase/functions/wpp-provision/index.ts`

Строка 155: исправить имя колонки

```typescript
// Строка 154-156
is_primary: true,
is_active: true,  // было is_enabled
settings: {
```

### Порядок выполнения

1. Исправить `is_enabled` на `is_active` в `wpp-provision/index.ts`
2. Деплой на Lovable Cloud (автоматически)
3. **Вручную задеплоить** edge functions на self-hosted (api.academyos.ru)
4. Проверить логи `docker logs supabase-edge-functions --tail 50 | grep provision`
5. Протестировать подключение WhatsApp

### Критично

Изменения в Edge Functions на self-hosted сервере (api.academyos.ru) **требуют ручного деплоя**. Lovable Cloud и self-hosted не синхронизируются автоматически.

