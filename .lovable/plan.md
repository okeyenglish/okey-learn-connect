
## Исправление: клик по карточке клиента в AI Hub открывает диалог с клиентом

### Проблема
Сейчас `ClientCardBubble` использует `window.location.href` для навигации, что вызывает полную перезагрузку страницы и закрывает AI Hub. Диалог с клиентом не открывается корректно.

### Решение
Передать callback `onOpenChat` из `AIHub` в `ClientCardBubble`, чтобы при клике:
1. Закрыть AI Hub модалку
2. Переключить CRM на вкладку "Чаты"
3. Открыть диалог с выбранным клиентом (со всеми мессенджерами)

### Изменения

**1. `src/components/ai-hub/ClientCardBubble.tsx`**
- Добавить опциональный проп `onOpenChat?: (clientId: string) => void`
- В `handleClick`: если `onOpenChat` передан — вызвать его вместо `window.location.href`
- Убрать зависимость от `useNavigate` если `onOpenChat` доступен

**2. `src/components/ai-hub/AIHub.tsx`**
- В рендере `ClientCardBubble` передать проп `onOpenChat`, который:
  - Вызывает `onOpenChat?.(clientId)` (callback из CRM)
  - Вызывает `onToggle()` для закрытия AI Hub модалки

Никаких изменений в `CRM.tsx` не нужно — `onOpenChat` уже передается в `AIHub` и вызывает `handleChatClick(clientId, 'client')`.
