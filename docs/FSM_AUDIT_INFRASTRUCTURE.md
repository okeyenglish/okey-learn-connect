# State Machine, Audit Log & Idempotency Infrastructure

## 📋 Обзор

В систему добавлена критическая инфраструктура для обеспечения целостности данных и безопасности:

1. **State Machines (FSM)** - валидация переходов статусов
2. **Audit Log** - логирование критических изменений
3. **Idempotency** - защита от дублирующих операций

---

## 🔄 State Machines (FSM)

### Lesson Sessions

**Допустимые переходы:**
```
scheduled → in_progress → completed
scheduled → cancelled
in_progress → cancelled
```

**Триггер:** `validate_lesson_status_transitions`

**Примеры:**
```sql
-- ✅ Допустимо
UPDATE lesson_sessions SET status = 'in_progress' WHERE status = 'scheduled';

-- ❌ Недопустимо (выбросит ошибку)
UPDATE lesson_sessions SET status = 'completed' WHERE status = 'scheduled';
```

---

### Payments

**Допустимые переходы:**
```
pending → confirmed
pending → failed
confirmed → refunded
confirmed → partially_refunded
```

**Триггер:** `validate_payment_status_transition`

**Особенности:**
- Автоматическое логирование в `audit_log`
- Нельзя изменить статус из терминальных состояний (`refunded`, `failed`)

---

### Enrollments (Group & Individual Students)

**Допустимые переходы:**
```
pending → active
pending → cancelled
active → on_hold
active → completed
active → cancelled
on_hold → active
on_hold → cancelled
```

**Триггеры:** 
- `validate_group_student_status_transition`
- `validate_individual_student_status_transition`

**Особенности:**
- Нельзя изменить из терминальных (`completed`, `cancelled`)

---

### Leads

**Допустимые переходы:**
```
new → in_process
new → lost
in_process → trial_scheduled
in_process → lost
trial_scheduled → trial_done
trial_scheduled → lost
trial_done → won
trial_done → lost
```

**Триггер:** `validate_lead_status_transition`

**Особенности:**
- При переходе в `lost` **обязательно** указать `lost_reason`
- Нельзя изменить из терминальных (`won`, `lost`)

**Пример использования:**
```typescript
// ❌ Вызовет ошибку
await updateLead({ 
  id: leadId, 
  status: 'lost' 
  // Отсутствует lost_reason!
});

// ✅ Корректно
await updateLead({ 
  id: leadId, 
  status: 'lost',
  lost_reason: 'Цена не подошла'
});
```

---

### Invoices

**Допустимые переходы:**
```
draft → issued
draft → cancelled
issued → partially_paid
issued → paid
issued → overdue
issued → cancelled
partially_paid → paid
partially_paid → overdue
partially_paid → cancelled
overdue → paid
overdue → partially_paid
overdue → cancelled
```

**Триггер:** `validate_invoice_status_transition`

**Особенности:**
- Нельзя изменить `amount` после перехода в `issued`
- Нельзя изменить из терминальных (`paid`, `cancelled`)

---

## 📝 Audit Log

### Структура таблицы

```sql
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY,
  entity_type TEXT NOT NULL,        -- 'payment', 'invoice', 'lead', etc.
  entity_id UUID NOT NULL,          -- ID измененной сущности
  event_type TEXT NOT NULL,         -- 'status_change', 'created', 'updated'
  old_value JSONB,                  -- Старое значение
  new_value JSONB,                  -- Новое значение
  user_id UUID,                     -- Кто изменил
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Индексы для производительности

```sql
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);
CREATE INDEX idx_audit_event ON audit_log(event_type);
```

### Использование в коде

```typescript
import { supabase } from '@/integrations/supabase/client';

// Логирование события
const { data: user } = await supabase.auth.getUser();

