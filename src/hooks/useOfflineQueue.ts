import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from './use-toast';

interface QueuedAction {
  id: string;
  type: 'attendance' | 'homework' | 'message' | 'complete_lesson';
  payload: any;
  timestamp: number;
  retries: number;
}

const QUEUE_KEY = 'offline_actions_queue';
const MAX_RETRIES = 3;

/**
 * Хук для управления офлайн-очередью действий
 * Сохраняет действия локально и синхронизирует при восстановлении сети
 */
export const useOfflineQueue = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queue, setQueue] = useState<QueuedAction[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Загрузка очереди из localStorage
  useEffect(() => {
    const loadQueue = () => {
      try {
        const stored = localStorage.getItem(QUEUE_KEY);
        if (stored) {
          setQueue(JSON.parse(stored));
        }
      } catch (error) {
        console.error('Failed to load offline queue:', error);
      }
    };

    loadQueue();
  }, []);

  // Сохранение очереди в localStorage
  const saveQueue = (newQueue: QueuedAction[]) => {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(newQueue));
      setQueue(newQueue);
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  };

  // Отслеживание статуса сети
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: 'Соединение восстановлено',
        description: 'Синхронизация данных...',
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: 'Нет соединения',
        description: 'Действия будут синхронизированы при восстановлении сети',
        variant: 'destructive',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  // Синхронизация при восстановлении сети
  useEffect(() => {
    if (isOnline && queue.length > 0 && !isSyncing) {
      syncQueue();
    }
  }, [isOnline, queue.length]);

  // Добавление действия в очередь
  const enqueue = (type: QueuedAction['type'], payload: any) => {
    const action: QueuedAction = {
      id: `${type}_${Date.now()}_${Math.random()}`,
      type,
      payload,
      timestamp: Date.now(),
      retries: 0,
    };

    const newQueue = [...queue, action];
    saveQueue(newQueue);

    // Если онлайн, сразу пытаемся отправить
    if (isOnline) {
      syncQueue();
    }
  };

  // Синхронизация очереди
  const syncQueue = async () => {
    if (isSyncing || queue.length === 0) return;

    setIsSyncing(true);

    const remainingQueue: QueuedAction[] = [];

    for (const action of queue) {
      try {
        await processAction(action);
        // Успех - не добавляем в остаток
      } catch (error) {
        console.error(`Failed to process action ${action.type}:`, error);
        
        if (action.retries < MAX_RETRIES) {
          remainingQueue.push({
            ...action,
            retries: action.retries + 1,
          });
        } else {
          toast({
            title: 'Ошибка синхронизации',
            description: `Не удалось синхронизировать: ${action.type}`,
            variant: 'destructive',
          });
        }
      }
    }

    saveQueue(remainingQueue);
    setIsSyncing(false);

    if (remainingQueue.length === 0) {
      toast({
        title: 'Синхронизация завершена',
        description: 'Все данные успешно сохранены',
      });
      queryClient.invalidateQueries();
    }
  };

  // Обработка отдельного действия
  const processAction = async (action: QueuedAction) => {
    // Здесь должна быть реальная логика отправки на сервер
    // Для примера просто имитируем задержку
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // TODO: Реализовать отправку на сервер в зависимости от типа действия
    console.log('Processing action:', action);
  };

  return {
    isOnline,
    queue,
    queueLength: queue.length,
    enqueue,
    isSyncing,
  };
};