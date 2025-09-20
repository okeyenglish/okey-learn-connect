-- Удаляем все данные из всех таблиц с каскадным удалением
TRUNCATE TABLE public.chat_messages CASCADE;
TRUNCATE TABLE public.client_phone_numbers CASCADE;
TRUNCATE TABLE public.student_courses CASCADE;
TRUNCATE TABLE public.students CASCADE;
TRUNCATE TABLE public.family_members CASCADE;
TRUNCATE TABLE public.clients CASCADE;
TRUNCATE TABLE public.family_groups CASCADE;