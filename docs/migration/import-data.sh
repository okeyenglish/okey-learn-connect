#!/bin/bash
# =============================================
# AcademyOS CRM - Data Import Script
# Import data to Self-Hosted Supabase
# =============================================

# Configuration - UPDATE THESE VALUES
SELF_HOSTED_HOST="localhost"
SELF_HOSTED_PORT="5432"
SELF_HOSTED_USER="postgres"
SELF_HOSTED_PASSWORD="your-super-secret-password"  # From docker-compose.yml
SELF_HOSTED_DB="postgres"
INPUT_DIR="./migration_data"

# Database connection string
DB_URL="postgresql://${SELF_HOSTED_USER}:${SELF_HOSTED_PASSWORD}@${SELF_HOSTED_HOST}:${SELF_HOSTED_PORT}/${SELF_HOSTED_DB}"

echo "=== AcademyOS CRM Data Import ==="
echo "Host: ${SELF_HOSTED_HOST}:${SELF_HOSTED_PORT}"
echo "Input: ${INPUT_DIR}"
echo ""

# =============================================
# PRE-IMPORT: Verify schema exists
# =============================================

echo "=== Verifying schema ==="
TABLE_COUNT=$(psql "${DB_URL}" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';")

if [ "${TABLE_COUNT}" -lt 50 ]; then
  echo "ERROR: Schema not fully created. Run complete-schema.sql first!"
  echo "Found ${TABLE_COUNT} tables, expected 100+"
  exit 1
fi

echo "Schema verified: ${TABLE_COUNT} tables found"

# =============================================
# STEP 1: Import auth.users FIRST
# =============================================

echo ""
echo "=== Step 1: Importing auth.users ==="

if [ -f "${INPUT_DIR}/auth_users.sql" ]; then
  # Disable triggers temporarily for import
  psql "${DB_URL}" -c "SET session_replication_role = 'replica';"
  
  psql "${DB_URL}" -f "${INPUT_DIR}/auth_users.sql"
  
  # Re-enable triggers
  psql "${DB_URL}" -c "SET session_replication_role = 'origin';"
  
  echo "auth.users imported successfully"
else
  echo "WARNING: auth_users.sql not found, skipping..."
fi

# =============================================
# STEP 2: Add FK constraints to auth.users
# =============================================

echo ""
echo "=== Step 2: Adding FK constraints to auth.users ==="

psql "${DB_URL}" -f "add-auth-foreign-keys.sql"

# =============================================
# STEP 3: Import public schema data
# =============================================

echo ""
echo "=== Step 3: Importing public data ==="

if [ -f "${INPUT_DIR}/public_data.sql" ]; then
  # Disable triggers and FK checks for bulk import
  psql "${DB_URL}" <<EOF
SET session_replication_role = 'replica';
\i ${INPUT_DIR}/public_data.sql
SET session_replication_role = 'origin';
EOF
  
  echo "public data imported successfully"
else
  echo "WARNING: public_data.sql not found, trying CSV import..."
  
  # Import from CSV files in correct order
  IMPORT_ORDER=(
    "organizations"
    "currencies"
    "absence_reasons"
    "age_categories"
    "proficiency_levels"
    "subjects"
    "learning_types"
    "learning_formats"
    "lead_sources"
    "lead_statuses"
    "client_statuses"
    "student_statuses"
    "subscription_plans"
    "organization_branches"
    "profiles"
    "user_roles"
    "classrooms"
    "courses"
    "textbooks"
    "course_units"
    "teachers"
    "clients"
    "students"
    "learning_groups"
    "group_students"
    "lesson_sessions"
    "student_attendance"
    "payments"
    "balance_transactions"
    "subscriptions"
    "chat_messages"
    "message_read_status"
    "global_chat_read_status"
  )
  
  # Disable triggers
  psql "${DB_URL}" -c "SET session_replication_role = 'replica';"
  
  for table in "${IMPORT_ORDER[@]}"; do
    if [ -f "${INPUT_DIR}/${table}.csv" ]; then
      echo "Importing ${table}..."
      psql "${DB_URL}" -c "\copy public.${table} FROM '${INPUT_DIR}/${table}.csv' WITH CSV HEADER"
    fi
  done
  
  # Re-enable triggers
  psql "${DB_URL}" -c "SET session_replication_role = 'origin';"
fi

# =============================================
# STEP 4: Import storage data
# =============================================

echo ""
echo "=== Step 4: Importing storage metadata ==="

if [ -f "${INPUT_DIR}/storage_data.sql" ]; then
  psql "${DB_URL}" -f "${INPUT_DIR}/storage_data.sql"
  echo "storage metadata imported"
fi

# =============================================
# STEP 5: Upload storage files
# =============================================

echo ""
echo "=== Step 5: Uploading storage files ==="

BUCKETS=(
  "avatars"
  "student-avatars"
  "chat-files"
  "documents"
  "branch-photos"
  "textbooks"
  "apps"
)

# Get Supabase URL and key from docker-compose
SUPABASE_URL="http://${SELF_HOSTED_HOST}:8000"
SUPABASE_KEY="your-anon-key"  # From docker-compose.yml ANON_KEY

for bucket in "${BUCKETS[@]}"; do
  if [ -d "${INPUT_DIR}/storage/${bucket}" ]; then
    echo "Uploading files to ${bucket}..."
    
    # Create bucket if not exists
    curl -X POST "${SUPABASE_URL}/storage/v1/bucket" \
      -H "Authorization: Bearer ${SUPABASE_KEY}" \
      -H "Content-Type: application/json" \
      -d "{\"id\": \"${bucket}\", \"name\": \"${bucket}\", \"public\": true}"
    
    # Upload files
    find "${INPUT_DIR}/storage/${bucket}" -type f | while read file; do
      filename=$(basename "$file")
      filepath=${file#"${INPUT_DIR}/storage/${bucket}/"}
      
      curl -X POST "${SUPABASE_URL}/storage/v1/object/${bucket}/${filepath}" \
        -H "Authorization: Bearer ${SUPABASE_KEY}" \
        -F "file=@${file}"
    done
  fi
done

# =============================================
# STEP 6: Run triggers and functions
# =============================================

echo ""
echo "=== Step 6: Applying triggers and functions ==="

psql "${DB_URL}" -f "03-triggers-functions.sql"

# =============================================
# STEP 7: Apply RLS policies
# =============================================

echo ""
echo "=== Step 7: Applying RLS policies ==="

psql "${DB_URL}" -f "07-rls-policies.sql"

# =============================================
# STEP 8: Verify import
# =============================================

echo ""
echo "=== Step 8: Verification ==="

psql "${DB_URL}" -f "verify-migration.sql"

# =============================================
# Summary
# =============================================

echo ""
echo "=== Import Complete ==="
echo ""
echo "Next steps:"
echo "1. Deploy Edge Functions: supabase functions deploy --project-ref YOUR_PROJECT"
echo "2. Set secrets: supabase secrets set OPENAI_API_KEY=xxx ..."
echo "3. Update webhook URLs in external services"
echo "4. Update client.ts in Lovable project with new Supabase URL"
echo "5. Test the application"
