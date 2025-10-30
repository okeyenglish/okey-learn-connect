# Система семейного счета и переводов

## Обзор

Система семейного счета позволяет управлять финансами нескольких студентов из одной семьи через единый счет, а также переводить средства между счетами студентов.

---

## Архитектура

### 1. Таблицы базы данных

#### `family_ledger` - Семейные счета
Хранит баланс семейного счета.

**Поля:**
- `id` UUID - первичный ключ
- `family_group_id` UUID - ссылка на семейную группу (взаимоисключающе с client_id)
- `client_id` UUID - ссылка на клиента (взаимоисключающе с family_group_id)
- `balance` NUMERIC - текущий баланс в рублях
- `currency` TEXT - валюта (по умолчанию 'RUB')
- `created_at` TIMESTAMPTZ - дата создания
- `updated_at` TIMESTAMPTZ - дата последнего обновления

**Ограничения:**
- Должен быть указан либо `family_group_id`, либо `client_id` (но не оба)
- Уникальность по `family_group_id` и по `client_id`

#### `family_ledger_transactions` - Транзакции семейного счета
История всех операций с семейным счетом.

**Поля:**
- `id` UUID - первичный ключ
- `family_ledger_id` UUID - ссылка на семейный счет
- `transaction_type` TEXT - тип транзакции:
  - `credit` - пополнение
  - `debit` - списание
  - `transfer_to_student` - перевод студенту
  - `transfer_from_student` - возврат от студента
  - `refund` - возврат средств
- `amount` NUMERIC - сумма транзакции
- `description` TEXT - описание операции
- `payment_id` UUID - ссылка на платеж (если применимо)
- `student_id` UUID - ID студента (для переводов)
- `created_by` UUID - кто создал транзакцию
- `created_at` TIMESTAMPTZ - дата создания

#### `balance_transactions` - Дополненная таблица
Добавлены новые поля для поддержки переводов:

**Новые поля:**
- `academic_hours` NUMERIC - количество академических часов
- `price_per_hour` NUMERIC - цена за час на момент транзакции
- `related_group_id` UUID - ссылка на группу
- `related_individual_lesson_id` UUID - ссылка на индивидуальное занятие
- `source_student_id` UUID - ID студента-отправителя (для переводов)
- `target_student_id` UUID - ID студента-получателя (для переводов)

**Новые типы транзакций:**
- `transfer_out` - списание при переводе другому студенту
- `transfer_between_students` - прямой перевод между студентами

---

## Функции и API

### 1. Управление семейным счетом

#### `add_family_ledger_transaction()`
Добавляет транзакцию в семейный счет и обновляет баланс.

**Параметры:**
```sql
_family_group_id UUID DEFAULT NULL,
_client_id UUID DEFAULT NULL,
_amount NUMERIC,
_transaction_type TEXT,
_description TEXT,
_payment_id UUID DEFAULT NULL
```

**Логика:**
1. Проверяет наличие семейного счета, создает если не существует
2. Создает транзакцию в `family_ledger_transactions`
3. Обновляет баланс в `family_ledger`:
   - `credit`, `transfer_from_student`, `refund` → увеличивают баланс
   - `debit`, `transfer_to_student` → уменьшают баланс

**Пример использования:**
```typescript
const { data, error } = await supabase.rpc('add_family_ledger_transaction', {
  _family_group_id: 'uuid-семейной-группы',
  _amount: 5000,
  _transaction_type: 'credit',
  _description: 'Пополнение семейного счета',
});
```

### 2. Перевод с семейного счета на счет студента

#### `transfer_to_student_balance()`
Переводит средства с семейного счета на личный счет студента.

**Параметры:**
```sql
_family_ledger_id UUID,
_student_id UUID,
_amount NUMERIC,
_description TEXT
```

**Логика:**
1. Проверяет баланс семейного счета
2. Списывает средства с семейного счета (`transfer_to_student`)
3. Пополняет счет студента (`transfer_in` в `balance_transactions`)
4. Обновляет `student_balances`

**Пример использования:**
```typescript
const { data, error } = await supabase.rpc('transfer_to_student_balance', {
  _family_ledger_id: 'uuid-семейного-счета',
  _student_id: 'uuid-студента',
  _amount: 3000,
  _description: 'Перевод на оплату занятий',
});
```

### 3. Перевод между студентами

#### `transfer_between_students()`
Переводит средства с личного счета одного студента на счет другого.

**Параметры:**
```sql
_from_student_id UUID,
_to_student_id UUID,
_amount NUMERIC,
_description TEXT,
_via_family_ledger BOOLEAN DEFAULT FALSE
```

