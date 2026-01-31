import { useState, useCallback } from 'react';
import { selfHostedPost } from '@/lib/selfHostedApi';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface PickupResult {
  success: boolean;
  message: string;
  data?: any;
}

/**
 * Hook for picking up/redirecting calls via OnlinePBX API
 * Used as fallback when WebRTC is not available
 */
export const useCallPickup = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Pickup/redirect an incoming call to the current user's extension
   */
  const pickupCall = useCallback(async (callId: string): Promise<boolean> => {
    if (!user?.id) {
      toast({
        title: 'Ошибка',
        description: 'Пользователь не авторизован',
        variant: 'destructive',
      });
      return false;
    }

    setIsLoading(true);
    try {
      console.log('[useCallPickup] Picking up call:', callId);
      
      const response = await selfHostedPost<PickupResult>('onlinepbx-pickup', {
        action: 'pickup',
        user_id: user.id,
        call_id: callId,
      });

      if (response.success && response.data?.success) {
        toast({
          title: 'Звонок перехвачен',
          description: 'Звонок переведён на ваш внутренний номер',
        });
        return true;
      } else {
        const errorMsg = response.data?.message || response.error || 'Неизвестная ошибка';
        toast({
          title: 'Ошибка перехвата',
          description: errorMsg,
          variant: 'destructive',
        });
        return false;
      }
    } catch (error) {
      console.error('[useCallPickup] Error:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось перехватить звонок',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, toast]);

  /**
   * Transfer an active call to another extension
   */
  const transferCall = useCallback(async (callId: string, targetExtension: string): Promise<boolean> => {
    if (!user?.id) {
      toast({
        title: 'Ошибка',
        description: 'Пользователь не авторизован',
        variant: 'destructive',
      });
      return false;
    }

    setIsLoading(true);
    try {
      console.log('[useCallPickup] Transferring call:', callId, 'to', targetExtension);
      
      const response = await selfHostedPost<PickupResult>('onlinepbx-pickup', {
        action: 'transfer',
        user_id: user.id,
        call_id: callId,
        target_extension: targetExtension,
      });

      if (response.success && response.data?.success) {
        toast({
          title: 'Звонок переведён',
          description: `Звонок переведён на ${targetExtension}`,
        });
        return true;
      } else {
        const errorMsg = response.data?.message || response.error || 'Неизвестная ошибка';
        toast({
          title: 'Ошибка перевода',
          description: errorMsg,
          variant: 'destructive',
        });
        return false;
      }
    } catch (error) {
      console.error('[useCallPickup] Transfer error:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось перевести звонок',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, toast]);

  return {
    pickupCall,
    transferCall,
    isLoading,
  };
};