await supabase.rpc('log_audit_event', {
  p_entity_type: 'payment',
  p_entity_id: paymentId,
  p_event_type: 'status_change',
  p_old_value: { status: 'pending' },
  p_new_value: { status: 'confirmed' },
  p_user_id: user.data.user?.id
});
```

### Автоматическое логирование

FSM триггеры **автоматически** логируют изменения статусов:
- `lesson_sessions` → audit_log
- `payments` → audit_log
- `enrollments` → audit_log
- `leads` → audit_log
- `invoices` → audit_log

---

## 🔒 Idempotency для платежей

### Поля в таблице `payments`

```sql
ALTER TABLE payments ADD COLUMN idempotency_key TEXT UNIQUE;
ALTER TABLE payments ADD COLUMN provider_transaction_id TEXT UNIQUE;
```

### Использование hook'а

```typescript
import { useIdempotentPayment } from '@/hooks/useIdempotentPayment';

const { mutate: createPayment } = useIdempotentPayment();

// Создание платежа с idempotency
createPayment({
  student_id: '...',
  amount: 5000,
  method: 'card',
  payment_date: '2025-10-30',
  provider_transaction_id: 'stripe_ch_123456', // Уникальный ID от платежной системы
});
```

### Защита от дублей

1. **По provider_transaction_id**: Если платеж с таким ID уже существует, возвращается ошибка
2. **По idempotency_key**: Автоматически генерируется уникальный ключ
3. **Database constraint**: Уникальный индекс на уровне БД

---

## 🛡️ Обработка ошибок в UI

### Hooks обновлены для обработки FSM ошибок

#### useInvoices
```typescript
const { mutate } = useUpdateInvoice();

// При недопустимом переходе покажется toast:
// "Недопустимый переход статуса"
```

#### useLeads
```typescript
const { mutate } = useUpdateLead();

// При отсутствии lost_reason покажется:
// "Укажите причину отказа"
```

#### useIdempotentPayment
```typescript
const { mutate } = useIdempotentPayment();

// При дубликате покажется:
// "Дублирующий платеж: Этот платеж уже обрабатывается"
```

---

## 📊 Мониторинг и отладка

### Просмотр audit log

```sql
-- Последние 100 изменений
SELECT 
  entity_type,
  entity_id,
  event_type,
  old_value,
  new_value,
  created_at
FROM audit_log
ORDER BY created_at DESC
LIMIT 100;

-- Изменения конкретной сущности
SELECT * FROM audit_log
WHERE entity_type = 'payment' AND entity_id = '...';

