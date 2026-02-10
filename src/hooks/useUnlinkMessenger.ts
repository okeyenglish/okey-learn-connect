import { useMutation, useQueryClient } from '@tanstack/react-query';
import { selfHostedPost } from '@/lib/selfHostedApi';
import { toast } from 'sonner';

interface UnlinkParams {
  clientId: string;
  messengerType: 'whatsapp' | 'telegram' | 'max';
  clientName?: string;
}

interface UnlinkResult {
  success: boolean;
  newClientId: string;
  newClientName: string;
  movedMessages: number;
}

export const useUnlinkMessenger = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clientId, messengerType }: UnlinkParams) => {
      const response = await selfHostedPost<UnlinkResult>('unlink-messenger', {
        clientId,
        messengerType,
      });

      if (!response.success || !response.data?.success) {
        const details = (response.data as any)?.details || '';
        const errorMsg = (response.data as any)?.error || response.error || 'Ошибка отвязки мессенджера';
        throw new Error(details ? `${errorMsg}: ${details}` : errorMsg);
      }

      return response.data;
    },
    onSuccess: (data, variables) => {
      const messengerLabel =
        variables.messengerType === 'whatsapp' ? 'WhatsApp' :
        variables.messengerType === 'telegram' ? 'Telegram' : 'MAX';

      toast.success(
        `${messengerLabel} отвязан. Создан клиент "${data.newClientName}" с ${data.movedMessages} сообщениями.`
      );

      // Invalidate all relevant caches
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
      queryClient.invalidateQueries({ queryKey: ['client', variables.clientId] });
      queryClient.invalidateQueries({ queryKey: ['family-group', variables.clientId] });
      queryClient.invalidateQueries({ queryKey: ['family-group'] });
    },
    onError: (error: Error) => {
      toast.error(`Не удалось отвязать мессенджер: ${error.message}`);
    },
  });
};
