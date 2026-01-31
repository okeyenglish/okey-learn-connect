
# План: Обновление WhatsApp вебхуков для поддержки teacher_id

## ✅ ВЫПОЛНЕНО

### Реализованные изменения

#### 1. whatsapp-webhook/index.ts (GreenAPI) ✅
- `handleIncomingMessage` — добавлена проверка `teachers.whatsapp_id` перед созданием клиента
- `handleOutgoingMessage` — добавлена проверка `teachers.whatsapp_id` перед созданием клиента
- `handleIncomingReaction` — добавлена проверка для реакций от преподавателей
- Добавлена функция `handleReactionMessageForTeacher` для обработки реакций с `teacher_id`

#### 2. wpp-webhook/index.ts (WPP Connect) ✅
- `handleIncomingMessage` — добавлена проверка `teachers.whatsapp_id` перед созданием клиента
- Поддержка как входящих, так и исходящих сообщений (isFromMe)

## Логика работы

При входящем/исходящем сообщении в WhatsApp:
1. **ПРИОРИТЕТ 1**: Проверить `teachers.whatsapp_id` по номеру телефона
   - Если найден преподаватель → сохранить сообщение с `teacher_id`, без `client_id`
2. **ПРИОРИТЕТ 2**: Если преподаватель не найден → стандартный flow с клиентом

## Результат

Теперь ВСЕ три WhatsApp провайдера корректно атрибутируют сообщения:
- ✅ `wappi-whatsapp-webhook` (Wappi)
- ✅ `whatsapp-webhook` (GreenAPI)
- ✅ `wpp-webhook` (WPP Connect)

Новые входящие сообщения от преподавателей сразу попадут в папку "Преподаватели" и не будут создавать дубликаты клиентов.

## Деплой

Функции будут автоматически задеплоены через GitHub Actions при push в main.
Или можно задеплоить вручную по инструкции в `docs/migration/11-deploy-edge-functions-to-selfhosted.md`.
