# 🧪 Testing Checklist для CRM системы

## 📋 Оглавление

1. [FSM Validation](#fsm-validation)
2. [Audit Log](#audit-log)
3. [Idempotency](#idempotency)
4. [Compensating Actions](#compensating-actions)
5. [Security (RLS)](#security-rls)
6. [Performance](#performance)

---

## 🔄 FSM Validation

### Lesson Sessions

- [ ] **Scheduled → In Progress**
  ```sql
  UPDATE lesson_sessions SET status = 'in_progress' WHERE status = 'scheduled';
  -- ✅ Должно пройти
  ```

- [ ] **Scheduled → Completed** (недопустимо)
  ```sql
  UPDATE lesson_sessions SET status = 'completed' WHERE status = 'scheduled';
  -- ❌ Должно выбросить ошибку: "Invalid lesson status transition"
  ```

- [ ] **In Progress → Completed**
  ```sql
  UPDATE lesson_sessions SET status = 'in_progress' WHERE status = 'scheduled';
  UPDATE lesson_sessions SET status = 'completed' WHERE status = 'in_progress';
  -- ✅ Должно пройти
  ```

- [ ] **Scheduled → Cancelled**
  ```sql
  UPDATE lesson_sessions SET status = 'cancelled' WHERE status = 'scheduled';
  -- ✅ Должно пройти
  ```

- [ ] **Completed → Scheduled** (недопустимо)
  ```sql
  UPDATE lesson_sessions SET status = 'scheduled' WHERE status = 'completed';
  -- ❌ Должно выбросить ошибку
  ```

---

### Payments

- [ ] **Pending → Confirmed**
  ```typescript
  const { mutate } = useConfirmPayment();
  mutate(paymentId);
  // ✅ Должно пройти
  ```

- [ ] **Confirmed → Refunded**
  ```sql
  UPDATE payments SET status = 'refunded' WHERE status = 'completed';
  -- ✅ Должно пройти
  ```

- [ ] **Refunded → Confirmed** (недопустимо)
  ```sql
  UPDATE payments SET status = 'confirmed' WHERE status = 'refunded';
  -- ❌ Должно выбросить ошибку: терминальное состояние
  ```

- [ ] **Pending → Failed**
  ```sql
  UPDATE payments SET status = 'failed' WHERE status = 'pending';
  -- ✅ Должно пройти
  ```

---

### Enrollments

- [ ] **Pending → Active**
  ```sql
  UPDATE group_students SET status = 'active' WHERE status = 'pending';
  -- ✅ Должно пройти
  ```

- [ ] **Active → On Hold**
  ```sql
  UPDATE group_students SET status = 'on_hold' WHERE status = 'active';
  -- ✅ Должно пройти
  ```

- [ ] **On Hold → Active**
  ```sql
  UPDATE group_students SET status = 'active' WHERE status = 'on_hold';
  -- ✅ Должно пройти
  ```

- [ ] **Active → Completed**
  ```sql
  UPDATE group_students SET status = 'completed' WHERE status = 'active';
  -- ✅ Должно пройти
  ```

- [ ] **Completed → Active** (недопустимо)
  ```sql
  UPDATE group_students SET status = 'active' WHERE status = 'completed';
  -- ❌ Должно выбросить ошибку: терминальное состояние
  ```

---

### Leads

- [ ] **New → In Process**
  ```typescript
  const { mutate } = useUpdateLead();
  mutate({ id: leadId, status: 'in_process' });
  // ✅ Должно пройти
  ```

- [ ] **In Process → Lost (без причины)** (недопустимо)
  ```typescript
  mutate({ id: leadId, status: 'lost' });
  // ❌ Должна показаться ошибка: "lost_reason is required"
  ```

- [ ] **In Process → Lost (с причиной)**
  ```typescript
  mutate({ id: leadId, status: 'lost', lost_reason: 'Цена не подошла' });
  // ✅ Должно пройти
  ```

- [ ] **Trial Done → Won**
  ```typescript
  mutate({ id: leadId, status: 'won' });
  // ✅ Должно пройти
  ```

- [ ] **Won → In Process** (недопустимо)
  ```typescript
  mutate({ id: leadId, status: 'in_process' });
  // ❌ Должна показаться ошибка: терминальное состояние
  ```

---

### Invoices

- [ ] **Draft → Issued**
  ```typescript
  const { mutate } = useUpdateInvoice();
  mutate({ id: invoiceId, updates: { status: 'issued' } });
  // ✅ Должно пройти
  ```

- [ ] **Issued → Paid**
  ```typescript
  mutate({ id: invoiceId, updates: { status: 'paid' } });
  // ✅ Должно пройти
  ```

- [ ] **Issued → изменение суммы** (недопустимо)
  ```typescript
  mutate({ id: invoiceId, updates: { amount: 10000 } });
  // ❌ Должна показаться ошибка: "Cannot change amount after issued"
  ```

- [ ] **Paid → Overdue** (недопустимо)
  ```typescript
  mutate({ id: invoiceId, updates: { status: 'overdue' } });
  // ❌ Должна показаться ошибка: терминальное состояние
  ```

---

## 📝 Audit Log

### Автоматическое логирование

- [ ] **Изменение статуса payment**
  ```sql
  UPDATE payments SET status = 'confirmed' WHERE id = '...';
  
  -- Проверка:
  SELECT * FROM audit_log 
  WHERE entity_type = 'payment' 
  AND entity_id = '...'
  ORDER BY created_at DESC 
  LIMIT 1;
  
  -- Должна быть запись с event_type = 'status_change'
  ```

- [ ] **Изменение статуса lesson_session**
  ```sql
  UPDATE lesson_sessions SET status = 'completed' WHERE id = '...';
  
  -- Проверка audit_log аналогична
  ```

- [ ] **Изменение статуса enrollment**
  ```sql
  UPDATE group_students SET status = 'expelled' WHERE id = '...';
  
  -- Проверка audit_log аналогична
  ```

### Ручное логирование

- [ ] **Использование log_audit_event**
  ```sql
  SELECT log_audit_event(
    'custom_event',
    '550e8400-e29b-41d4-a716-446655440000',
    'manual_action',
    '{"old": "value1"}',
    '{"new": "value2"}',
    auth.uid()
  );
  
  -- Проверка:
  SELECT * FROM audit_log WHERE event_type = 'manual_action';
  ```

### Производительность индексов

- [ ] **Запрос по entity_type быстрый**
  ```sql
  EXPLAIN ANALYZE
  SELECT * FROM audit_log WHERE entity_type = 'payment' LIMIT 100;
  
  -- Должен использовать Index Scan on idx_audit_entity
  ```

- [ ] **Запрос по user_id быстрый**
  ```sql
  EXPLAIN ANALYZE
  SELECT * FROM audit_log WHERE user_id = '...' LIMIT 100;
  
  -- Должен использовать Index Scan on idx_audit_user
  ```

---

## 🔒 Idempotency

### Payments

- [ ] **Дубликат по provider_transaction_id**
  ```typescript
  const { mutate } = useIdempotentPayment();
  
  // Первый раз
  mutate({
    student_id: '...',
    amount: 5000,
    method: 'card',
    payment_date: '2025-10-30',
    provider_transaction_id: 'stripe_ch_123456'
  });
  // ✅ Должно создать платеж
  
  // Второй раз с тем же ID
  mutate({
    student_id: '...',
    amount: 5000,
    method: 'card',
    payment_date: '2025-10-30',
    provider_transaction_id: 'stripe_ch_123456'
  });
  // ❌ Должна показаться ошибка: "Дублирующий платеж"
  ```

- [ ] **Проверка unique constraint на БД уровне**
  ```sql
  INSERT INTO payments (student_id, amount, provider_transaction_id, ...)
  VALUES ('...', 5000, 'test_123', ...);
  -- ✅ Первый раз пройдет
  
  INSERT INTO payments (student_id, amount, provider_transaction_id, ...)
  VALUES ('...', 5000, 'test_123', ...);
  -- ❌ Должна выброситься ошибка unique constraint
  ```

---

## ⚡ Compensating Actions

### Payment Deletion/Cancellation

- [ ] **Автоматическая компенсация при удалении**
  ```sql
  -- Создаем платеж и привязываем к сессиям
  INSERT INTO payments (...) VALUES (...) RETURNING id;
  UPDATE individual_lesson_sessions 
  SET payment_id = '<payment_id>', paid_minutes = 60
  WHERE ...;
  
  -- Удаляем платеж
  DELETE FROM payments WHERE id = '<payment_id>';
  
  -- Проверка: сессии должны иметь payment_id = NULL, paid_minutes = 0
  SELECT payment_id, paid_minutes 
  FROM individual_lesson_sessions 
  WHERE ...;
  -- Должно быть: payment_id = NULL, paid_minutes = 0
  ```

- [ ] **Автоматическая компенсация при status = 'refunded'**
  ```sql
  UPDATE payments SET status = 'refunded' WHERE id = '...';
  
  -- Проверка: связанные сессии должны быть откачены
  ```

- [ ] **Логирование в audit_log**
  ```sql
  DELETE FROM payments WHERE id = '...';
  
  -- Проверка:
  SELECT * FROM audit_log 
  WHERE entity_type = 'payment_compensation'
  AND event_type = 'sessions_reverted';
  -- Должна быть запись
  ```

### Invoice Cancellation

- [ ] **Отмена связанных pending платежей**
  ```sql
  -- Создаем счет и pending платеж
  INSERT INTO invoices (...) VALUES (...) RETURNING id;
  INSERT INTO payments (status, ...) VALUES ('pending', ...);
  
  -- Отменяем счет
  UPDATE invoices SET status = 'cancelled' WHERE id = '...';
  
  -- Проверка: платежи должны быть в статусе 'failed'
  SELECT status FROM payments WHERE ...;
  -- Должно быть: status = 'failed'
  ```

### Student Expulsion

- [ ] **Отмена будущих занятий**
  ```sql
  -- Исключаем студента
  UPDATE group_students SET status = 'expelled' WHERE id = '...';
  
  -- Проверка: будущие занятия должны быть отменены
  SELECT status FROM lesson_sessions 
  WHERE group_id = '...' 
  AND lesson_date >= CURRENT_DATE;
  -- Должно быть: status = 'cancelled'
  ```

### Manual Compensation

- [ ] **Использование useCompensatePayment**
  ```typescript
  const { mutate: compensate } = useCompensatePayment();
  
  compensate({
    paymentId: '...',
    reason: 'Test rollback'
  });
  
  // ✅ Должно:
  // 1. Откатить payment (status = 'failed')
  // 2. Вернуть сессии (paid_minutes = 0, payment_id = NULL)
  // 3. Показать toast: "Откачено N занятий"
  // 4. Записать в audit_log
  ```

- [ ] **SQL функция manual_compensate_payment**
  ```sql
  SELECT manual_compensate_payment(
    '<payment_id>',
    'Manual test rollback'
  );
  
  -- Должен вернуть:
  -- {
  --   "success": true,
  --   "sessions_reverted": N,
  --   "payment_id": "..."
  -- }
  ```

---

## 🛡️ Security (RLS)

### RLS включен на всех таблицах

- [ ] **Проверка включения RLS**
  ```sql
  SELECT tablename, rowsecurity 
  FROM pg_tables 
  WHERE schemaname = 'public' 
  AND rowsecurity = false;
  
  -- Должен вернуть пустой результат (все таблицы с RLS)
  ```

### Policies работают корректно

- [ ] **Студент не видит чужие данные**
  ```sql
  -- От имени пользователя A
  SET LOCAL role authenticated;
  SET LOCAL request.jwt.claims.sub TO '<user_a_id>';
  
  SELECT * FROM students WHERE organization_id != get_user_organization_id();
  -- Должен вернуть 0 строк
  ```

- [ ] **Admin видит все данные**
  ```sql
  -- От имени admin
  SELECT * FROM students;
  -- Должен вернуть все строки организации
  ```

### Functions имеют search_path

- [ ] **Проверка search_path в функциях**
  ```sql
  SELECT 
    routine_name,
    routine_definition
  FROM information_schema.routines
  WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION'
  AND routine_definition NOT LIKE '%SET search_path%';
  
  -- Должен вернуть пустой результат (все функции с search_path)
  ```

---

## ⚡ Performance

### Индексы на критических полях

- [ ] **audit_log индексы**
  ```sql
  SELECT indexname FROM pg_indexes 
  WHERE tablename = 'audit_log';
  
  -- Должны быть:
  -- idx_audit_entity
  -- idx_audit_user
  -- idx_audit_created
  -- idx_audit_event
  ```

- [ ] **payments индексы**
  ```sql
  SELECT indexname FROM pg_indexes 
  WHERE tablename = 'payments';
  
  -- Должны быть:
  -- payments_idempotency_key_key (UNIQUE)
  -- payments_provider_transaction_id_key (UNIQUE)
  ```

### Скорость запросов

- [ ] **Audit log запросы < 100ms**
  ```sql
  EXPLAIN ANALYZE
  SELECT * FROM audit_log 
  WHERE entity_type = 'payment' 
  AND entity_id = '...'
  ORDER BY created_at DESC 
  LIMIT 10;
  
  -- Execution Time должно быть < 100ms
  ```

- [ ] **FSM триггеры не замедляют операции**
  ```sql
  EXPLAIN ANALYZE
  UPDATE payments SET status = 'confirmed' WHERE id = '...';
  
  -- Execution Time должно быть < 50ms
  ```

---

## 📊 End-to-End сценарии

### Полный цикл платежа

- [ ] **Создание → Подтверждение → Компенсация**
  ```typescript
  // 1. Создание платежа
  const { mutate: createPayment } = useIdempotentPayment();
  createPayment({
    student_id: '...',
    amount: 5000,
    method: 'card',
    payment_date: '2025-10-30',
    provider_transaction_id: 'test_' + Date.now()
  });
  
  // 2. Проверка: статус = 'pending'
  // 3. Подтверждение
  const { mutate: confirm } = useConfirmPayment();
  confirm(paymentId);
  
  // 4. Проверка: статус = 'completed', audit_log записан
  // 5. Компенсация
  const { mutate: compensate } = useCompensatePayment();
  compensate({ paymentId, reason: 'Test' });
  
  // 6. Проверка: статус = 'failed', сессии откачены, audit_log записан
  ```

### Полный цикл лида

- [ ] **New → In Process → Trial → Won**
  ```typescript
  const { mutate } = useUpdateLead();
  
  // 1. New → In Process
  mutate({ id: leadId, status: 'in_process' });
  
  // 2. In Process → Trial Scheduled
  mutate({ id: leadId, status: 'trial_scheduled' });
  
  // 3. Trial Scheduled → Trial Done
  mutate({ id: leadId, status: 'trial_done' });
  
  // 4. Trial Done → Won
  mutate({ id: leadId, status: 'won' });
  
  // 5. Проверка: audit_log содержит все 4 перехода
  ```

---

## ✅ Итоговый чек-лист

### Критические функции работают

- [ ] FSM validation для всех сущностей
- [ ] Audit log записывается автоматически
- [ ] Idempotency предотвращает дубли
- [ ] Compensating actions откатывают изменения
- [ ] RLS защищает данные
- [ ] Производительность приемлема (< 100ms)

### UI корректно обрабатывает ошибки

- [ ] FSM ошибки показываются понятно
- [ ] Idempotency ошибки информативны
- [ ] Compensation успешно выполняется через UI
- [ ] Toast уведомления работают

### Документация актуальна

- [ ] FSM_AUDIT_INFRASTRUCTURE.md обновлена
- [ ] TESTING_CHECKLIST.md заполнен
- [ ] Примеры кода актуальны

---

## 🎯 Следующие шаги

После прохождения всех тестов:
1. Составить отчет о покрытии тестами
2. Добавить интеграционные тесты в CI/CD
3. Настроить мониторинг audit_log
4. Добавить алерты на критические ошибки FSM
