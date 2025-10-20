-- Set DEFAULT for organization_id using get_user_organization_id() function
-- This makes organization_id optional in inserts while ensuring it's always set

ALTER TABLE profiles 
  ALTER COLUMN organization_id SET DEFAULT get_user_organization_id();

ALTER TABLE students 
  ALTER COLUMN organization_id SET DEFAULT get_user_organization_id();

ALTER TABLE clients 
  ALTER COLUMN organization_id SET DEFAULT get_user_organization_id();

ALTER TABLE learning_groups 
  ALTER COLUMN organization_id SET DEFAULT get_user_organization_id();

ALTER TABLE lesson_sessions 
  ALTER COLUMN organization_id SET DEFAULT get_user_organization_id();

ALTER TABLE individual_lessons 
  ALTER COLUMN organization_id SET DEFAULT get_user_organization_id();

ALTER TABLE individual_lesson_sessions 
  ALTER COLUMN organization_id SET DEFAULT get_user_organization_id();

ALTER TABLE payments 
  ALTER COLUMN organization_id SET DEFAULT get_user_organization_id();

ALTER TABLE chat_messages 
  ALTER COLUMN organization_id SET DEFAULT get_user_organization_id();

ALTER TABLE call_logs 
  ALTER COLUMN organization_id SET DEFAULT get_user_organization_id();

ALTER TABLE family_groups 
  ALTER COLUMN organization_id SET DEFAULT get_user_organization_id();

ALTER TABLE classrooms 
  ALTER COLUMN organization_id SET DEFAULT get_user_organization_id();

ALTER TABLE student_segments 
  ALTER COLUMN organization_id SET DEFAULT get_user_organization_id();