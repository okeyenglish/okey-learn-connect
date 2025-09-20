-- Create enum for relationship types
CREATE TYPE public.relationship_type AS ENUM ('main', 'spouse', 'parent', 'guardian', 'other');

-- Create enum for student status
CREATE TYPE public.student_status AS ENUM ('active', 'inactive', 'trial', 'graduated');

-- Create clients table
CREATE TABLE public.clients (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    is_active BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    UNIQUE(phone)
);

-- Create family_groups table to group related clients
CREATE TABLE public.family_groups (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create family_members table to link clients to families
CREATE TABLE public.family_members (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    family_group_id UUID NOT NULL REFERENCES public.family_groups(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    relationship_type public.relationship_type NOT NULL DEFAULT 'main',
    is_primary_contact BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(family_group_id, client_id)
);

-- Create students table
CREATE TABLE public.students (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    family_group_id UUID NOT NULL REFERENCES public.family_groups(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    age INTEGER NOT NULL CHECK (age > 0 AND age < 100),
    date_of_birth DATE,
    status public.student_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    notes TEXT
);

-- Create student_courses table for many-to-many relationship
CREATE TABLE public.student_courses (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    course_name TEXT NOT NULL,
    start_date DATE,
    end_date DATE,
    next_lesson_date TIMESTAMP WITH TIME ZONE,
    next_payment_date DATE,
    payment_amount DECIMAL(10,2),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chat_messages table for storing chat history
CREATE TABLE public.chat_messages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    message_text TEXT NOT NULL,
    message_type TEXT NOT NULL CHECK (message_type IN ('client', 'manager', 'system')),
    system_type TEXT CHECK (system_type IN ('missed-call', 'call-record')),
    call_duration TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    is_read BOOLEAN NOT NULL DEFAULT false
);

-- Enable Row Level Security
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (for now, allow all operations - in production you'd want proper user-based policies)
CREATE POLICY "Allow all operations on clients" ON public.clients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on family_groups" ON public.family_groups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on family_members" ON public.family_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on students" ON public.students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on student_courses" ON public.student_courses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on chat_messages" ON public.chat_messages FOR ALL USING (true) WITH CHECK (true);

-- Create triggers for updating timestamps
CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON public.clients
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_family_groups_updated_at
    BEFORE UPDATE ON public.family_groups
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_students_updated_at
    BEFORE UPDATE ON public.students
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_student_courses_updated_at
    BEFORE UPDATE ON public.student_courses
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample data
INSERT INTO public.family_groups (id, name) VALUES 
('550e8400-e29b-41d4-a716-446655440000', 'Семья Петровых');

INSERT INTO public.clients (id, name, phone, email) VALUES 
('550e8400-e29b-41d4-a716-446655440001', 'Мария Петрова', '+7 (985) 261-50-56', 'maria.petrova@email.com'),
('550e8400-e29b-41d4-a716-446655440002', 'Сергей Петров', '+7 (985) 123-45-67', 'sergey.petrov@email.com');

INSERT INTO public.family_members (family_group_id, client_id, relationship_type, is_primary_contact) VALUES 
('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'main', true),
('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440002', 'spouse', false);

INSERT INTO public.students (id, family_group_id, name, age, status) VALUES 
('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', 'Павел', 8, 'active'),
('550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440000', 'Маша', 6, 'active');

INSERT INTO public.student_courses (student_id, course_name, next_lesson_date, next_payment_date, payment_amount, is_active) VALUES 
('550e8400-e29b-41d4-a716-446655440003', 'Kids Box 2', '2025-09-20 17:20:00+00', '2025-09-25', 11490.00, true),
('550e8400-e29b-41d4-a716-446655440004', 'Super Safari 1', '2025-09-21 10:00:00+00', '2025-10-15', 9500.00, true);