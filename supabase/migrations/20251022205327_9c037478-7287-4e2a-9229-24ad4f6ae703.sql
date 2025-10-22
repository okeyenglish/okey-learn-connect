-- Delete all student-related data again before re-import with corrected logic
-- First delete dependent records
DELETE FROM group_students;
DELETE FROM individual_lesson_sessions;

-- Then delete all students
DELETE FROM students;