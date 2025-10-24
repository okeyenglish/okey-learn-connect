-- Добавляем поле list_id в таблицу salebot_import_progress
ALTER TABLE public.salebot_import_progress 
ADD COLUMN list_id TEXT;

COMMENT ON COLUMN public.salebot_import_progress.list_id IS 'ID списка Salebot для импорта (например, 740756)';