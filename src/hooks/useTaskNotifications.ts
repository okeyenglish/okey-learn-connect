import { useSendMessage } from './useChatMessages';

export const useTaskNotifications = () => {
  const sendMessage = useSendMessage();

  const normalizeMessengerType = (t?: string) => {
    // chat_messages.messenger_type is enum on self-hosted;
    // avoid invalid values like "calls" which would break INSERT.
    const allowed = new Set(['whatsapp', 'telegram', 'max', 'chatos', 'email']);
    if (t && allowed.has(t)) return t;
    return 'whatsapp';
  };

  const sendTaskCreatedNotification = async (
    clientId: string, 
    taskTitle: string, 
    dueDate: string,
    taskId?: string,
    responsible?: string,
    messengerType?: string
  ) => {
    console.log('Sending task created notification to client:', clientId);
    try {
      await sendMessage.mutateAsync({
        clientId,
        messageText: `Задача "${taskTitle}" создана на ${dueDate}`,
        messageType: 'system',
        messengerType: normalizeMessengerType(messengerType),
        metadata: {
          type: 'task_notification',
          action: 'created',
          task_id: taskId,
          task_title: taskTitle,
          due_date: dueDate,
          responsible
        }
      });
      console.log('Task created notification sent successfully');
    } catch (error) {
      console.error('Error sending task created notification:', error);
    }
  };

  const sendTaskCompletedNotification = async (
    clientId: string, 
    taskTitle: string,
    taskId?: string,
    responsible?: string,
    messengerType?: string
  ) => {
    try {
      await sendMessage.mutateAsync({
        clientId,
        messageText: `Задача "${taskTitle}" успешно завершена`,
        messageType: 'system',
        messengerType: normalizeMessengerType(messengerType),
        metadata: {
          type: 'task_notification',
          action: 'completed',
          task_id: taskId,
          task_title: taskTitle,
          responsible
        }
      });
    } catch (error) {
      console.error('Error sending task completed notification:', error);
    }
  };

  const sendTaskCancelledNotification = async (
    clientId: string, 
    taskTitle: string,
    taskId?: string,
    responsible?: string,
    messengerType?: string
  ) => {
    try {
      await sendMessage.mutateAsync({
        clientId,
        messageText: `Задача "${taskTitle}" отменена`,
        messageType: 'system',
        messengerType: normalizeMessengerType(messengerType),
        metadata: {
          type: 'task_notification',
          action: 'cancelled',
          task_id: taskId,
          task_title: taskTitle,
          responsible
        }
      });
    } catch (error) {
      console.error('Error sending task cancelled notification:', error);
    }
  };

  return {
    sendTaskCreatedNotification,
    sendTaskCompletedNotification,
    sendTaskCancelledNotification
  };
};
