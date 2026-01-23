-- =============================================
-- AcademyOS CRM - Migration Verification Script
-- Run after import to verify data integrity
-- =============================================

\echo '=== AcademyOS CRM Migration Verification ==='
\echo ''

-- =============================================
-- 1. TABLE COUNTS
-- =============================================

\echo '=== 1. Table Counts ==='

SELECT 'organizations' as table_name, COUNT(*) as row_count FROM organizations
UNION ALL
SELECT 'profiles', COUNT(*) FROM profiles
UNION ALL
SELECT 'user_roles', COUNT(*) FROM user_roles
UNION ALL
SELECT 'clients', COUNT(*) FROM clients
UNION ALL
SELECT 'students', COUNT(*) FROM students
UNION ALL
SELECT 'teachers', COUNT(*) FROM teachers
UNION ALL
SELECT 'learning_groups', COUNT(*) FROM learning_groups
UNION ALL
SELECT 'group_students', COUNT(*) FROM group_students
UNION ALL
SELECT 'lesson_sessions', COUNT(*) FROM lesson_sessions
UNION ALL
SELECT 'student_attendance', COUNT(*) FROM student_attendance
UNION ALL
SELECT 'payments', COUNT(*) FROM payments
UNION ALL
SELECT 'balance_transactions', COUNT(*) FROM balance_transactions
UNION ALL
SELECT 'chat_messages', COUNT(*) FROM chat_messages
UNION ALL
SELECT 'subscriptions', COUNT(*) FROM subscriptions
UNION ALL
SELECT 'apps', COUNT(*) FROM apps
ORDER BY table_name;

-- =============================================
-- 2. AUTH.USERS CHECK
-- =============================================

\echo ''
\echo '=== 2. Auth Users ==='

SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN email_confirmed_at IS NOT NULL THEN 1 END) as confirmed_users
FROM auth.users;

-- =============================================
-- 3. FOREIGN KEY INTEGRITY
-- =============================================

\echo ''
\echo '=== 3. FK Integrity Checks ==='

-- Orphaned profiles (no auth.user)
SELECT 'profiles without auth.user' as check_name, COUNT(*) as orphan_count
FROM profiles p
LEFT JOIN auth.users u ON p.id = u.id
WHERE u.id IS NULL;

-- Orphaned students (no client)
SELECT 'students without client' as check_name, COUNT(*) as orphan_count
FROM students s
LEFT JOIN clients c ON s.client_id = c.id
WHERE c.id IS NULL;

-- Orphaned group_students (no group)
SELECT 'group_students without group' as check_name, COUNT(*) as orphan_count
FROM group_students gs
LEFT JOIN learning_groups lg ON gs.group_id = lg.id
WHERE lg.id IS NULL;

-- Orphaned lesson_sessions (no group)
SELECT 'lesson_sessions without group' as check_name, COUNT(*) as orphan_count
FROM lesson_sessions ls
LEFT JOIN learning_groups lg ON ls.group_id = lg.id
WHERE lg.id IS NULL;

-- Orphaned chat_messages (no client)
SELECT 'chat_messages without client' as check_name, COUNT(*) as orphan_count
FROM chat_messages cm
LEFT JOIN clients c ON cm.client_id = c.id
WHERE c.id IS NULL;

-- =============================================
-- 4. RLS STATUS
-- =============================================

\echo ''
\echo '=== 4. RLS Status ==='

SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'organizations', 'profiles', 'clients', 'students', 
    'teachers', 'learning_groups', 'chat_messages', 'payments',
    'lesson_sessions', 'apps', 'documents'
  )
ORDER BY tablename;

-- =============================================
-- 5. TRIGGERS STATUS
-- =============================================

\echo ''
\echo '=== 5. Triggers Status ==='

SELECT 
  event_object_table as table_name,
  COUNT(*) as trigger_count
FROM information_schema.triggers
WHERE trigger_schema = 'public'
GROUP BY event_object_table
ORDER BY table_name;

-- =============================================
-- 6. FUNCTIONS STATUS
-- =============================================

\echo ''
\echo '=== 6. Key Functions ==='

SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'update_updated_at_column',
    'has_role',
    'get_user_organization_id',
    'user_belongs_to_organization',
    'auto_set_organization_id',
    'generate_client_number',
    'update_student_balance',
    'mark_message_as_read'
  )
ORDER BY routine_name;

-- =============================================
-- 7. INDEXES STATUS
-- =============================================

\echo ''
\echo '=== 7. Key Indexes ==='

SELECT 
  tablename,
  COUNT(*) as index_count
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'clients', 'students', 'teachers', 'learning_groups',
    'lesson_sessions', 'chat_messages', 'payments', 'profiles'
  )
GROUP BY tablename
ORDER BY tablename;

-- =============================================
-- 8. DATA INTEGRITY CHECKS
-- =============================================

\echo ''
\echo '=== 8. Data Integrity ==='

-- Students with incorrect balance
SELECT 'students with balance mismatch' as check_name, COUNT(*) as issue_count
FROM students s
WHERE s.balance != COALESCE((
  SELECT SUM(amount) FROM balance_transactions bt WHERE bt.student_id = s.id
), 0);

-- Groups with incorrect student count
SELECT 'groups with student count mismatch' as check_name, COUNT(*) as issue_count
FROM learning_groups lg
WHERE lg.current_students != (
  SELECT COUNT(*) FROM group_students gs 
  WHERE gs.group_id = lg.id AND gs.is_active = true
);

-- =============================================
-- 9. STORAGE BUCKETS
-- =============================================

\echo ''
\echo '=== 9. Storage Buckets ==='

SELECT id, name, public, created_at
FROM storage.buckets
ORDER BY name;

-- =============================================
-- 10. RECENT DATA CHECK
-- =============================================

\echo ''
\echo '=== 10. Most Recent Records ==='

SELECT 'organizations' as table_name, MAX(created_at) as latest_record FROM organizations
UNION ALL
SELECT 'clients', MAX(created_at) FROM clients
UNION ALL
SELECT 'students', MAX(created_at) FROM students
UNION ALL
SELECT 'chat_messages', MAX(created_at) FROM chat_messages
UNION ALL
SELECT 'payments', MAX(created_at) FROM payments
UNION ALL
SELECT 'lesson_sessions', MAX(created_at) FROM lesson_sessions
ORDER BY table_name;

-- =============================================
-- SUMMARY
-- =============================================

\echo ''
\echo '=== Migration Verification Complete ==='
\echo ''
\echo 'If all checks pass:'
\echo '  - Table counts match expected values'
\echo '  - No orphaned records found'
\echo '  - RLS enabled on key tables'
\echo '  - All triggers and functions present'
\echo '  - Data integrity checks pass'
\echo ''
\echo 'Next: Deploy Edge Functions and update client configuration'
