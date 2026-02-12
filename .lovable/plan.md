
## Исправление: оплаченные чаты не закрепляются наверху с зеленым фоном

### Причина проблемы

При оптимизации загрузки чатов (переходе на RPC `get_chat_threads_paginated`) поле `has_pending_payment` было потеряно:

1. RPC-функция `get_chat_threads_paginated` **не возвращает** поле `has_pending_payment`
2. Функция `mapRpcToThreads` **не включает** это поле в результат
3. В итоге все чаты получают `has_pending_payment = undefined`, сортировка и зеленая подсветка не работают

Fallback-путь (`fetchThreadsDirectly`) корректно загружает `has_pending_payment` из таблицы `clients`, но при использовании RPC это поле теряется.

### Решение

Дополнить RPC-путь загрузкой `has_pending_payment` из таблицы `clients` для всех загруженных тредов.

### Технические детали

**Файл: `src/hooks/useChatThreadsInfinite.ts`**

1. После получения тредов из RPC (`mapRpcToThreads`), сделать легкий запрос к `clients` для получения `has_pending_payment`:

```text
// После mapRpcToThreads:
const clientIds = threads.map(t => t.client_id).filter(Boolean);
const { data: pendingData } = await supabase
  .from('clients')
  .select('id, has_pending_payment')
  .in('id', clientIds)
  .eq('has_pending_payment', true);

// Проставить флаг в тредах
const pendingSet = new Set((pendingData || []).map(c => c.id));
threads.forEach(t => { t.has_pending_payment = pendingSet.has(t.client_id); });
```

Этот запрос очень легкий: фильтрует по индексу `idx_clients_has_pending_payment` и возвращает обычно 0-3 строки (только клиенты с активной оплатой). Задержка ~5-10мс.

2. Аналогичную проверку добавить в `mapRpcToThreads` нельзя (она синхронная), поэтому обогащение происходит в `queryFn` после маппинга.

Результат: чаты с оплатой снова будут закрепляться наверху с изумрудным фоном и значком "₽".
