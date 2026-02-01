import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Self-hosted API configuration for push notifications AND database
const SELF_HOSTED_URL = 'https://api.academyos.ru';
const SELF_HOSTED_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzY5MDg4ODgzLCJleHAiOjE5MjY3Njg4ODN9.WEsCyaCdQvxzVObedC-A9hWTJUSwI_p9nCG1wlbaNEg';
const SELF_HOSTED_SERVICE_KEY = Deno.env.get("SELF_HOSTED_SERVICE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
  data?: Record<string, unknown>;
}

interface SendPushParams {
  userId?: string;
  userIds?: string[];
  payload: PushPayload;
}

async function sendPushNotification(params: SendPushParams): Promise<{ success: boolean; sent?: number; failed?: number; error?: string }> {
  console.log('[task-reminders] Sending push to:', params.userId || params.userIds);
  
  try {
    const response = await fetch(`${SELF_HOSTED_URL}/functions/v1/send-push-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SELF_HOSTED_ANON_KEY}`,
      },
      body: JSON.stringify(params),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('[task-reminders] Push failed:', data.error);
      return { success: false, error: String(data.error || `HTTP ${response.status}`) };
    }

    return { success: true, sent: data.sent || 0, failed: data.failed || 0 };
  } catch (error) {
    console.error('[task-reminders] Push exception:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

interface TaskWithAssignee {
  id: string;
  title: string;
  due_date: string;
  due_time: string | null;
  priority: string;
  assignee_id: string;
}

interface UserTaskGroup {
  userId: string;
  overdueTasks: TaskWithAssignee[];
  todayTasks: TaskWithAssignee[];
}

function formatTaskList(tasks: TaskWithAssignee[], max: number = 3): string {
  const shown = tasks.slice(0, max);
  const remaining = tasks.length - max;
  
  const lines = shown.map(t => {
    const priority = t.priority === 'urgent' ? '🔴' : t.priority === 'high' ? '🟠' : '';
    return `• ${priority}${t.title}`;
  });
  
  if (remaining > 0) {
    lines.push(`... и ещё ${remaining}`);
  }
  
  return lines.join('\n');
}

function getPluralForm(n: number, forms: [string, string, string]): string {
  const n10 = n % 10;
  const n100 = n % 100;
  
  if (n10 === 1 && n100 !== 11) return forms[0];
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return forms[1];
  return forms[2];
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`\n[${requestId}] ========== TASK REMINDERS ==========`);
  console.log(`[${requestId}] Timestamp: ${new Date().toISOString()}`);

  try {
    // Initialize Supabase with self-hosted credentials (staff_tasks table is on self-hosted)
    const supabase = createClient(SELF_HOSTED_URL, SELF_HOSTED_SERVICE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayDate = today.toISOString().split('T')[0];
    
    console.log(`[${requestId}] Checking for tasks with due_date <= ${todayDate}`);

    // Fetch overdue tasks (due_date < today)
    const { data: overdueTasks, error: overdueError } = await supabase
      .from('staff_tasks')
      .select('id, title, due_date, due_time, priority, assignee_id')
      .in('status', ['pending', 'in_progress'])
      .lt('due_date', todayDate)
      .order('due_date', { ascending: true });

    if (overdueError) {
      console.error(`[${requestId}] Error fetching overdue tasks:`, overdueError);
      throw overdueError;
    }

    // Fetch today's tasks
    const { data: todayTasks, error: todayError } = await supabase
      .from('staff_tasks')
      .select('id, title, due_date, due_time, priority, assignee_id')
      .in('status', ['pending', 'in_progress'])
      .eq('due_date', todayDate)
      .order('due_time', { ascending: true });

    if (todayError) {
      console.error(`[${requestId}] Error fetching today tasks:`, todayError);
      throw todayError;
    }

    console.log(`[${requestId}] Found: ${overdueTasks?.length || 0} overdue, ${todayTasks?.length || 0} today`);

    // Group tasks by assignee
    const userGroups = new Map<string, UserTaskGroup>();

    for (const task of (overdueTasks || []) as TaskWithAssignee[]) {
      if (!task.assignee_id) continue;
      
      if (!userGroups.has(task.assignee_id)) {
        userGroups.set(task.assignee_id, {
          userId: task.assignee_id,
          overdueTasks: [],
          todayTasks: [],
        });
      }
      userGroups.get(task.assignee_id)!.overdueTasks.push(task);
    }

    for (const task of (todayTasks || []) as TaskWithAssignee[]) {
      if (!task.assignee_id) continue;
      
      if (!userGroups.has(task.assignee_id)) {
        userGroups.set(task.assignee_id, {
          userId: task.assignee_id,
          overdueTasks: [],
          todayTasks: [],
        });
      }
      userGroups.get(task.assignee_id)!.todayTasks.push(task);
    }

    console.log(`[${requestId}] Users with tasks: ${userGroups.size}`);

    // Send push notifications
    let totalSent = 0;
    let totalFailed = 0;
    const results: Array<{ userId: string; sent: number; failed: number; error?: string }> = [];

    for (const [userId, group] of userGroups) {
      const overdueCount = group.overdueTasks.length;
      const todayCount = group.todayTasks.length;

      // Skip if no actionable tasks
      if (overdueCount === 0 && todayCount === 0) continue;

      // Build notification content
      let title: string;
      let body: string;
      let icon: string;

      if (overdueCount > 0) {
        // Priority: overdue tasks
        const taskWord = getPluralForm(overdueCount, ['задача', 'задачи', 'задач']);
        title = `🚨 ${overdueCount} просроченн${overdueCount === 1 ? 'ая' : 'ых'} ${taskWord}`;
        body = formatTaskList(group.overdueTasks);
        icon = '🚨';
      } else {
        // Today's tasks reminder
        const taskWord = getPluralForm(todayCount, ['задача', 'задачи', 'задач']);
        title = `📋 ${todayCount} ${taskWord} на сегодня`;
        body = formatTaskList(group.todayTasks);
        icon = '📋';
      }

      console.log(`[${requestId}] Sending to ${userId}: ${overdueCount} overdue, ${todayCount} today`);

      const pushResult = await sendPushNotification({
        userId,
        payload: {
          title,
          body,
          icon,
          tag: `task-reminder-${userId}`,
          url: '/crm?tab=tasks',
          data: {
            type: 'task_reminder',
            overdueCount,
            todayCount,
          },
        },
      });

      results.push({
        userId,
        sent: pushResult.sent || 0,
        failed: pushResult.failed || 0,
        error: pushResult.error,
      });

      totalSent += pushResult.sent || 0;
      totalFailed += pushResult.failed || 0;
    }

    console.log(`[${requestId}] ✅ Complete: ${totalSent} sent, ${totalFailed} failed`);
    console.log(`[${requestId}] ========== END ==========\n`);

    return new Response(
      JSON.stringify({
        success: true,
        usersNotified: userGroups.size,
        totalOverdueTasks: overdueTasks?.length || 0,
        totalTodayTasks: todayTasks?.length || 0,
        pushResults: {
          sent: totalSent,
          failed: totalFailed,
        },
        details: results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error(`[${requestId}] ❌ Error:`, error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