-- Действия конкретного пользователя
SELECT * FROM audit_log
WHERE user_id = '...'
ORDER BY created_at DESC;
```

### Проверка FSM триггеров

```sql
-- Список всех триггеров FSM
SELECT 
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name LIKE '%validate%status%';
```

---

## 🧪 Тестирование

### Unit тесты для FSM

```typescript
describe('Payment FSM', () => {
  it('should allow pending -> confirmed', async () => {
    await expect(
      updatePayment({ id, status: 'confirmed' })
    ).resolves.toBeDefined();
  });

  it('should reject completed -> pending', async () => {
    await expect(
      updatePayment({ id, status: 'pending' })
    ).rejects.toThrow('Invalid status transition');
  });
});
```

### Интеграционные тесты

```typescript
describe('Lead FSM with lost_reason', () => {
  it('should require lost_reason when status=lost', async () => {
    await expect(
      updateLead({ id, status: 'lost' })
    ).rejects.toThrow('lost_reason is required');
  });

  it('should accept lost with reason', async () => {
    await expect(
      updateLead({ 
        id, 
        status: 'lost',
        lost_reason: 'Too expensive'
      })
    ).resolves.toBeDefined();
  });
});
```

---

## ⚡ Compensating Actions (SAGAS)

### Автоматические компенсации

Система автоматически выполняет компенсирующие действия при критических изменениях:

#### 1. При удалении/отмене платежа

**Триггер:** `compensate_payment_deletion`

**Действия:**
- Сбрасывает `paid_minutes = 0` для индивидуальных занятий
- Удаляет `payment_id` из связанных сессий
- Логирует в `audit_log`

```sql
-- Автоматически сработает при:
DELETE FROM payments WHERE id = '...';
-- или
UPDATE payments SET status = 'failed' WHERE id = '...';
UPDATE payments SET status = 'refunded' WHERE id = '...';
```

#### 2. При отмене счета

**Триггер:** `compensate_invoice_cancellation`

**Действия:**
- Отменяет все связанные платежи в статусе `pending`
- Устанавливает `status = 'failed'` для этих платежей
- Логирует в `audit_log`

```sql
-- Автоматически сработает при:
UPDATE invoices SET status = 'cancelled' WHERE id = '...';
```

#### 3. При исключении студента из группы

**Триггер:** `compensate_student_expulsion`

**Действия:**
- Отменяет все будущие занятия студента в группе
- Устанавливает `status = 'cancelled'` для будущих сессий
- Логирует в `audit_log`

```sql
-- Автоматически сработает при:
UPDATE group_students SET status = 'expelled' WHERE id = '...';
```

#### 4. При отмене индивидуального занятия

**Триггер:** `compensate_individual_lesson_cancellation`

**Действия:**
- Отменяет все будущие сессии занятия
- Освобождает преподавателя и кабинет
- Логирует в `audit_log`

```sql
-- Автоматически сработает при:
UPDATE individual_lessons SET status = 'cancelled' WHERE id = '...';
```

#### 5. При удалении лида

**Триггер:** `compensate_lead_deletion`

**Действия:**
- Удаляет всю историю статусов лида
- Логирует в `audit_log`

```sql
-- Автоматически сработает при:
DELETE FROM leads WHERE id = '...';
```

---

### Ручная компенсация

Для критических ситуаций доступна ручная компенсация:

#### SQL

```sql
-- Откатить платеж и вернуть связанные занятия
SELECT manual_compensate_payment(
  p_payment_id := '550e8400-e29b-41d4-a716-446655440000',
  p_reason := 'Payment was fraudulent'
);

-- Результат:
-- {
--   "success": true,
--   "sessions_reverted": 5,
--   "payment_id": "550e8400-e29b-41d4-a716-446655440000"
-- }
```

#### TypeScript Hook

```typescript
import { useCompensatePayment } from '@/hooks/useCompensation';

const PaymentActions = ({ paymentId }: { paymentId: string }) => {
  const { mutate: compensate, isPending } = useCompensatePayment();

  const handleRollback = () => {
    compensate({
      paymentId,
      reason: 'Customer requested refund'
    });
  };

  return (
    <button onClick={handleRollback} disabled={isPending}>
      Откатить платеж
    </button>
  );
};
```

---

### Просмотр истории компенсаций

```typescript
import { useQuery } from '@tanstack/react-query';
import { useCompensationHistory } from '@/hooks/useCompensation';

const CompensationLog = ({ paymentId }: { paymentId: string }) => {
  const { data: history } = useQuery(useCompensationHistory(paymentId));

  return (
    <div>
      {history?.map(entry => (
        <div key={entry.id}>
          <span>{entry.event_type}</span>
          <span>{new Date(entry.created_at).toLocaleString()}</span>
          <pre>{JSON.stringify(entry.new_value, null, 2)}</pre>
        </div>
      ))}
    </div>
  );
};
```

---

## 🚀 Следующие шаги

### Дополнительные компенсации (TODO)

- Balance transactions rollback при отмене платежа
- Bonus account adjustments при компенсации
- Teacher payment recalculation при отмене занятий

### Дополнительные FSM (TODO)

- `student_operation_logs` status transitions
- `teacher_substitutions` status validation
- `bonus_transactions` state machine

---

## 📚 Ссылки

- [Supabase Functions](https://supabase.com/docs/guides/database/functions)
- [PostgreSQL Triggers](https://www.postgresql.org/docs/current/trigger-definition.html)
- [Idempotency Best Practices](https://stripe.com/docs/api/idempotent_requests)
