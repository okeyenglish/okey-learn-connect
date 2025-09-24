-- Update the existing teacher record to match the profile name
UPDATE teachers 
SET first_name = 'Мария', last_name = 'Иванова' 
WHERE first_name = 'Мария' AND last_name = 'Петрова';

-- Update user role to teacher for the Мария Иванова profile
UPDATE user_roles 
SET role = 'teacher' 
WHERE user_id IN (
  SELECT id FROM profiles 
  WHERE first_name = 'Мария' AND last_name = 'Иванова'
);