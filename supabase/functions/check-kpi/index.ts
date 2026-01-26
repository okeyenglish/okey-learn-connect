import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import { corsHeaders, successResponse, errorResponse, handleCors, getErrorMessage } from '../_shared/types.ts';

interface KpiSettings {
  profile_id: string;
  organization_id: string;
  min_call_score: number;
  min_calls_per_day: number;
  min_answered_rate: number;
}

interface ManagerStats {
  manager_id: string;
  manager_name: string;
  total_calls: number;
  answered_calls: number;
  avg_score: number;
}

serve(async (req) => {
  console.log('Check KPI function called:', req.method);
  
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables');
      return errorResponse('Configuration error', 500);
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all KPI settings
    const { data: kpiSettings, error: kpiError } = await supabase
      .from('manager_kpi_settings')
      .select('*');

    if (kpiError) {
      console.error('Error fetching KPI settings:', kpiError);
      throw kpiError;
    }

    if (!kpiSettings || kpiSettings.length === 0) {
      return successResponse({ message: 'No KPI settings configured', checked: 0 });
    }

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const notifications: Array<{
      profile_id: string;
      organization_id: string;
      notification_type: string;
      message: string;
      current_value: number;
      threshold_value: number;
    }> = [];

    for (const settings of kpiSettings as KpiSettings[]) {
      // Get manager's calls for today
      const { data: calls, error: callsError } = await supabase
        .from('call_logs')
        .select('id, status, ai_evaluation')
        .eq('manager_id', settings.profile_id)
        .gte('started_at', today.toISOString())
        .lt('started_at', tomorrow.toISOString());

      if (callsError) {
        console.error('Error fetching calls for manager:', settings.profile_id, callsError);
        continue;
      }

      const totalCalls = calls?.length || 0;
      const answeredCalls = calls?.filter(c => c.status === 'answered').length || 0;
      const answeredRate = totalCalls > 0 ? answeredCalls / totalCalls : 0;

      // Calculate average score from AI evaluations
      const scoresArray = calls
        ?.filter(c => c.ai_evaluation && typeof c.ai_evaluation === 'object')
        .map(c => (c.ai_evaluation as { overall_score?: number }).overall_score)
        .filter((s): s is number => typeof s === 'number') || [];
      
      const avgScore = scoresArray.length > 0 
        ? scoresArray.reduce((a, b) => a + b, 0) / scoresArray.length 
        : 0;

      // Get manager's name
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', settings.profile_id)
        .single();

      const managerName = profile 
        ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') 
        : 'Менеджер';

      // Check if we already sent a notification today
      const { data: existingNotifications } = await supabase
        .from('kpi_notifications')
        .select('notification_type')
        .eq('profile_id', settings.profile_id)
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString());

      const alreadyNotified = new Set(existingNotifications?.map(n => n.notification_type) || []);

      // Check low score
      if (scoresArray.length > 0 && avgScore < settings.min_call_score && !alreadyNotified.has('low_score')) {
        notifications.push({
          profile_id: settings.profile_id,
          organization_id: settings.organization_id,
          notification_type: 'low_score',
          message: `${managerName}: средняя оценка звонков (${avgScore.toFixed(1)}) ниже целевой (${settings.min_call_score})`,
          current_value: parseFloat(avgScore.toFixed(1)),
          threshold_value: settings.min_call_score,
        });
      }

      // Check low calls (only after work hours, e.g., 17:00)
      const currentHour = new Date().getHours();
      if (currentHour >= 17 && totalCalls < settings.min_calls_per_day && !alreadyNotified.has('low_calls')) {
        notifications.push({
          profile_id: settings.profile_id,
          organization_id: settings.organization_id,
          notification_type: 'low_calls',
          message: `${managerName}: количество звонков (${totalCalls}) ниже дневной нормы (${settings.min_calls_per_day})`,
          current_value: totalCalls,
          threshold_value: settings.min_calls_per_day,
        });
      }

      // Check low answered rate
      if (totalCalls >= 5 && answeredRate < settings.min_answered_rate && !alreadyNotified.has('low_answered_rate')) {
        notifications.push({
          profile_id: settings.profile_id,
          organization_id: settings.organization_id,
          notification_type: 'low_answered_rate',
          message: `${managerName}: процент отвеченных звонков (${Math.round(answeredRate * 100)}%) ниже целевого (${Math.round(settings.min_answered_rate * 100)}%)`,
          current_value: Math.round(answeredRate * 100),
          threshold_value: Math.round(settings.min_answered_rate * 100),
        });
      }
    }

    // Insert notifications
    if (notifications.length > 0) {
      const { error: insertError } = await supabase
        .from('kpi_notifications')
        .insert(notifications);

      if (insertError) {
        console.error('Error inserting notifications:', insertError);
        throw insertError;
      }

      console.log(`Created ${notifications.length} KPI notifications`);
    }

    return successResponse({
      success: true,
      checked: kpiSettings.length,
      notifications_created: notifications.length,
    });

  } catch (error: unknown) {
    console.error('Check KPI error:', error);
    return errorResponse(getErrorMessage(error), 500);
  }
});
