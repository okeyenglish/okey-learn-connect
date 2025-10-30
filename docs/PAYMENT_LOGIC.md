# Система оплат и начислений

## Обзор архитектуры

Система оплат в CRM состоит из нескольких взаимосвязанных компонентов:

1. **Платежи студентов** (`payments`) - входящие платежи от студентов
2. **Баланс студентов** (`student_balances`, `balance_transactions`) - учет баланса и его изменений
3. **Начисления преподавателям** (`teacher_earnings`) - автоматический расчет зарплаты
4. **Ставки преподавателей** (`teacher_rates`) - тарифы оплаты труда
5. **Выплаты преподавателям** (`teacher_payments`) - фактические выплаты

---

## 1. Платежи студентов

### Таблица: `payments`

Хранит информацию о платежах от студентов за обучение.

**Ключевые поля:**
- `student_id` - UUID студента
- `amount` - сумма платежа в рублях
- `lessons_count` - количество оплаченных академических часов (1 а.ч. = 40 мин)
- `payment_date` - дата платежа
- `method` - способ оплаты (cash, card, transfer)
- `status` - статус (pending, completed, cancelled)
- `individual_lesson_id` / `group_id` - привязка к типу занятий

### Логика для индивидуальных занятий

**Создание платежа** (`usePayments.createPayment()`):

1. Платеж сохраняется в таблице `payments`
2. Система конвертирует а.ч. в минуты: `remainingMinutes = lessons_count × 40`
3. Распределение происходит в 2 этапа:
   - **Шаг 1**: Заполняет частично оплаченные занятия (где `paid_minutes > 0` но меньше `duration`)
   - **Шаг 2**: Распределяет оставшиеся минуты по самым ранним датам расписания
4. Для каждой сессии обновляется:
   - `paid_minutes` - количество оплаченных минут
   - `payment_id` - привязка к платежу
5. Если сессии нет на дату - создается новая с `status='scheduled'`

**Удаление платежа** (`usePayments.deletePayment()`):

1. Находит все сессии с `payment_id` удаляемого платежа
2. Обнуляет `paid_minutes` и `payment_id` у этих сессий
3. **Автоматически перераспределяет** оставшиеся платежи по самым ранним датам

**Расчет статистики** (`useIndividualLessonPaymentStats`):

```typescript
paidMinutes = сумма всех (lessons_count × 40) из payments
usedMinutes = сумма duration прошедших/завершенных занятий
              (исключая cancelled/free/rescheduled)
remainingMinutes = paidMinutes - usedMinutes
debtMinutes = если usedMinutes > paidMinutes
pricePerMinute = базируется на price_per_40_min из course_prices
```

### Логика для групповых занятий

**Создание платежа:**

1. Платеж сохраняется с `group_id` и `lessons_count` (в академических часах)
2. Распределение НЕ происходит автоматически - только учет на уровне статистики

**Расчет статистики** (`useStudentGroupPaymentStats`):

```typescript
totalPaidMinutes = сумма (lessons_count × 40) для всех payments студента в группе
usedMinutes = количество прошедших/завершенных занятий из student_lesson_sessions
remainingMinutes = totalPaidMinutes - usedMinutes
```

**Важные правила:**
- Учитывается `enrollment_date` студента (только занятия после этой даты)
- Исключаются отмененные занятия (`is_cancelled_for_student`, `is_cancelled`)
- Учитываются бесплатные/бонусные занятия (`is_free`, `is_bonus`)

---

## 2. Баланс студентов

### Таблица: `student_balances`

Хранит текущий баланс каждого студента.

**Поля:**
- `student_id` - UUID студента (PK)
- `balance` - текущий баланс в рублях (может быть отрицательным = долг)
- `academic_hours` - баланс в академических часах

### Таблица: `balance_transactions`

История всех изменений баланса.

**Поля:**
- `student_id` - UUID студента
- `amount` - сумма изменения (положительная = пополнение, отрицательная = списание)
- `academic_hours` - изменение в а.ч.
- `transaction_type` - тип операции:
  - `credit` - пополнение баланса
  - `debit` - списание за занятие
  - `transfer_in` - перевод от другого студента
  - `refund` - возврат средств
- `description` - описание операции
- `lesson_session_id` - привязка к занятию (если списание за урок)

### Автоматическое списание баланса

При завершении занятия (`status = 'completed'`) срабатывают триггеры:

