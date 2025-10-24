-- Сброс флага is_running для разблокировки импорта
UPDATE salebot_import_progress 
SET is_running = false 
WHERE is_running = true;