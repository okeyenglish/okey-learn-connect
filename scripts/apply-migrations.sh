#!/bin/bash
# Migration runner with version tracking
# Usage: ./scripts/apply-migrations.sh [migrations_dir]

set -e

MIGRATIONS_DIR="${1:-/tmp/pending_migrations}"
DB_CONTAINER="supabase-db"
DB_USER="postgres"
DB_NAME="postgres"

echo "🔄 Starting migration runner..."
echo "📁 Migrations directory: $MIGRATIONS_DIR"

# Check if migrations directory exists
if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "⚠️ No migrations directory found at $MIGRATIONS_DIR"
  exit 0
fi

# Count migrations
MIGRATION_COUNT=$(ls -1 "$MIGRATIONS_DIR"/*.sql 2>/dev/null | wc -l)
if [ "$MIGRATION_COUNT" -eq 0 ]; then
  echo "✅ No SQL files to apply"
  exit 0
fi

echo "📦 Found $MIGRATION_COUNT migration files"

# Ensure migration tracking table exists
docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" << 'SQL'
CREATE TABLE IF NOT EXISTS public.schema_migrations (
  id SERIAL PRIMARY KEY,
  version VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(500),
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  applied_by VARCHAR(255) DEFAULT current_user,
  checksum VARCHAR(64),
  execution_time_ms INTEGER,
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT
);
SQL

# Process each migration in order
APPLIED=0
SKIPPED=0
FAILED=0

for migration_file in $(ls -1 "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort); do
  filename=$(basename "$migration_file")
  version="${filename%.*}"  # Remove .sql extension
  
  # Extract name from filename (after timestamp)
  name=$(echo "$filename" | sed 's/^[0-9]*_//' | sed 's/\.sql$//' | tr '_' ' ')
  
  # Calculate checksum
  checksum=$(md5sum "$migration_file" | awk '{print $1}')
  
  # Check if already applied
  already_applied=$(docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c \
    "SELECT EXISTS(SELECT 1 FROM public.schema_migrations WHERE version = '$version' AND success = TRUE);" | tr -d ' ')
  
  if [ "$already_applied" = "t" ]; then
    echo "⏭️  Skipping: $filename (already applied)"
    ((SKIPPED++))
    continue
  fi
  
  echo "🔧 Applying: $filename"
  start_time=$(date +%s%3N)
  
  # Apply migration
  if docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" < "$migration_file" 2>&1; then
    end_time=$(date +%s%3N)
    execution_time=$((end_time - start_time))
    
    # Record success
    docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" << SQL
      INSERT INTO public.schema_migrations (version, name, checksum, execution_time_ms, success)
      VALUES ('$version', '$name', '$checksum', $execution_time, TRUE)
      ON CONFLICT (version) DO UPDATE SET
        applied_at = NOW(),
        success = TRUE,
        execution_time_ms = $execution_time;
SQL
    
    echo "   ✅ Applied in ${execution_time}ms"
    ((APPLIED++))
  else
    error_msg="Migration failed"
    
    # Record failure
    docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" << SQL
      INSERT INTO public.schema_migrations (version, name, checksum, success, error_message)
      VALUES ('$version', '$name', '$checksum', FALSE, '$error_msg')
      ON CONFLICT (version) DO UPDATE SET
        applied_at = NOW(),
        success = FALSE,
        error_message = '$error_msg';
SQL
    
    echo "   ❌ Failed: $filename"
    ((FAILED++))
  fi
done

echo ""
echo "📊 Migration Summary:"
echo "   ✅ Applied: $APPLIED"
echo "   ⏭️  Skipped: $SKIPPED"
echo "   ❌ Failed:  $FAILED"

# Show recent migrations
echo ""
echo "📋 Recent migrations in database:"
docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c \
  "SELECT version, name, applied_at, CASE WHEN success THEN '✅' ELSE '❌' END as status 
   FROM public.schema_migrations ORDER BY applied_at DESC LIMIT 10;"

# Exit with error if any failed
if [ "$FAILED" -gt 0 ]; then
  exit 1
fi