**Два режима работы:**

#### A) Через семейный счет (`_via_family_ledger = TRUE`)
1. Возвращает средства студента-отправителя на семейный счет
2. Переводит средства с семейного счета студенту-получателю

**Преимущества:**
- Прозрачность всех операций через семейный счет
- Полная история переводов в `family_ledger_transactions`
- Возможность контроля всех переводов семьи

#### B) Прямой перевод (`_via_family_ledger = FALSE`)
1. Списывает средства со счета студента-отправителя
2. Пополняет счет студента-получателя
3. В обеих транзакциях указываются `source_student_id` и `target_student_id`

**Пример использования:**
```typescript
// Перевод через семейный счет
const { data, error } = await supabase.rpc('transfer_between_students', {
  _from_student_id: 'uuid-отправителя',
  _to_student_id: 'uuid-получателя',
  _amount: 1500,
  _description: 'Перевод от старшего брата младшему',
  _via_family_ledger: true,
});

// Прямой перевод
const { data, error } = await supabase.rpc('transfer_between_students', {
  _from_student_id: 'uuid-отправителя',
  _to_student_id: 'uuid-получателя',
  _amount: 1500,
  _description: 'Прямой перевод между студентами',
  _via_family_ledger: false,
});
```

---

## React хуки и компоненты

### Хуки (`src/hooks/useFamilyLedger.ts`)

#### `useFamilyLedger(familyGroupId?, clientId?)`
Получает семейный счет по ID семейной группы или клиента.

```typescript
const { data: ledger } = useFamilyLedger(familyGroupId, clientId);
// ledger: { id, family_group_id, client_id, balance, currency, ... }
```

#### `useFamilyLedgerTransactions(ledgerId?)`
Получает историю транзакций семейного счета.

```typescript
const { data: transactions } = useFamilyLedgerTransactions(ledgerId);
// transactions: [{ id, family_ledger_id, transaction_type, amount, ... }]
```

#### `useAddFamilyLedgerTransaction()`
Мутация для добавления транзакции в семейный счет.

```typescript
const addTransaction = useAddFamilyLedgerTransaction();

await addTransaction.mutateAsync({
  familyGroupId: 'uuid',
  amount: 5000,
  transactionType: 'credit',
  description: 'Пополнение',
});
```

#### `useTransferToStudentBalance()`
Мутация для перевода с семейного счета на счет студента.

```typescript
const transfer = useTransferToStudentBalance();

await transfer.mutateAsync({
  familyLedgerId: 'uuid',
  studentId: 'uuid',
  amount: 3000,
  description: 'Перевод студенту',
});
```

### Хуки для переводов между студентами (`src/hooks/useStudentBalances.ts`)

#### `useTransferBetweenStudents()`
Мутация для перевода средств между студентами.

```typescript
const transfer = useTransferBetweenStudents();

await transfer.mutateAsync({
  fromStudentId: 'uuid',
  toStudentId: 'uuid',
  amount: 1500,
  description: 'Перевод между братьями',
  viaFamilyLedger: true, // через семейный счет или напрямую
});
```

### Компоненты

#### `FamilyLedgerModal`
Модальное окно для управления семейным счетом.

**Функции:**
- Просмотр баланса семейного счета
- Пополнение и списание средств
- Перевод средств студентам семьи
- История всех транзакций

**Использование:**
```typescript
<FamilyLedgerModal
  open={isOpen}
  onOpenChange={setIsOpen}
  familyGroupId={familyGroupId}
  clientId={clientId} // альтернативно
/>
```

#### `StudentBalanceTransferModal`
Модальное окно для перевода средств между студентами.

**Функции:**
- Выбор студента-отправителя и получателя
- Проверка баланса отправителя
- Выбор способа перевода (через семейный счет или напрямую)
- Ввод суммы и описания

**Использование:**
```typescript
<StudentBalanceTransferModal
  open={isOpen}
  onOpenChange={setIsOpen}
  familyGroupId={familyGroupId}
  preselectedFromStudentId={studentId} // опционально
/>
```

---

## Примеры использования

### 1. Создание семейного счета и пополнение

```typescript
// Пополнить семейный счет
const addTransaction = useAddFamilyLedgerTransaction();

await addTransaction.mutateAsync({
  familyGroupId: 'uuid-семьи',
  amount: 10000,
  transactionType: 'credit',
  description: 'Пополнение на обучение детей',
});
```

### 2. Распределение средств студентам