**Для групповых занятий** (`handle_group_lesson_charge`):
```sql
-- Для каждого активного студента группы создается запись:
INSERT INTO balance_transactions (
  student_id,
  amount,  -- отрицательная сумма
  transaction_type,  -- 'debit'
  description,
  lesson_session_id
)
```

**Для индивидуальных занятий** (`handle_individual_lesson_charge`):
```sql
-- Создается одна запись для студента:
INSERT INTO balance_transactions (
  student_id,
  amount,  -- отрицательная сумма
  transaction_type,  -- 'debit'
  description,
  lesson_session_id
)
```

---

## 3. Начисления преподавателям

### Таблица: `teacher_earnings`

Хранит начисления зарплаты преподавателям за проведенные занятия.

**Поля:**
- `teacher_id` - UUID преподавателя
- `lesson_session_id` - ID группового занятия (если применимо)
- `individual_lesson_session_id` - ID индивидуального занятия (если применимо)
- `earning_date` - дата занятия
- `academic_hours` - количество проведенных а.ч.
- `rate_per_hour` - ставка за а.ч. на момент проведения
- `amount` - сумма начисления (academic_hours × rate_per_hour)
- `currency` - валюта (RUB)
- `status` - статус начисления:
  - `accrued` - начислено (по умолчанию)
  - `paid` - оплачено
  - `cancelled` - отменено
- `payment_id` - привязка к выплате (когда status = 'paid')

### Автоматическое создание начислений

#### Функция: `accrue_teacher_earning_for_lesson()`

Вызывается автоматически триггерами при завершении занятия.

**Алгоритм:**

1. **Сбор данных о занятии:**
   - Для групповых: берет `teacher_id` из `learning_groups`, считает а.ч. как `(end_time - start_time) / 45`
   - Для индивидуальных: берет `teacher_id` из `individual_lessons`, считает а.ч. как `duration / 40`

2. **Проверка дубликатов:**
   - Проверяет, не создано ли уже начисление для этого занятия
   - Если существует - возвращает его ID

3. **Получение ставки:**
   - Вызывает `get_teacher_rate(teacher_id, branch, subject, lesson_date)`
   - Ставка выбирается с учетом приоритетов (см. раздел "Ставки преподавателей")

4. **Расчет суммы:**
   ```sql
   amount = rate_per_hour × academic_hours
   ```

5. **Создание записи:**
   ```sql
   INSERT INTO teacher_earnings (
     teacher_id,
     lesson_session_id,
     individual_lesson_session_id,
     earning_date,
     academic_hours,
     rate_per_hour,
     amount,
     status,
     currency
   ) VALUES (...)
   ```

#### Триггеры

**Триггер: `trigger_group_lesson_charge`**
```sql
-- Срабатывает AFTER UPDATE на lesson_sessions
-- Условие: NEW.status = 'completed' AND OLD.status != 'completed'
-- Действия:
--   1. Вызывает accrue_teacher_earning_for_lesson(lesson_session_id, NULL)
--   2. Создает balance_transactions для всех студентов группы
```

**Триггер: `trigger_individual_lesson_charge`**
```sql
-- Срабатывает AFTER UPDATE на individual_lesson_sessions
-- Условие: NEW.status = 'completed' AND OLD.status != 'completed'
-- Действия:
--   1. Вызывает accrue_teacher_earning_for_lesson(NULL, individual_lesson_session_id)
--   2. Создает balance_transaction для студента
```

### Отметка начислений как оплаченных

**Функция в UI:** `useMarkAccrualsPaid()`

```typescript
// Обновляет статус начислений на 'paid'
UPDATE teacher_earnings
SET status = 'paid'
WHERE id IN (accrualIds)
```

**Использование:**
1. Преподаватель/бухгалтер выбирает начисления за период
2. Отмечает их как оплаченные
3. Начисления связываются с `payment_id` (выплатой)

---

## 4. Ставки преподавателей

### Таблица: `teacher_rates`

Хранит ставки оплаты труда преподавателей.

**Поля:**
- `teacher_id` - UUID преподавателя
- `rate_type` - тип ставки:
  - `global` - глобальная ставка (для всех занятий)
  - `branch` - ставка для конкретного филиала
  - `subject` - ставка для конкретного предмета
  - `personal` - персональная ставка (наивысший приоритет)
- `rate_per_academic_hour` - ставка за 1 а.ч. в рублях
- `branch` - филиал (для rate_type = 'branch')
- `subject` - предмет (для rate_type = 'subject')
- `valid_from` - дата начала действия ставки
- `valid_until` - дата окончания действия (NULL = бессрочно)
- `is_active` - активна ли ставка
- `currency` - валюта (RUB)

