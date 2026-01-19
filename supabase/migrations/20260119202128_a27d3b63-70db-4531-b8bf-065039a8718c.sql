-- Fix the enqueue_teacher_openrouter_job function to use first_name and last_name instead of non-existent 'name' field
CREATE OR REPLACE FUNCTION enqueue_teacher_openrouter_job()
RETURNS trigger AS $$
BEGIN
  INSERT INTO ai_key_provision_jobs(
    teacher_id,
    entity_name,
    provider,
    monthly_limit,
    reset_policy
  )
  VALUES (
    NEW.id,
    COALESCE(NULLIF(TRIM(COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, '')), ''), 'Teacher'),
    'openrouter',
    50,
    'daily'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;