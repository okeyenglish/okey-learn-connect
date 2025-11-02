-- OpenRouter Provisioning System
-- Tables for managing AI keys per organization and teacher

-- AI keys for organizations and teachers
CREATE TABLE IF NOT EXISTS ai_provider_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('openrouter', 'gateway')),
  key_label TEXT,
  key_value TEXT NOT NULL,  -- Only accessible via service_role
  key_preview TEXT,         -- Masked version: sk-or-abc...xyz
  limit_monthly INTEGER,
  limit_remaining INTEGER,
  reset_policy TEXT CHECK (reset_policy IN ('daily', 'weekly', 'monthly')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT one_owner CHECK (
    (organization_id IS NOT NULL AND teacher_id IS NULL) OR
    (organization_id IS NULL AND teacher_id IS NOT NULL)
  )
);

CREATE INDEX idx_ai_keys_org ON ai_provider_keys(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX idx_ai_keys_teacher ON ai_provider_keys(teacher_id) WHERE teacher_id IS NOT NULL;
CREATE INDEX idx_ai_keys_provider ON ai_provider_keys(provider, status);

-- Job queue for provisioning keys
CREATE TABLE IF NOT EXISTS ai_key_provision_jobs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
  entity_name TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('openrouter')),
  monthly_limit INTEGER NOT NULL DEFAULT 50,
  reset_policy TEXT NOT NULL DEFAULT 'daily' CHECK (reset_policy IN ('daily', 'weekly', 'monthly')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'done', 'failed', 'retry')),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 8,
  last_error TEXT,
  run_after TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT one_entity CHECK (
    (organization_id IS NOT NULL AND teacher_id IS NULL) OR
    (organization_id IS NULL AND teacher_id IS NOT NULL)
  )
);

CREATE INDEX idx_provision_jobs_status ON ai_key_provision_jobs(status, run_after);
CREATE INDEX idx_provision_jobs_org ON ai_key_provision_jobs(organization_id) WHERE organization_id IS NOT NULL;

-- Function to dequeue a job (with locking)
CREATE OR REPLACE FUNCTION dequeue_ai_key_job()
RETURNS TABLE(
  id BIGINT,
  organization_id UUID,
  teacher_id UUID,
  entity_name TEXT,
  monthly_limit INTEGER,
  reset_policy TEXT
)
LANGUAGE SQL
AS $$
  WITH j AS (
    SELECT *
    FROM ai_key_provision_jobs
    WHERE status IN ('queued', 'retry') AND run_after <= NOW()
    ORDER BY created_at
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  UPDATE ai_key_provision_jobs s
  SET status = 'running',
      attempts = s.attempts + 1,
      updated_at = NOW()
  FROM j
  WHERE s.id = j.id
  RETURNING j.id, j.organization_id, j.teacher_id, j.entity_name, j.monthly_limit, j.reset_policy;
$$;

-- Mark job as complete
CREATE OR REPLACE FUNCTION complete_ai_key_job(p_id BIGINT)
RETURNS VOID
LANGUAGE SQL
AS $$
  UPDATE ai_key_provision_jobs
  SET status = 'done',
      updated_at = NOW()
  WHERE id = p_id;
$$;

-- Mark job as failed with backoff
CREATE OR REPLACE FUNCTION fail_ai_key_job(
  p_id BIGINT,
  p_error TEXT,
  p_backoff_seconds INTEGER
)
RETURNS VOID
LANGUAGE PLPGSQL
AS $$
BEGIN
  UPDATE ai_key_provision_jobs
  SET status = CASE
    WHEN attempts >= max_attempts THEN 'failed'
    ELSE 'retry'
  END,
  last_error = LEFT(COALESCE(p_error, 'unknown'), 2000),
  run_after = NOW() + MAKE_INTERVAL(secs => GREATEST(5, p_backoff_seconds)),
  updated_at = NOW()
  WHERE id = p_id;
END;
$$;

-- Trigger: Create job when organization is created
CREATE OR REPLACE FUNCTION enqueue_org_openrouter_job()
RETURNS TRIGGER
LANGUAGE PLPGSQL
AS $$
BEGIN
  INSERT INTO ai_key_provision_jobs(
    organization_id,
    entity_name,
    provider,
    monthly_limit,
    reset_policy
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.name, 'Organization'),
    'openrouter',
    200,  -- Organizations get higher limit
    'daily'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enqueue_org_openrouter ON organizations;
CREATE TRIGGER trg_enqueue_org_openrouter
AFTER INSERT ON organizations
FOR EACH ROW
EXECUTE FUNCTION enqueue_org_openrouter_job();

-- Trigger: Create job when teacher is created
CREATE OR REPLACE FUNCTION enqueue_teacher_openrouter_job()
RETURNS TRIGGER
LANGUAGE PLPGSQL
AS $$
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
    COALESCE(NEW.name, 'Teacher'),
    'openrouter',
    50,  -- Teachers get standard limit
    'daily'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enqueue_teacher_openrouter ON teachers;
CREATE TRIGGER trg_enqueue_teacher_openrouter
AFTER INSERT ON teachers
FOR EACH ROW
EXECUTE FUNCTION enqueue_teacher_openrouter_job();

-- RLS Policies
ALTER TABLE ai_provider_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_key_provision_jobs ENABLE ROW LEVEL SECURITY;

-- Only service role can access keys table (contains sensitive data)
DROP POLICY IF EXISTS p_ai_keys_service ON ai_provider_keys;
CREATE POLICY p_ai_keys_service ON ai_provider_keys
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Only service role can manage jobs
DROP POLICY IF EXISTS p_provision_jobs_service ON ai_key_provision_jobs;
CREATE POLICY p_provision_jobs_service ON ai_key_provision_jobs
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Public view for admins (without sensitive key_value)
CREATE OR REPLACE VIEW v_ai_provider_keys_public AS
SELECT
  id,
  organization_id,
  teacher_id,
  provider,
  key_label,
  key_preview,
  limit_monthly,
  limit_remaining,
  reset_policy,
  status,
  created_at,
  updated_at
FROM ai_provider_keys;

-- Grant access to view for authenticated users in their org
CREATE OR REPLACE FUNCTION can_view_ai_keys()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT has_role(auth.uid(), 'admin'::app_role);
$$;

COMMENT ON TABLE ai_provider_keys IS 'Stores OpenRouter API keys for organizations and teachers';
COMMENT ON TABLE ai_key_provision_jobs IS 'Queue for automatic OpenRouter key provisioning';
COMMENT ON FUNCTION dequeue_ai_key_job() IS 'Dequeues next job for processing with row-level locking';