### Функция: `get_teacher_rate()`

Выбирает подходящую ставку для преподавателя на конкретную дату.

**Приоритет ставок** (от высшего к низшему):
1. **Персональная** (`personal`)
2. **По предмету** (`subject`) - если указан предмет
3. **По филиалу** (`branch`) - если указан филиал
4. **Глобальная** (`global`)

**Условия:**
- `is_active = true`
- `valid_from <= дата занятия`
- `valid_until IS NULL OR valid_until >= дата занятия`
- Выбирается последняя по `valid_from DESC`

**Пример:**
```typescript
// Преподаватель имеет:
// 1. global: 500 ₽/а.ч.
// 2. branch='Котельники': 600 ₽/а.ч.
// 3. subject='Английский': 700 ₽/а.ч.
// 4. personal: 800 ₽/а.ч.

// Для занятия:
// - Филиал: Котельники
// - Предмет: Английский
// Будет выбрана ставка: 800 ₽/а.ч. (personal - наивысший приоритет)
```

### Управление ставками в UI

**Компонент:** `TeacherRatesModal`

**Функции:**
- Просмотр всех ставок преподавателя
- Создание новой ставки
- Редактирование существующей ставки
- Удаление ставки (если не использовалась в начислениях)

**Хук:** `useUpsertTeacherRate()`
```typescript
// Создание новой ставки
INSERT INTO teacher_rates (...)

// Обновление существующей
UPDATE teacher_rates
SET ...
WHERE id = rateId
```

---

## 5. Выплаты преподавателям

### Таблица: `teacher_payments`

Хранит фактические выплаты зарплаты преподавателям.

**Поля:**
- `teacher_id` - UUID преподавателя
- `amount` - сумма выплаты
- `payment_date` - дата выплаты
- `payment_method` - способ выплаты (cash, card, transfer)
- `period_start` / `period_end` - период, за который производится выплата
- `notes` - примечания

### Связь с начислениями

При создании выплаты:
1. Создается запись в `teacher_payments`
2. Все начисления за период связываются с `payment_id`
3. Статус начислений обновляется на `'paid'`

```sql
-- Создание выплаты
INSERT INTO teacher_payments (...) RETURNING id;

-- Обновление начислений
UPDATE teacher_earnings
SET status = 'paid', payment_id = new_payment_id
WHERE teacher_id = ? 
  AND earning_date BETWEEN period_start AND period_end
  AND status = 'accrued';
```

---

## 6. Тестирование системы

### Страница: `/payment-test`

**Компонент:** `PaymentSystemTest`

Отображает состояние системы оплат в реальном времени.

**Проверяемые компоненты:**
1. ✅ **Платежи** - последние 10 платежей студентов
2. ✅ **Начисления** - последние 10 начислений преподавателям
3. ✅ **Транзакции** - последние 10 изменений баланса
4. ✅ **Завершенные занятия** - последние 10 занятий со статусом 'completed'
5. ✅ **Ставки** - активные ставки преподавателей

**Индикаторы:**
- 🟢 **Зеленая галочка** - компонент работает (есть данные)
- 🟠 **Оранжевые часы** - нет данных (может быть норма для новой системы)

**Кнопка "Обновить данные"** - перезагружает статистику

---

## 7. API и хуки

### Платежи студентов

```typescript
// Создание платежа
const { mutate: createPayment } = usePayments();
createPayment({
  studentId,
  amount: 6400,
  lessons_count: 8,  // 8 академических часов
  method: 'cash',
  payment_date: new Date(),
});

// Удаление платежа (с автоматическим перераспределением)
const { mutate: deletePayment } = usePayments();
deletePayment(paymentId);
```

### Начисления преподавателям

```typescript
// Получение начислений преподавателя
const { data: accruals } = useTeacherAccruals(
  teacherId,
  '2025-01-01',  // period_start
  '2025-01-31'   // period_end
);

// Статистика начислений
const { data: stats } = useTeacherSalaryStats(
  teacherId,
  '2025-01-01',
  '2025-01-31'
);
// Возвращает: {
//   total_amount: 45000,
//   total_hours: 56.25,
//   total_lessons: 45,
//   group_lessons: 30,
//   individual_lessons: 15,
//   paid_amount: 30000,
//   unpaid_amount: 15000
// }

// Отметить начисления как оплаченные
const { mutate: markPaid } = useMarkAccrualsPaid();
markPaid(['accrual_id_1', 'accrual_id_2']);
```

