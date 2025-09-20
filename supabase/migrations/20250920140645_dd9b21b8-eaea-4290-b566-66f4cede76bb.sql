-- Add phone field and separate name fields to students table
ALTER TABLE students 
ADD COLUMN phone TEXT,
ADD COLUMN first_name TEXT,
ADD COLUMN last_name TEXT,
ADD COLUMN middle_name TEXT;

-- Update existing data to populate the new name fields from the existing name field
UPDATE students 
SET 
  first_name = CASE 
    WHEN array_length(string_to_array(name, ' '), 1) >= 2 THEN split_part(name, ' ', 2)
    ELSE name 
  END,
  last_name = CASE 
    WHEN array_length(string_to_array(name, ' '), 1) >= 1 THEN split_part(name, ' ', 1)
    ELSE 'Фамилия'
  END,
  middle_name = CASE 
    WHEN array_length(string_to_array(name, ' '), 1) >= 3 THEN split_part(name, ' ', 3)
    ELSE 'Отчество'
  END,
  phone = '+7 (000) 000-00-00' -- Default phone number
WHERE first_name IS NULL OR last_name IS NULL OR middle_name IS NULL;