# OpenRouter Provisioner Edge Function

Automatically provisions OpenRouter API keys for organizations and teachers using the Provisioning API.

## Features

- 🔄 Queue-based processing with retry logic
- 🔒 Service-role only access (keys stored securely)
- ⏱️ Rate limiting (~1 req/sec to respect OpenRouter limits)
- 🔁 Exponential backoff for failed jobs
- 📊 Batch processing (5 jobs per invocation)

## Environment Variables

Set these in Supabase Dashboard → Edge Functions → Secrets:

```bash
OPENROUTER_PROVISIONING_KEY=sk-or-prov-xxxxx
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
OR_BATCH_SIZE=5          # Optional, default: 5
OR_DELAY_MS=1100         # Optional, default: 1100 (1.1 seconds)
```

## Deployment

```bash
supabase functions deploy openrouter-provisioner --no-verify-jwt
```

## Setup Cron Job

The function should be invoked every minute to process the queue:

```sql
SELECT cron.schedule(
  'openrouter-provisioner-every-minute',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/openrouter-provisioner',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  ) AS request_id;
  $$
);
```

Or use Supabase CLI:

```bash
supabase functions schedule create \
  --project-ref YOUR_PROJECT_REF \
  --name openrouter-provisioner-cron \
  --cron "* * * * *" \
  --endpoint /functions/v1/openrouter-provisioner
```

## How It Works

1. **Triggers**: When an organization or teacher is created, a trigger automatically creates a job in `ai_key_provision_jobs`
2. **Queue Processing**: This function runs every minute, dequeuing up to 5 jobs
3. **Key Creation**: For each job, creates a key via OpenRouter Provisioning API
4. **Storage**: Saves the key to `ai_provider_keys` (only accessible via service_role)
5. **Retry Logic**: Failed jobs are retried with exponential backoff (max 8 attempts)

## Limits

- **Organizations**: 200 requests/day per key
- **Teachers**: 50 requests/day per key
- **Reset Policy**: Daily by default

## Monitoring

Check job status:

```sql
SELECT * FROM ai_key_provision_jobs 
ORDER BY created_at DESC 
LIMIT 20;
```

Check provisioned keys:

```sql
SELECT * FROM v_ai_provider_keys_public
ORDER BY created_at DESC
LIMIT 20;
```

## Manual Testing

Trigger manually:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/openrouter-provisioner \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

## Troubleshooting

### Rate Limits
If you hit OpenRouter rate limits (429), the jobs will automatically retry with exponential backoff.

### Failed Jobs
Check `last_error` in `ai_key_provision_jobs` table for failed jobs.

### No Keys Generated
1. Check that `OPENROUTER_PROVISIONING_KEY` is set correctly
2. Verify cron job is running
3. Check function logs in Supabase Dashboard
