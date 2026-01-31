
# План исправления ссылки HolyHope для учеников

## ✅ ВЫПОЛНЕНО

### Фронтенд (готово к использованию)
- [x] `src/hooks/useFamilyData.ts` - добавлен `holihopeId` в интерфейс Student и маппинг `external_id`
- [x] `src/components/crm/FamilyCard.tsx` - использует `student.holihopeId` с fallback на старую логику

### Self-hosted миграция (требует ручного применения)
Файл: `docs/selfhosted-migration-add-external-id.sql`

Применить на api.academyos.ru:
1. Добавляет колонку `external_id` в таблицу `students`
2. Создаёт уникальный индекс `students_external_id_org_unique`
3. Обновляет RPC функцию `get_family_data_optimized` для возврата `external_id`

## Следующие шаги
1. Применить SQL миграцию на self-hosted сервере
2. Перезапустить импорт из HoliHope, чтобы заполнить `external_id` для всех студентов
