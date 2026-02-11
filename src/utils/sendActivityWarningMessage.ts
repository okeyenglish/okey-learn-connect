import { supabase } from '@/integrations/supabase/client';

const ACTIVITY_WARNING_SENT_KEY = 'activity_warning_message_sent';

interface ActivityStats {
  unreadMessages: number;
  clientsWithUnread: number;
  newClientsToday: number;
  totalActiveChats: number;
  pendingTasks: number;
  overdueTasks: number;
  todayTasks: number;
}

/**
 * Проверяет, было ли уже отправлено предупреждение сегодня
 */
const wasWarningSentToday = (): boolean => {
  try {
    const stored = localStorage.getItem(ACTIVITY_WARNING_SENT_KEY);
    if (!stored) return false;
    
    const sentDate = new Date(stored).toDateString();
    const today = new Date().toDateString();
    return sentDate === today;
  } catch {
    return false;
  }
};

/**
 * Помечает, что предупреждение было отправлено сегодня
 */
const markWarningSent = () => {
  try {
    localStorage.setItem(ACTIVITY_WARNING_SENT_KEY, new Date().toISOString());
  } catch {
    // Ignore localStorage errors
  }
};

/**
 * Сбрасывает флаг отправки (для тестирования или нового дня)
 */
export const resetActivityWarningFlag = () => {
  try {
    localStorage.removeItem(ACTIVITY_WARNING_SENT_KEY);
  } catch {
    // Ignore
  }
};

/**
 * Получает реальную статистику из базы данных
 */
const fetchActivityStats = async (organizationId: string, userId: string): Promise<ActivityStats> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();
  const todayDate = today.toISOString().split('T')[0];
  
  // Параллельно получаем все данные
  const [unreadResult, clientsResult, newClientsResult, pendingTasksResult, overdueTasksResult, todayTasksResult] = await Promise.all([
    // Неотвеченные входящие сообщения (self-hosted: direction='incoming')
    supabase
      .from('chat_messages')
      .select('id, client_id', { count: 'exact' })
      .eq('organization_id', organizationId)
      .eq('direction', 'incoming')
      .eq('is_read', false),
    
    // Клиенты с непрочитанными сообщениями (уникальные)
    supabase
      .from('chat_messages')
      .select('client_id')
      .eq('organization_id', organizationId)
      .eq('direction', 'incoming')
      .eq('is_read', false)
      .not('client_id', 'is', null),
    
    // Новые клиенты за сегодня
    supabase
      .from('clients')
      .select('id', { count: 'exact' })
      .eq('organization_id', organizationId)
      .gte('created_at', todayIso),
    
    // Незавершённые задачи пользователя
    supabase
      .from('staff_tasks')
      .select('id', { count: 'exact' })
      .eq('assignee_id', userId)
      .in('status', ['pending', 'in_progress']),
    
    // Просроченные задачи (due_date < сегодня)
    supabase
      .from('staff_tasks')
      .select('id', { count: 'exact' })
      .eq('assignee_id', userId)
      .in('status', ['pending', 'in_progress'])
      .lt('due_date', todayDate),
    
    // Задачи на сегодня
    supabase
      .from('staff_tasks')
      .select('id', { count: 'exact' })
      .eq('assignee_id', userId)
      .eq('due_date', todayDate)
      .in('status', ['pending', 'in_progress']),
  ]);
  
  // Считаем уникальных клиентов с непрочитанными
  const uniqueClients = new Set(
    (clientsResult.data || []).map(m => m.client_id).filter(Boolean)
  );
  
  return {
    unreadMessages: unreadResult.count || 0,
    clientsWithUnread: uniqueClients.size,
    newClientsToday: newClientsResult.count || 0,
    totalActiveChats: uniqueClients.size,
    pendingTasks: pendingTasksResult.count || 0,
    overdueTasks: overdueTasksResult.count || 0,
    todayTasks: todayTasksResult.count || 0,
  };
};

/**
 * Генерирует мотивационное сообщение от AI помощника с реальными данными
 */
