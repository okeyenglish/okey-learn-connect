-- Добавляем роль admin пользователю pyshnov89@mail.ru
INSERT INTO public.user_roles (user_id, role) 
VALUES ('0a5d61cf-f502-464c-887a-86ad763cf7e7', 'admin') 
ON CONFLICT (user_id, role) DO NOTHING;