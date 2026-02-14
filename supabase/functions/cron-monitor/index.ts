import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import { corsHeaders } from '../_shared/types.ts';

/**
 * Cron Monitor — queries pg_cron tables on self-hosted Supabase
 * Returns job list and recent run details
 */

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const selfHostedUrl = Deno.env.get('SELF_HOSTED_URL') || Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Connect directly to the self-hosted DB via PostgREST won't work for cron schema
    // We need to use the SUPABASE_DB_URL for direct SQL queries
    const dbUrl = Deno.env.get('SUPABASE_DB_URL');
    
    if (!dbUrl) {
      // Fallback: use supabase client with RPC if available
      const supabase = createClient(selfHostedUrl, serviceKey);
      
      // Try to call an RPC function
      const { data: jobs, error: jobsError } = await supabase.rpc('get_cron_jobs');
      
      if (jobsError) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'SUPABASE_DB_URL not configured and RPC not available. Run the migration SQL first.',
            hint: 'Set SUPABASE_DB_URL secret or create get_cron_jobs/get_cron_run_details RPC functions'
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const { data: runs } = await supabase.rpc('get_cron_run_details');
      
      return new Response(
        JSON.stringify({ success: true, jobs: jobs || [], runs: runs || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use pg driver for direct SQL access to cron schema
    const { default: postgres } = await import('https://deno.land/x/postgresjs@v3.4.5/mod.js');
    const sql = postgres(dbUrl, { max: 1 });

    try {
      // Get all cron jobs
      const jobs = await sql`
        SELECT 
          jobid,
          jobname,
          schedule,
          active,
          command
        FROM cron.job
        ORDER BY jobname
      `;

      // Get recent run details (last 100)
      const runs = await sql`
        SELECT 
          runid,
          jobid,
          job_name,
          status,
          return_message,
          start_time,
          end_time,
          EXTRACT(EPOCH FROM (end_time - start_time)) as duration_seconds
        FROM cron.job_run_details
        ORDER BY start_time DESC
        LIMIT 100
      `;

      // Calculate stats per job
      const jobStats = await sql`
        SELECT 
          job_name,
          COUNT(*) as total_runs,
          COUNT(*) FILTER (WHERE status = 'succeeded') as succeeded,
          COUNT(*) FILTER (WHERE status = 'failed') as failed,
          MAX(start_time) as last_run,
          AVG(EXTRACT(EPOCH FROM (end_time - start_time))) as avg_duration_seconds
        FROM cron.job_run_details
        WHERE start_time > NOW() - INTERVAL '24 hours'
        GROUP BY job_name
        ORDER BY job_name
      `;

      await sql.end();

      return new Response(
        JSON.stringify({ 
          success: true, 
          jobs, 
          runs,
          stats: jobStats,
          timestamp: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (dbError) {
      await sql.end();
      throw dbError;
    }

  } catch (error) {
    console.error('[cron-monitor] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