const generateWarningMessage = (activityPercentage: number, stats: ActivityStats): string => {
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? 'утро' : hour < 17 ? 'день' : 'вечер';
  
  // Формируем блоки в зависимости от данных
  const blocks: string[] = [];
  
  // Просроченные задачи (приоритет!)
  if (stats.overdueTasks > 0) {
    const taskWord = stats.overdueTasks === 1 ? 'задача' : 
      stats.overdueTasks < 5 ? 'задачи' : 'задач';
    blocks.push(`🚨 **Просроченные задачи**
У тебя **${stats.overdueTasks}** ${taskWord} с истёкшим сроком! Это требует немедленного внимания.`);
  }
  
  // Задачи на сегодня
  if (stats.todayTasks > 0) {
    const taskWord = stats.todayTasks === 1 ? 'задача' : 
      stats.todayTasks < 5 ? 'задачи' : 'задач';
    blocks.push(`📋 **Задачи на сегодня**
На сегодня запланировано **${stats.todayTasks}** ${taskWord}. Не забудь их выполнить!`);
  }
  
  // Незавершённые задачи
  if (stats.pendingTasks > 0 && stats.pendingTasks !== stats.todayTasks) {
    blocks.push(`✅ **Незавершённые задачи**
Всего у тебя **${stats.pendingTasks}** активных задач. Проверь приоритеты!`);
  }
  
  // Неотвеченные сообщения
  if (stats.unreadMessages > 0) {
    const clientWord = stats.clientsWithUnread === 1 ? 'клиента' : 
      stats.clientsWithUnread < 5 ? 'клиентов' : 'клиентов';
    blocks.push(`💬 **Неотвеченные сообщения**
У тебя **${stats.unreadMessages}** непрочитанных сообщений от **${stats.clientsWithUnread}** ${clientWord}. Клиенты ждут ответа — это отличная возможность продвинуться!`);
  } else {
    blocks.push(`💬 **Сообщения**
Отлично! Все сообщения прочитаны. Но не забывай проверять чаты — новые могут появиться в любой момент.`);
  }
  
  // Новые клиенты
  if (stats.newClientsToday > 0) {
    blocks.push(`🆕 **Новые клиенты сегодня**
За сегодня появилось **${stats.newClientsToday}** новых клиентов. Познакомься с ними и узнай их потребности!`);
  }
  
  // План продаж (всегда показываем)
  blocks.push(`📈 **План продаж**
Помни о своих целях на ${timeOfDay === 'вечер' ? 'сегодня' : 'этот ' + timeOfDay}. Каждый контакт с клиентом — это шаг к выполнению плана.`);
  
  // Совет дня
  const tips = [
    'Попробуй метод "2 минуты": если задача занимает меньше 2 минут — сделай её сразу.',
    'Начни с самой важной задачи — остальное пойдёт легче.',
    'Сделай один звонок прямо сейчас — это запустит продуктивный поток.',
    'Ответь на 3 сообщения подряд — маленькие победы мотивируют!',
    'Проверь последние лиды — возможно, там есть горячие клиенты.',
    'Закрой одну просроченную задачу — это снимет груз с плеч.',
  ];
  const randomTip = tips[Math.floor(Math.random() * tips.length)];
  blocks.push(`🎯 **Совет**
${randomTip}`);
  
  return `👋 Привет! Заметила, что твоя активность сегодня составляет **${activityPercentage}%** — давай это исправим!

${blocks.join('\n\n')}

Я верю в тебя! 💪 Если нужна помощь — просто напиши мне.`;
};

/**
 * Отправляет предупреждение о низкой активности от AI помощника
 * Отправляется только один раз в день
 */
export const sendActivityWarningMessage = async (activityPercentage: number): Promise<boolean> => {
  // Проверяем, отправляли ли уже сегодня
  if (wasWarningSentToday()) {
    console.log('[sendActivityWarningMessage] Warning already sent today, skipping');
    return false;
  }
  
  try {
    // Получаем текущего пользователя
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      console.warn('[sendActivityWarningMessage] No authenticated user');
      return false;
    }
    
    // Получаем профиль для organization_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();
    
    if (!profile?.organization_id) {
      console.warn('[sendActivityWarningMessage] No organization found for user');
      return false;
    }
    
    // Получаем реальную статистику
    const stats = await fetchActivityStats(profile.organization_id, user.id);
    console.log('[sendActivityWarningMessage] Stats fetched:', stats);
    
    // Генерируем сообщение с реальными данными
    const content = generateWarningMessage(Math.round(activityPercentage), stats);
    
    // Вставляем сообщение от ассистента
    const { error } = await supabase
      .from('assistant_messages')
      .insert({
        user_id: user.id,
        organization_id: profile.organization_id,
        role: 'assistant',
        content,
        is_read: false,
      });
    
    if (error) {
      console.error('[sendActivityWarningMessage] Failed to send message:', error);
      return false;
    }
    
    // Помечаем, что сообщение отправлено
    markWarningSent();
    
    console.log('[sendActivityWarningMessage] Activity warning message sent successfully');
    return true;
  } catch (error) {
    console.error('[sendActivityWarningMessage] Error:', error);
    return false;
  }
};
