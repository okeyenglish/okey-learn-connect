
# План: Настраиваемый порог активности

## Обзор изменений
Добавление возможности настроить порог срабатывания предупреждения активности (текущее значение захардкожено на 60%).

---

## Изменения по файлам

### 1. `src/hooks/useNotificationSettings.ts`

**Добавить поле в интерфейс:**
```typescript
interface NotificationSettings {
  // ... существующие поля
  activityWarningThreshold: number; // 30-90, по умолчанию 60
}
```

**Значение по умолчанию:**
```typescript
const DEFAULT_SETTINGS = {
  // ...
  activityWarningThreshold: 60,
};
```

**Добавить сеттер:**
```typescript
const setActivityWarningThreshold = useCallback((threshold: number) => {
  saveSettings({ activityWarningThreshold: Math.max(30, Math.min(90, threshold)) });
}, [saveSettings]);
```

---

### 2. `src/hooks/useActivityTracker.ts`

**Заменить константу на значение из настроек:**
```typescript
// Было:
const LOW_ACTIVITY_THRESHOLD = 60;

// Станет динамическим:
const notificationSettings = getNotificationSettings();
const threshold = notificationSettings.activityWarningThreshold || 60;

if (activityPercentage < threshold && !state.lowActivityAlertShown) {
  // ...
}

// Сброс флага с буфером +5%
if (activityPercentage >= threshold + 5 && state.lowActivityAlertShown) {
  // ...
}
```

---

### 3. `src/components/settings/NotificationSettings.tsx`

**Добавить слайдер порога под переключателем предупреждения:**

```text
┌─────────────────────────────────────────────────────┐
│ ⚡ Предупреждение активности            [Тест] [🔘] │
│     Звук при падении активности                     │
│                                                     │
│     Порог: 60%                                      │
│     [═══════════●═════════════]                     │
│     30%                                         90% │
└─────────────────────────────────────────────────────┘
```

- Слайдер показывается только когда `activityWarningEnabled = true`
- Диапазон: 30% - 90%
- Шаг: 5%

---

## Технические детали

| Файл | Тип изменения |
|------|---------------|
| `useNotificationSettings.ts` | Добавить поле + сеттер |
| `useActivityTracker.ts` | Читать порог из настроек |
| `NotificationSettings.tsx` | Добавить UI слайдер |

### Логика порога
- **Минимум 30%**: Слишком низкий порог бесполезен
- **Максимум 90%**: Слишком высокий порог будет раздражать
- **Буфер сброса +5%**: Предотвращает повторные срабатывания на границе
