-- Add extension number field to profiles table for SIP calling
ALTER TABLE public.profiles 
ADD COLUMN extension_number text,
ADD COLUMN sip_domain text DEFAULT 'pbx11034.onpbx.ru',
ADD COLUMN sip_password text;