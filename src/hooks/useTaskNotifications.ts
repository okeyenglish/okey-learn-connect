import { useSendMessage } from './useChatMessages';

export const useTaskNotifications = () => {
  const sendMessage = useSendMessage();

  const sendTaskCreatedNotification = async (
    clientId: string, 
    taskTitle: string, 
    dueDate: string,
    taskId?: string,
    responsible?: string
  ) => {
    console.log('Sending task created notification to client:', clientId);
    try {
      await sendMessage.mutateAsync({
        clientId,
        messageText: `Задача "${taskTitle}" создана на ${dueDate}`,
        messageType: 'system',
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
    responsible?: string
  ) => {
    try {
      await sendMessage.mutateAsync({
        clientId,
        messageText: `Задача "${taskTitle}" успешно завершена`,
        messageType: 'system',
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
    responsible?: string
  ) => {
    try {
      await sendMessage.mutateAsync({
        clientId,
        messageText: `Задача "${taskTitle}" отменена`,
        messageType: 'system',
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
