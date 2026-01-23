#!/bin/bash
# =============================================
# AcademyOS CRM - Data Export Script
# Export data from Supabase Cloud
# =============================================

# Configuration - UPDATE THESE VALUES
CLOUD_PROJECT_REF="kbojujfwtvmsgudumown"
CLOUD_DB_PASSWORD="YOUR_DB_PASSWORD"  # Get from Supabase Dashboard -> Settings -> Database
OUTPUT_DIR="./migration_data"

# Database connection string
CLOUD_DB_URL="postgresql://postgres.${CLOUD_PROJECT_REF}:${CLOUD_DB_PASSWORD}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"

# Create output directory
mkdir -p "${OUTPUT_DIR}"

echo "=== AcademyOS CRM Data Export ==="
echo "Project: ${CLOUD_PROJECT_REF}"
echo "Output: ${OUTPUT_DIR}"
echo ""

# =============================================
# OPTION 1: Export using pg_dump (recommended)
# =============================================

echo "=== Exporting with pg_dump ==="

# Export auth.users (schema + data)
echo "Exporting auth.users..."
pg_dump "${CLOUD_DB_URL}" \
  --schema=auth \
  --table=auth.users \
  --data-only \
  --no-owner \
  --no-privileges \
  > "${OUTPUT_DIR}/auth_users.sql"

# Export public schema data only (schema already created)
echo "Exporting public tables data..."
pg_dump "${CLOUD_DB_URL}" \
  --schema=public \
  --data-only \
  --no-owner \
  --no-privileges \
  --disable-triggers \
  > "${OUTPUT_DIR}/public_data.sql"

# Export storage.objects metadata
echo "Exporting storage metadata..."
pg_dump "${CLOUD_DB_URL}" \
  --schema=storage \
  --table=storage.objects \
  --table=storage.buckets \
  --data-only \
  --no-owner \
  --no-privileges \
  > "${OUTPUT_DIR}/storage_data.sql"

# =============================================
# OPTION 2: Export individual tables as CSV
# =============================================

echo ""
echo "=== Exporting tables as CSV (alternative) ==="

# Key tables to export
TABLES=(
  "organizations"
  "profiles"
  "user_roles"
  "clients"
  "students"
  "teachers"
  "learning_groups"
  "group_students"
  "lesson_sessions"
  "student_attendance"
  "payments"
  "balance_transactions"
  "chat_messages"
  "subscriptions"
)

for table in "${TABLES[@]}"; do
  echo "Exporting ${table}..."
  psql "${CLOUD_DB_URL}" -c "\copy public.${table} TO '${OUTPUT_DIR}/${table}.csv' WITH CSV HEADER"
done

# =============================================
# Export storage files using Supabase CLI
# =============================================

echo ""
echo "=== Exporting storage files ==="

# List of buckets to export
BUCKETS=(
  "avatars"
  "student-avatars"
  "chat-files"
  "documents"
  "branch-photos"
  "textbooks"
  "apps"
)

for bucket in "${BUCKETS[@]}"; do
  echo "Downloading files from ${bucket}..."
  mkdir -p "${OUTPUT_DIR}/storage/${bucket}"
  supabase storage download "${bucket}" "${OUTPUT_DIR}/storage/${bucket}" --project-ref "${CLOUD_PROJECT_REF}"
done

# =============================================
# Summary
# =============================================

echo ""
echo "=== Export Complete ==="
echo ""
echo "Exported files:"
ls -la "${OUTPUT_DIR}"
echo ""
echo "Next steps:"
echo "1. Review exported data"
echo "2. Start self-hosted Supabase"
echo "3. Run import-data.sh"