```typescript
const transfer = useTransferToStudentBalance();

// Перевести старшему сыну
await transfer.mutateAsync({
  familyLedgerId: ledger.id,
  studentId: 'uuid-старшего',
  amount: 6000,
  description: 'На групповые занятия',
});

// Перевести младшему сыну
await transfer.mutateAsync({
  familyLedgerId: ledger.id,
  studentId: 'uuid-младшего',
  amount: 4000,
  description: 'На индивидуальные занятия',
});
```

### 3. Перевод между студентами

```typescript
const transfer = useTransferBetweenStudents();

// Старший брат переводит младшему через семейный счет
await transfer.mutateAsync({
  fromStudentId: 'uuid-старшего',
  toStudentId: 'uuid-младшего',
  amount: 1500,
  description: 'Перевод на пропущенные занятия',
  viaFamilyLedger: true,
});
```

---

## Проверка системы

### Страница тестирования: `/balance-test`

Компонент `BalanceSystemTest` отображает:
- ✅ Балансы студентов
- ✅ Транзакции балансов (включая переводы)
- ✅ Семейные счета
- ✅ Транзакции семейных счетов

**Доступ:** только для администраторов

**Проверяемые компоненты:**
1. Наличие записей в `student_balances`
2. Наличие транзакций в `balance_transactions`
3. Наличие семейных счетов в `family_ledger`
4. Наличие транзакций в `family_ledger_transactions`

---

## RLS (Row-Level Security)

### `family_ledger`

**SELECT:**
- Пользователи могут видеть семейные счета своей организации

**ALL (INSERT, UPDATE, DELETE):**
- Только администраторы и менеджеры могут управлять

### `family_ledger_transactions`

**SELECT:**
- Пользователи могут видеть транзакции семейных счетов своей организации

**ALL:**
- Только администраторы и менеджеры могут управлять

---

## Безопасность

### Проверки в функциях

#### `add_family_ledger_transaction()`
- ✅ Проверяет наличие либо `family_group_id`, либо `client_id`
- ✅ Автоматически создает семейный счет если не существует
- ✅ Использует SECURITY DEFINER с `SET search_path = public`

#### `transfer_to_student_balance()`
- ✅ Проверяет достаточность средств на семейном счете
- ✅ Выбрасывает исключение если баланс недостаточен
- ✅ Атомарная операция (все или ничего)

#### `transfer_between_students()`
- ✅ Проверяет достаточность средств у студента-отправителя
- ✅ Выбрасывает исключение если баланс недостаточен
- ✅ Находит семейный счет автоматически при `viaFamilyLedger = true`
- ✅ Атомарная операция

---

## Рекомендации по использованию

### Когда использовать семейный счет

✅ **Рекомендуется:**
- Несколько студентов из одной семьи
- Родители хотят управлять общим бюджетом
- Нужна прозрачность всех переводов между детьми
- Централизованное пополнение и распределение средств

❌ **Не рекомендуется:**
- Один студент в семье (используйте личный счет)
- Студенты не связаны родством
- Нужны изолированные счета без возможности переводов

### Когда использовать прямые переводы между студентами

✅ **Рекомендуется:**
- Быстрые переводы без посредничества семейного счета
- Студенты управляют своими счетами самостоятельно
- Не требуется контроль через семейный счет

✅ **Рекомендуется через семейный счет:**
- Родители хотят контролировать все переводы
- Нужна детальная история в семейных транзакциях
- Переводы являются частью семейного бюджета

---

## Диаграмма потока данных

```
┌─────────────────────┐
│  Пополнение         │
│  семейного счета    │
└──────────┬──────────┘
           │
           ↓
┌──────────────────────┐
│   family_ledger      │
│   balance += amount  │
└──────────┬───────────┘
           │
    ┌──────┴──────┐
    │             │
    ↓             ↓
┌───────────┐ ┌────────────┐
│ Студент 1 │ │ Студент 2  │
│ (перевод) │ │ (перевод)  │
└─────┬─────┘ └──────┬─────┘
      │              │
      ↓              ↓
┌─────────────┐ ┌─────────────┐
│ balance_    │ │ balance_    │
│ transactions│ │ transactions│
│ (credit)    │ │ (credit)    │
└─────────────┘ └─────────────┘

┌─────────────────────────────────────┐
│  Перевод между студентами           │
│  (через семейный счет)              │
└─────────────┬───────────────────────┘
              │
    ┌─────────┴─────────┐
    │                   │
    ↓                   ↓
┌──────────┐       ┌───────────────┐
│ Возврат  │       │ Перевод       │
│ на сем.  │  →    │ получателю    │
│ счет     │       │ с сем. счета  │
└──────────┘       └───────────────┘
```

---

**Дата последнего обновления:** 30 октября 2025
