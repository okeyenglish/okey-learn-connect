import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import { 
  corsHeaders, 
  successResponse, 
  errorResponse,
  getErrorMessage,
  handleCors,
  type HealthCheckResponse,
  type HealthCheckEndpoint 
} from '../_shared/types.ts';

// Critical functions to monitor - OPTIMIZED: Only essential webhooks and core messaging
// Reduced from 12 to 8 functions to lower CPU usage
const CRITICAL_FUNCTIONS = [
  'salebot-webhook',       // CRM automation
  'wappi-whatsapp-webhook',// WhatsApp incoming
  'telegram-webhook',      // Telegram incoming  
  'onlinepbx-webhook',     // Telephony
  'tbank-webhook',         // Payments
  'process-events',        // Event bus
];

// All functions to check (for full report)
const ALL_FUNCTIONS = [
  'admin-reset-password',
  'ai-consultant',
  'ask',
  'auto-payment-notifications',
  'bbb-meeting',
  'chat-with-ai',
  'create-student-test-data',
  'create-teacher-rooms',
  'create-teacher-test-data',
  'delete-whatsapp-message',
  'download-whatsapp-file',
  'edit-whatsapp-message',
  'generate-app',
  'generate-call-summary',
  'generate-delayed-gpt-response',
  'generate-gpt-response',
  'generate-image',
  'generate-mini-group-name',
  'get-ai-provider',
  'get-employees',
  'homework-suggestions',
  'import-holihope',
  'import-salebot-chats-auto',
  'import-salebot-chats',
  'import-salebot-ids-csv',
  'import-students',
  'improve-app',
  'index-content',
  'lesson-reminders',
  'manage-app',
  'max-channels',
  'max-check-availability',
  'max-delete',
  'max-edit',
  'max-get-avatar',
  'max-get-contact-info',
  'max-get-contacts',
  'max-send',
  'max-typing',
  'max-webhook',
  'onlinepbx-call',
  'onlinepbx-webhook',
  'openrouter-provisioner',
  'process-events',
  'publish-app',
  'request-callback',
  'salebot-stop',
  'salebot-webhook',
  'send-payment-notifications',
  'send-push-notification',
  'seo-analyze-page',
  'seo-auto-cluster',
  'seo-check-tokens',
  'seo-collect-wordstat',
  'seo-create-brief',
  'seo-enrich-clusters',
  'seo-generate-content',
  'seo-import-gsc',
  'seo-indexnow',
  'seo-reoptimize-page',
  'seo-suggest-ideas',
  'seo-wordstat',
  'seo-yandex-export',
  'seo-yandex-info',
  'set-ai-provider',
  'sitemap',
  'sla-monitor',
  'suggest-or-generate',
  'sync-auto-groups',
  'sync-single-auto-group',
  'tbank-init-client',
  'tbank-init',
  'tbank-status',
  'tbank-webhook',
  'teacher-assistant',
  'telegram-channels',
  'telegram-get-avatar',
  'telegram-get-contact-info',
  'telegram-send',
  'telegram-webhook',
  'test-onlinepbx',
  'test-vertex-ai',
  'transcribe-audio',
  'voice-assistant',
  'wappi-whatsapp-delete',
  'wappi-whatsapp-download',
  'wappi-whatsapp-edit',
  'wappi-whatsapp-send',
  'wappi-whatsapp-status',
  'wappi-whatsapp-webhook',
  'webhook-proxy',
  'whatsapp-check-availability',
  'whatsapp-get-avatar',
  'whatsapp-get-contact-info',
  'whatsapp-get-contacts',
  'whatsapp-send',
  'whatsapp-typing',
  'whatsapp-webhook',
  'wpp-delete',
  'wpp-diagnostics',
  'wpp-disconnect',
  'wpp-download',
  'wpp-edit',
  'wpp-send',
  'wpp-start',
  'wpp-status',
  'wpp-webhook',
];

interface HealthCheckResult {
  function_name: string;
  status: 'healthy' | 'unhealthy' | 'timeout';
  response_time_ms: number;
  http_status?: number;
  error?: string;
}

