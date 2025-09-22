import { useSendMessage } from './useChatMessages';

export const useTaskNotifications = () => {
  const sendMessage = useSendMessage();

  const sendTaskCreatedNotification = async (clientId: string, taskTitle: string, dueDate: string) => {
    console.log('Sending task created notification to client:', clientId);
    try {
      await sendMessage.mutateAsync({
        clientId,
        messageText: `Задача "${taskTitle}" создана на ${dueDate}`,
        messageType: 'system'
      });
      console.log('Task created notification sent successfully');
    } catch (error) {
      console.error('Error sending task created notification:', error);
    }
  };

  const sendTaskCompletedNotification = async (clientId: string, taskTitle: string) => {
    try {
      await sendMessage.mutateAsync({
        clientId,
        messageText: `Задача "${taskTitle}" успешно завершена`,
        messageType: 'system'
      });
    } catch (error) {
      console.error('Error sending task completed notification:', error);
    }
  };

  const sendTaskCancelledNotification = async (clientId: string, taskTitle: string) => {
    try {
      await sendMessage.mutateAsync({
        clientId,
        messageText: `Задача "${taskTitle}" отменена`,
        messageType: 'system'
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