### Ставки преподавателей

```typescript
// Получение ставок
const { data: rates } = useTeacherRates(teacherId);

// Создание/обновление ставки
const { mutate: upsertRate } = useUpsertTeacherRate();
upsertRate({
  teacher_id: teacherId,
  rate_type: 'branch',
  branch: 'Котельники',
  rate_per_academic_hour: 800,
  valid_from: '2025-01-01',
  is_active: true,
});

// Удаление ставки
const { mutate: deleteRate } = useDeleteTeacherRate();
deleteRate(rateId);
```

---

## 8. Диаграмма потока данных

```
┌─────────────┐
│   Студент   │
│   платит    │
└──────┬──────┘
       │
       ↓
┌─────────────────┐
│    payments     │  ← Создание платежа
│  lessons_count  │
└────────┬────────┘
         │
         ↓
┌──────────────────────────┐
│ individual_lesson_       │
│    sessions              │  ← Распределение paid_minutes
│  paid_minutes += X       │
└────────┬─────────────────┘
         │
         ↓ (при status = 'completed')
         │
    ┌────┴────┐
    │         │
    ↓         ↓
┌─────────────────┐   ┌──────────────────────┐
│ balance_        │   │ teacher_earnings     │
│ transactions    │   │  (автоматически      │
│ (списание)      │   │   через триггер)     │
└─────────────────┘   └──────────┬───────────┘
                                 │
                                 ↓
                      ┌──────────────────────┐
                      │ teacher_payments     │
                      │ (при выплате)        │
                      └──────────────────────┘
```

---

## 9. Важные правила

### Для разработчиков

1. **Никогда не изменяйте `balance_transactions` вручную** - только через триггеры
2. **Всегда проверяйте наличие ставки** перед созданием начисления
3. **Используйте `accrue_teacher_earning_for_lesson()`** для создания начислений
4. **Триггеры срабатывают только при переходе в `status = 'completed'`**
5. **Не забывайте обновлять `teacher_earnings.status`** при создании выплаты

### Для тестирования

1. Создайте тестового преподавателя с активной ставкой
2. Создайте тестовое индивидуальное занятие
3. Создайте платеж для студента
4. Завершите занятие (измените status на 'completed')
5. Проверьте, что:
   - Создалась `balance_transaction` (debit)
   - Создалось `teacher_earning` (accrued)
   - Сумма рассчитана корректно

### Для бухгалтерии

1. **Начисления создаются автоматически** при завершении занятий
2. **Ставки должны быть настроены заранее** (иначе сумма = 0)
3. **Статус 'accrued'** означает "начислено, но не выплачено"
4. **Статус 'paid'** означает "выплачено" (связано с teacher_payment)

---

## 10. Связанные файлы

### Backend (Supabase)
- `supabase/migrations/*_teacher_earnings.sql` - таблица начислений
- `supabase/migrations/*_teacher_rates.sql` - таблица ставок
- `supabase/migrations/*_fix_teacher_earnings_triggers.sql` - исправленные триггеры

### Frontend
- `src/hooks/useTeacherSalary.ts` - хуки для работы с зарплатой
- `src/hooks/usePayments.ts` - хуки для работы с платежами
- `src/components/finances/TeacherSalaryManagement.tsx` - UI управления зарплатой
- `src/components/finances/TeacherRatesModal.tsx` - UI управления ставками
- `src/components/finances/StudentBalanceCard.tsx` - карточка баланса студента
- `src/pages/PaymentSystemTest.tsx` - страница тестирования системы

---

## 11. FAQ

**Q: Почему начисления не создаются автоматически?**

A: Проверьте:
1. Занятие имеет `status = 'completed'`
2. У преподавателя есть активная ставка
3. Триггеры установлены корректно (проверьте миграции)

**Q: Как изменить ставку преподавателя?**

A: Создайте новую ставку с новой датой `valid_from`. Старая ставка автоматически станет неактивной для новых занятий.

**Q: Можно ли удалить начисление?**

A: Да, но лучше изменить статус на `'cancelled'` для сохранения истории.

**Q: Как работает приоритет ставок?**

A: personal > subject > branch > global. Система выбирает самую специфичную ставку.

**Q: Что делать, если у преподавателя нет ставки?**

A: Создайте хотя бы глобальную ставку (`rate_type = 'global'`). Иначе начисления будут с `amount = 0`.

---

**Дата последнего обновления:** 30 октября 2025
