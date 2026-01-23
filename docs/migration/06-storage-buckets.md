# Storage Buckets (7 шт.)

> Supabase Storage buckets и их политики

## Список buckets

| Bucket | Public | Описание |
|--------|--------|----------|
| `apps` | ✓ | HTML-файлы сгенерированных приложений |
| `avatars` | ✓ | Аватары пользователей |
| `branch-photos` | ✓ | Фотографии филиалов |
| `chat-files` | ✓ | Файлы из чатов (WhatsApp, Telegram) |
| `documents` | ✗ | Документы (договоры, справки) |
| `student-avatars` | ✓ | Аватары студентов |
| `textbooks` | ✓ | Учебные материалы |

## SQL для создания buckets

```sql
-- Создание buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('apps', 'apps', true, 10485760, ARRAY['text/html']),
  ('avatars', 'avatars', true, null, null),
  ('branch-photos', 'branch-photos', true, 5242880, ARRAY['image/*']),
  ('chat-files', 'chat-files', true, null, null),
  ('documents', 'documents', false, 52428800, ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'image/*']),
  ('student-avatars', 'student-avatars', true, 5242880, ARRAY['image/*']),
  ('textbooks', 'textbooks', true, null, null)
ON CONFLICT (id) DO NOTHING;
```

## Storage Policies

### apps bucket

```sql
-- Public read
CREATE POLICY "Apps are publicly accessible" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'apps');

-- Authenticated upload
CREATE POLICY "Authenticated users can upload apps" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'apps' AND auth.role() = 'authenticated');

-- Owner update/delete
CREATE POLICY "Users can update their own apps" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'apps' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own apps" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'apps' AND auth.uid()::text = (storage.foldername(name))[1]);
```

### avatars bucket

```sql
-- Public read
CREATE POLICY "Avatar images are publicly accessible" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'avatars');

-- Authenticated upload
CREATE POLICY "Anyone can upload an avatar" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'avatars');

-- Owner update
CREATE POLICY "Users can update their own avatar" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
```

### branch-photos bucket

```sql
-- Public read
CREATE POLICY "Branch photos are publicly accessible" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'branch-photos');

-- Authenticated upload
CREATE POLICY "Authenticated users can upload branch photos" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'branch-photos' AND auth.role() = 'authenticated');

-- Authenticated update/delete
CREATE POLICY "Authenticated users can update branch photos" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'branch-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete branch photos" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'branch-photos' AND auth.role() = 'authenticated');
```

### chat-files bucket

```sql
-- Public read
CREATE POLICY "Chat files are publicly accessible" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'chat-files');

-- Authenticated upload
CREATE POLICY "Authenticated users can upload chat files" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'chat-files' AND auth.role() = 'authenticated');
```

### documents bucket (PRIVATE)

```sql
-- Authenticated read only
CREATE POLICY "Authenticated users can view documents" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'documents' AND auth.role() = 'authenticated');

-- Authenticated upload
CREATE POLICY "Authenticated users can upload documents" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'documents' AND auth.role() = 'authenticated');

-- Authenticated update/delete
CREATE POLICY "Authenticated users can update documents" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete documents" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'documents' AND auth.role() = 'authenticated');
```

### student-avatars bucket

```sql
-- Public read
CREATE POLICY "Student avatars are publicly accessible" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'student-avatars');

-- Authenticated upload/update/delete
CREATE POLICY "Authenticated users can upload student avatars" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'student-avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update student avatars" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'student-avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete student avatars" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'student-avatars' AND auth.role() = 'authenticated');
```

### textbooks bucket

```sql
-- Public read
CREATE POLICY "Textbooks are publicly accessible" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'textbooks');

-- Authenticated upload
CREATE POLICY "Authenticated users can upload textbooks" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'textbooks' AND auth.role() = 'authenticated');

-- Authenticated update/delete
CREATE POLICY "Authenticated users can manage textbooks" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'textbooks' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete textbooks" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'textbooks' AND auth.role() = 'authenticated');
```

## Миграция файлов

### Экспорт из Supabase Cloud

```bash
# Скачать все файлы из bucket
supabase storage download avatars --linked

# Или через API
curl -X GET "https://YOUR_PROJECT.supabase.co/storage/v1/bucket/avatars" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

### Импорт в Self-Hosted

```bash
# Загрузить файлы
supabase storage upload avatars ./local-avatars-folder --linked

# Или через API
curl -X POST "https://YOUR_SELFHOSTED/storage/v1/object/avatars/filename.jpg" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: image/jpeg" \
  --data-binary @./file.jpg
```

## Структура папок

```
avatars/
  {user_id}/
    avatar.jpg
    
branch-photos/
  {branch_id}/
    photo1.jpg
    photo2.jpg
    
chat-files/
  {organization_id}/
    {client_id}/
      file1.pdf
      image1.jpg
      
documents/
  {organization_id}/
    contracts/
    certificates/
    
student-avatars/
  {student_id}/
    avatar.jpg
    
textbooks/
  {course_id}/
    book.pdf
    audio/
```
