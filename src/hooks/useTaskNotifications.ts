import { useSendMessage } from './useChatMessages';

export const useTaskNotifications = () => {
  const sendMessage = useSendMessage();

  const sendTaskCompletedNotification = async (clientId: string, taskTitle: string) => {
    try {
      await sendMessage.mutateAsync({
        clientId,
        messageText: `Задача "${taskTitle}" успешно завершена`,
        messageType: 'manager'
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
        messageType: 'manager'
      });
    } catch (error) {
      console.error('Error sending task cancelled notification:', error);
    }
  };

  return {
    sendTaskCompletedNotification,
    sendTaskCancelledNotification
  };
};