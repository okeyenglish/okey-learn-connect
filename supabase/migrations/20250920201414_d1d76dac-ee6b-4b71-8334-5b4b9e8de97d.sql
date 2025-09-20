-- Добавить поле для сохранения состояния открытых модальных окон
ALTER TABLE public.pinned_modals 
ADD COLUMN is_open boolean NOT NULL DEFAULT false;