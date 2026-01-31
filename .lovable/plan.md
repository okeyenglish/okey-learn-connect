
# План: Оптимизация производительности CRM - Удаление debug логов

## Проблема
Компонент `ManagerMenu` логирует в консоль на КАЖДЫЙ рендер (30+ раз при загрузке страницы), что:
- Замедляет рендеринг
- Засоряет консоль отладочными данными
- Потребляет ресурсы браузера

## Решение

### Задача 1: Удалить debug console.log из ManagerMenu

Удалить строку 86 в `src/components/crm/ManagerMenu.tsx`:

```typescript
// УДАЛИТЬ ЭТУ СТРОКУ:
console.log('🔐 ManagerMenu roles check:', { role, roles, isAdmin, isMethodist, canAccessAdmin });
```

### Задача 2: Мемоизировать вычисление ролей в ManagerMenu

Обернуть вычисление `isAdmin`, `isMethodist`, `canAccessAdmin` в `useMemo` для предотвращения лишних вычислений:

```typescript
const { isAdmin, isMethodist, canAccessAdmin } = useMemo(() => {
  const isAdmin = role === 'admin' || (Array.isArray(roles) && roles.includes('admin'));
  const isMethodist = role === 'methodist' || (Array.isArray(roles) && roles.includes('methodist'));
  return {
    isAdmin,
    isMethodist,
    canAccessAdmin: isAdmin || isMethodist,
  };
}, [role, roles]);
```

### Задача 3: Обернуть ManagerMenu в React.memo

Предотвратить ре-рендеры при неизменных props:

```typescript
export const ManagerMenu = React.memo(({ 
  managerName, 
  managerEmail, 
  avatarUrl, 
  onSignOut 
}: ManagerMenuProps) => {
  // ...
});
```

## Файлы для изменения

| Файл | Изменение |
|------|-----------|
| `src/components/crm/ManagerMenu.tsx` | Удалить console.log, добавить useMemo и React.memo |

## Ожидаемый результат

- Уменьшение логов в консоли с 30+ до 0
- Снижение нагрузки на рендеринг
- Ускорение загрузки CRM интерфейса
