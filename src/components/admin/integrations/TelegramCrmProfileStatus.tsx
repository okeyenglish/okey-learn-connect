import React, { useState, useEffect } from 'react';
import { Activity, Power, PowerOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { selfHostedPost } from '@/lib/selfHostedApi';
import { useToast } from '@/hooks/use-toast';

interface ProfileInfo {
  phone: string;
  status: 'online' | 'offline' | 'starting' | 'stopping' | 'error';
  connected?: boolean;
}

interface ProfilesResponse {
  success: boolean;
  data?: Array<{ phone?: string; status?: string }>;
  error?: string;
}

interface TelegramCrmProfileStatusProps {
  phone: string;
  onStatusChange?: (status: ProfileInfo['status']) => void;
}

export const TelegramCrmProfileStatus: React.FC<TelegramCrmProfileStatusProps> = ({
  phone,
  onStatusChange,
}) => {
  const { toast } = useToast();
  const [status, setStatus] = useState<ProfileInfo['status']>('offline');
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // Check profile status on mount
  useEffect(() => {
    checkStatus();
  }, [phone]);

  const checkStatus = async () => {
    setIsChecking(true);
    try {
      const response = await selfHostedPost<ProfilesResponse>('telegram-crm-profiles', {
        action: 'list',
      });

      if (!response.success || response.data?.error) {
        console.error('Error checking profiles:', response.error || response.data?.error);
        setStatus('error');
        return;
      }

      const profiles = response.data?.data || [];
      const cleanPhone = phone.replace(/\D/g, '');
      
      // Find profile by phone number
      const profile = profiles.find((p) => 
        p.phone?.replace(/\D/g, '') === cleanPhone
      );

      if (profile) {
        const newStatus = profile.status === 'online' || profile.status === 'connected' 
          ? 'online' 
          : 'offline';
        setStatus(newStatus);
        onStatusChange?.(newStatus);
      } else {
        setStatus('offline');
        onStatusChange?.('offline');
      }
    } catch (error) {
      console.error('Error checking status:', error);
      setStatus('error');
    } finally {
      setIsChecking(false);
    }
  };

  const handleStart = async () => {
    setIsLoading(true);
    setStatus('starting');
    try {
      const response = await selfHostedPost<{ success: boolean; error?: string }>(
        'telegram-crm-profiles',
        { action: 'start', phone }
      );

      if (!response.success || response.data?.error) {
        throw new Error(response.error || response.data?.error || 'Ошибка запуска профиля');
      }

      setStatus('online');
      onStatusChange?.('online');
      toast({
        title: 'Успешно',
        description: 'Профиль запущен',
      });
    } catch (error) {
      console.error('Error starting profile:', error);
      setStatus('error');
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось запустить профиль',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStop = async () => {
    setIsLoading(true);
    setStatus('stopping');
    try {
      const response = await selfHostedPost<{ success: boolean; error?: string }>(
        'telegram-crm-profiles',
        { action: 'stop', phone }
      );

      if (!response.success || response.data?.error) {
        throw new Error(response.error || response.data?.error || 'Ошибка остановки профиля');
      }

      setStatus('offline');
      onStatusChange?.('offline');
      toast({
        title: 'Успешно',
        description: 'Профиль остановлен',
      });
    } catch (error) {
      console.error('Error stopping profile:', error);
      setStatus('error');
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось остановить профиль',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'online':
        return (
          <Badge variant="default" className="bg-green-500 hover:bg-green-600">
            <Activity className="h-3 w-3 mr-1" />
            Онлайн
          </Badge>
        );
      case 'offline':
        return (
          <Badge variant="secondary">
            <PowerOff className="h-3 w-3 mr-1" />
            Офлайн
          </Badge>
        );
      case 'starting':
        return (
          <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600">
            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            Запуск...
          </Badge>
        );
      case 'stopping':
        return (
          <Badge variant="secondary">
            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            Остановка...
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Ошибка
          </Badge>
        );
    }
  };

  return (
    <div className="flex items-center gap-2">
      {isChecking ? (
        <Badge variant="outline">
          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
          Проверка...
        </Badge>
      ) : (
        <>
          {getStatusBadge()}
          
          {status === 'offline' && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleStart}
              disabled={isLoading}
              className="h-7"
            >
              <Power className={cn("h-3 w-3 mr-1", isLoading && "animate-spin")} />
              Запустить
            </Button>
          )}
          
          {status === 'online' && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleStop}
              disabled={isLoading}
              className="h-7"
            >
              <PowerOff className={cn("h-3 w-3 mr-1", isLoading && "animate-spin")} />
              Остановить
            </Button>
          )}
          
          {status === 'error' && (
            <Button
              size="sm"
              variant="outline"
              onClick={checkStatus}
              disabled={isLoading}
              className="h-7"
            >
              <RefreshCw className={cn("h-3 w-3 mr-1", isLoading && "animate-spin")} />
              Обновить
            </Button>
          )}
        </>
      )}
    </div>
  );
};
