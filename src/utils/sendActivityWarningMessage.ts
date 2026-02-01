import { supabase } from '@/integrations/supabase/client';

const ACTIVITY_WARNING_SENT_KEY = 'activity_warning_message_sent';

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
 * Генерирует мотивационное сообщение от AI помощника
 */
const generateWarningMessage = (activityPercentage: number): string => {
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? 'утро' : hour < 17 ? 'день' : 'вечер';
  
  return `👋 Привет! Заметила, что твоя активность сегодня составляет **${activityPercentage}%** — это ниже оптимального уровня.

Давай посмотрим, что можно сделать прямо сейчас:

📋 **Незакрытые задачи**
У тебя могут быть клиенты с задачами, которые ждут завершения сегодня. Проверь список дел — возможно, там есть срочные пункты.

💬 **Неотвеченные сообщения**
Клиенты ценят быстрые ответы. Загляни в чаты — там могут быть вопросы, на которые легко ответить прямо сейчас.

📈 **План продаж**
Помни о своих целях на ${timeOfDay === 'вечер' ? 'сегодня' : 'этот ' + timeOfDay}. Каждый контакт с клиентом — это шаг к выполнению плана.

🎯 **Совет дня**
Попробуй метод "2 минуты": если задача занимает меньше 2 минут — сделай её сразу. Это отлично поднимает продуктивность!

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
    
    // Генерируем сообщение
    const content = generateWarningMessage(Math.round(activityPercentage));
    
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
