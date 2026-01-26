

# Анимация отправки сообщений и плавное переключение чатов

## Обзор

Добавим две анимации для улучшения UX в чате:
1. **Анимация отправки нового сообщения** — появление снизу с лёгкой подсветкой
2. **Плавный fade-переход при переключении между чатами**

---

## Задача 1: Анимация отправки нового сообщения

### Текущее состояние

Сейчас все сообщения используют `animate-fade-in` с `animationIndex` для staggered-эффекта при загрузке. Новые отправленные сообщения появляются мгновенно без специального эффекта.

### Решение

1. Отслеживать ID только что отправленных сообщений (последние 5 секунд)
2. Применять к ним специальную анимацию `animate-message-send` — появление снизу (`translateY(16px)`) с пульсирующей подсветкой
3. Автоматически снимать флаг анимации через 1 секунду

### Изменения

#### tailwind.config.ts — новые keyframes и animation

```text
keyframes: {
  "message-send": {
    "0%": { 
      opacity: "0", 
      transform: "translateY(16px) scale(0.95)",
      boxShadow: "0 0 0 0 hsl(217 72% 48% / 0.4)"
    },
    "50%": { 
      opacity: "1", 
      transform: "translateY(0) scale(1)",
      boxShadow: "0 0 0 8px hsl(217 72% 48% / 0)"
    },
    "100%": { 
      opacity: "1", 
      transform: "translateY(0) scale(1)",
      boxShadow: "0 0 0 0 hsl(217 72% 48% / 0)"
    }
  }
}

animation: {
  "message-send": "message-send 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards"
}
```

#### ChatArea.tsx — отслеживание отправленных сообщений

```typescript
// Новый state для ID отправленных сообщений
const [recentlySentIds, setRecentlySentIds] = useState<Set<string>>(new Set());

// В handleSendMessage после успешной отправки:
// Добавляем временный ID или получаем реальный ID после вставки
// Через 1 секунду убираем из Set
```

#### ChatMessage.tsx — применение анимации

```typescript
// Новый prop
isJustSent?: boolean;

// В className контейнера:
className={`... ${isJustSent ? 'animate-message-send' : 'animate-fade-in'}`}
```

---

## Задача 2: Плавный fade-переход при переключении чатов

### Текущее состояние

Уже есть базовая логика:
- `isChatSwitching` — флаг переключения чата (200ms)
- `isTabTransitioning` — флаг переключения вкладки
- Применяется `opacity-50 scale-[0.99]` к контенту

### Улучшение

Сделать переход более плавным:
1. Увеличить длительность анимации до 250ms
2. Добавить CSS-класс `chat-transition` с `will-change: opacity, transform`
3. Использовать `ease-out` для естественного затухания

### Изменения

#### index.css или crm.css — новый класс

```css
.chat-transition-enter {
  opacity: 0;
  transform: scale(0.98) translateY(4px);
}

.chat-transition-active {
  opacity: 1;
  transform: scale(1) translateY(0);
  transition: opacity 250ms ease-out, transform 250ms ease-out;
  will-change: opacity, transform;
}

.chat-transition-exit {
  opacity: 0.5;
  transform: scale(0.99);
  transition: opacity 150ms ease-in, transform 150ms ease-in;
}
```

#### ChatArea.tsx — улучшение логики переключения

```typescript
// Увеличить timeout с 200ms до 250ms
setIsChatSwitching(true);
setTimeout(() => setIsChatSwitching(false), 250);

// Обновить классы TabsContent:
className={`... ${isChatSwitching ? 'chat-transition-exit' : 'chat-transition-active'}`}
```

---

## Технические детали

### Файлы для изменения

| Файл | Изменения |
|------|-----------|
| `tailwind.config.ts` | Добавить `message-send` keyframe и animation |
| `src/components/crm/ChatMessage.tsx` | Новый prop `isJustSent`, условная анимация |
| `src/components/crm/ChatArea.tsx` | State `recentlySentIds`, передача prop в ChatMessage, улучшение transition timing |
| `src/styles/crm.css` | CSS-классы для chat-transition |

### Паттерн отслеживания отправленных сообщений

```typescript
// В ChatArea.tsx
const recentlySentIds = useRef<Set<string>>(new Set());

const markAsSent = useCallback((messageId: string) => {
  recentlySentIds.current.add(messageId);
  // Удалить через 1.5 секунды (после завершения анимации)
  setTimeout(() => {
    recentlySentIds.current.delete(messageId);
  }, 1500);
}, []);

// При рендере сообщений проверяем:
isJustSent={recentlySentIds.current.has(msg.id)}
```

### Важные моменты

1. **Производительность** — использование `will-change` только на активных transitions
2. **Совместимость** — анимации работают с существующими `animate-fade-in` для загрузки
3. **Subtle эффект** — подсветка мягкая (brand color с opacity 0.4), не отвлекает

---

## Результат

После реализации:
- Новые отправленные сообщения появляются снизу с мягким "пульсом" подсветки
- Переключение между чатами происходит плавно с fade-эффектом
- Анимации согласованы с общим стилем design system (calm, reliable)

