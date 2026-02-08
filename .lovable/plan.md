
## План: Добавить "Настройки бонусов" в Админ-панель

### Что нужно сделать

Добавить новый пункт меню "Настройки бонусов" в боковое меню Админ-панели, чтобы администраторы могли редактировать условия бонусов прямо из панели управления.

### Изменения

#### 1. AdminSidebar.tsx — добавить пункт в меню

Добавить новый элемент в массив `adminItems`:

```typescript
{ title: "Настройки бонусов", id: "bonus-settings", icon: Gift }
```

Разместить рядом с другими настройками (например, после "KPI менеджеров" или в конце списка перед "Settings").

Также добавить импорт иконки `Gift` из lucide-react.

#### 2. AdminDashboard.tsx — добавить обработчик секции

В switch-case функции `renderContent()` добавить новый case:

```typescript
case "bonus-settings":
  return <BonusSettingsPage />;
```

Добавить импорт компонента `BonusSettingsPage` из `@/components/employees/BonusSettingsPage`.

#### 3. permissions.ts — добавить в типы (опционально)

Добавить `'bonus-settings'` в тип `AdminSectionId` для типобезопасности.

### Результат

После применения изменений:
- В боковом меню Админ-панели появится пункт "Настройки бонусов"
- При клике откроется страница редактирования условий бонусов
- Доступ будет только у администраторов (как и остальные пункты меню)

### Файлы для изменения

| Файл | Изменение |
|------|-----------|
| `src/components/admin/AdminSidebar.tsx` | Добавить пункт меню + импорт Gift |
| `src/components/admin/AdminDashboard.tsx` | Добавить case + импорт BonusSettingsPage |
| `src/lib/permissions.ts` | Добавить 'bonus-settings' в AdminSectionId |