console.log('[edge-health-monitor] Function booted');

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://api.academyos.ru';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const telegramBotToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const telegramAlertChatId = Deno.env.get('TELEGRAM_ALERT_CHAT_ID');

    if (!supabaseServiceKey) {
      throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body for options
    let checkMode = 'critical'; // 'critical' or 'all'
    let sendAlerts = true;
    
    try {
      const body = await req.json();
      checkMode = body.mode || 'critical';
      sendAlerts = body.alerts !== false;
    } catch {
      // No body or invalid JSON, use defaults
    }

    const functionsToCheck = checkMode === 'all' ? ALL_FUNCTIONS : CRITICAL_FUNCTIONS;
    const baseUrl = `${supabaseUrl}/functions/v1`;

    console.log(`[edge-health-monitor] Checking ${functionsToCheck.length} functions (mode: ${checkMode})`);

    const results: HealthCheckResult[] = [];
    const unhealthyFunctions: HealthCheckResult[] = [];

    // OPTIMIZED: Reduced batch size to 5 and timeout to 5s to lower CPU spikes
    const batchSize = 5;
    for (let i = 0; i < functionsToCheck.length; i += batchSize) {
      const batch = functionsToCheck.slice(i, i + batchSize);
      
      // Add small delay between batches to spread CPU load
      if (i > 0) {
        await new Promise(r => setTimeout(r, 100));
      }
      
      const batchResults = await Promise.all(
        batch.map(async (funcName): Promise<HealthCheckResult> => {
          const startTime = Date.now();
          
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // Reduced to 5s timeout

            const response = await fetch(`${baseUrl}/${funcName}`, {
              method: 'OPTIONS', // Use OPTIONS as lightweight health check
              headers: {
                'Authorization': `Bearer ${supabaseServiceKey}`,
              },
              signal: controller.signal,
            });

            clearTimeout(timeoutId);
            const responseTime = Date.now() - startTime;

            // Consider 2xx and 405 (Method Not Allowed) as healthy
            // 405 means the function is running but doesn't support OPTIONS
            const isHealthy = response.ok || response.status === 405 || response.status === 400;

            return {
              function_name: funcName,
              status: isHealthy ? 'healthy' : 'unhealthy',
              response_time_ms: responseTime,
              http_status: response.status,
            };
          } catch (error) {
            const responseTime = Date.now() - startTime;
            const isTimeout = error.name === 'AbortError';

            return {
              function_name: funcName,
              status: isTimeout ? 'timeout' : 'unhealthy',
              response_time_ms: responseTime,
              error: String(error),
            };
          }
        })
      );

      results.push(...batchResults);
      
      // Collect unhealthy functions
      unhealthyFunctions.push(...batchResults.filter(r => r.status !== 'healthy'));
    }

    // Calculate stats
    const healthyCount = results.filter(r => r.status === 'healthy').length;
    const unhealthyCount = results.filter(r => r.status === 'unhealthy').length;
    const timeoutCount = results.filter(r => r.status === 'timeout').length;
    const avgResponseTime = Math.round(
      results.reduce((sum, r) => sum + r.response_time_ms, 0) / results.length
    );

    console.log(`[edge-health-monitor] Results: ${healthyCount} healthy, ${unhealthyCount} unhealthy, ${timeoutCount} timeout`);

    // Send Telegram alert if there are issues
    if (sendAlerts && unhealthyFunctions.length > 0 && telegramBotToken && telegramAlertChatId) {
      const alertMessage = formatTelegramAlert(unhealthyFunctions, healthyCount, results.length);
      
      try {
        await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: telegramAlertChatId,
            text: alertMessage,
            parse_mode: 'HTML',
          }),
        });
        console.log('[edge-health-monitor] Telegram alert sent');
      } catch (telegramError) {
        console.error('[edge-health-monitor] Failed to send Telegram alert:', telegramError);
      }
    }

    // Log to database for history
    try {
      await supabase.from('edge_function_health_logs').insert({
        checked_at: new Date().toISOString(),
        mode: checkMode,
        total_functions: results.length,
        healthy_count: healthyCount,
        unhealthy_count: unhealthyCount,
        timeout_count: timeoutCount,
        avg_response_time_ms: avgResponseTime,
        unhealthy_functions: unhealthyFunctions.map(f => f.function_name),
        details: results,
      });
    } catch (dbError) {
      // Table might not exist yet, that's ok
      console.log('[edge-health-monitor] Could not log to database:', dbError);
    }

    const response: HealthCheckResponse = {
      success: true,
      checked_at: new Date().toISOString(),
      duration_ms: avgResponseTime,
      summary: {
        total: results.length,
        healthy: healthyCount,
        unhealthy: unhealthyCount + timeoutCount,
      },
    };
    
    return successResponse({
      ...response,
      mode: checkMode,
      unhealthy_functions: unhealthyFunctions,
      all_results: checkMode === 'all' ? results : undefined,
    });

  } catch (error: unknown) {
    console.error('[edge-health-monitor] Error:', error);
    return errorResponse(getErrorMessage(error), 500);
  }
});

function formatTelegramAlert(unhealthy: HealthCheckResult[], healthyCount: number, total: number): string {
  const lines = [
    `🚨 <b>Edge Functions Alert</b>`,
    ``,
    `⚠️ ${unhealthy.length} of ${total} functions have issues:`,
    ``,
  ];

  for (const func of unhealthy.slice(0, 10)) { // Limit to 10 to avoid message too long
    const icon = func.status === 'timeout' ? '⏱️' : '❌';
    const statusText = func.status === 'timeout' ? 'Timeout' : `HTTP ${func.http_status}`;
    lines.push(`${icon} <code>${func.function_name}</code> - ${statusText} (${func.response_time_ms}ms)`);
  }

  if (unhealthy.length > 10) {
    lines.push(`... and ${unhealthy.length - 10} more`);
  }

  lines.push(``);
  lines.push(`✅ ${healthyCount} functions healthy`);
  lines.push(`🕐 ${new Date().toISOString()}`);

  return lines.join('\n');
}
