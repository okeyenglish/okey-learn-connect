import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';

export type MessengerType = 'whatsapp' | 'telegram' | 'max';

export interface IntegrationStatus {
  isEnabled: boolean;
  isConfigured: boolean;
  provider?: string;
  errorMessage?: string;
}

export interface AllIntegrationsStatus {
  whatsapp: IntegrationStatus;
  telegram: IntegrationStatus;
  max: IntegrationStatus;
}

/**
 * Hook for checking messenger integration status before sending messages
 */
export const useMessengerIntegrationStatus = () => {
  
  const checkIntegrationStatus = useCallback(async (messengerType: MessengerType): Promise<IntegrationStatus> => {
    try {
      const { data, error } = await supabase
        .from('messenger_settings')
        .select('is_enabled, provider, settings')
        .eq('messenger_type', messengerType)
        .maybeSingle();

      if (error) {
        console.error(`Error checking ${messengerType} integration:`, error);
        return {
          isEnabled: false,
          isConfigured: false,
          errorMessage: 'Ошибка проверки настроек интеграции'
        };
      }

      if (!data) {
        return {
          isEnabled: false,
          isConfigured: false,
          errorMessage: getNotConfiguredMessage(messengerType)
        };
      }

      // Check if essential settings are configured
      const settings = data.settings as Record<string, any> | null;
      const isConfigured = checkIfConfigured(messengerType, data.provider, settings);

      if (!data.is_enabled) {
        return {
          isEnabled: false,
          isConfigured,
          provider: data.provider || undefined,
          errorMessage: getDisabledMessage(messengerType)
        };
      }

      if (!isConfigured) {
        return {
          isEnabled: data.is_enabled,
          isConfigured: false,
          provider: data.provider || undefined,
          errorMessage: getNotConfiguredMessage(messengerType)
        };
      }

      return {
        isEnabled: true,
        isConfigured: true,
        provider: data.provider || undefined
      };
    } catch (error) {
      console.error(`Error checking ${messengerType} integration:`, error);
      return {
        isEnabled: false,
        isConfigured: false,
        errorMessage: 'Ошибка проверки настроек интеграции'
      };
    }
  }, []);

  return { checkIntegrationStatus };
};

/**
 * Hook to get all messenger integration statuses at once (for tab indicators)
 */
export const useAllIntegrationsStatus = () => {
  return useQuery({
    queryKey: ['all-integrations-status'],
    queryFn: async (): Promise<AllIntegrationsStatus> => {
      const defaultStatus: IntegrationStatus = {
        isEnabled: false,
        isConfigured: false
      };

      try {
        const { data, error } = await supabase
          .from('messenger_settings')
          .select('messenger_type, is_enabled, provider, settings')
          .in('messenger_type', ['whatsapp', 'telegram', 'max']);

        if (error) {
          console.error('Error fetching integration statuses:', error);
          return {
            whatsapp: defaultStatus,
            telegram: defaultStatus,
            max: defaultStatus
          };
        }

        const result: AllIntegrationsStatus = {
          whatsapp: defaultStatus,
          telegram: defaultStatus,
          max: defaultStatus
        };

        for (const row of data || []) {
          const messengerType = row.messenger_type as MessengerType;
          const settings = row.settings as Record<string, any> | null;
          const isConfigured = checkIfConfigured(messengerType, row.provider, settings);

          result[messengerType] = {
            isEnabled: row.is_enabled || false,
            isConfigured,
            provider: row.provider || undefined
          };
        }

        return result;
      } catch (error) {
        console.error('Error fetching integration statuses:', error);
        return {
          whatsapp: defaultStatus,
          telegram: defaultStatus,
          max: defaultStatus
        };
      }
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false
  });
};

function checkIfConfigured(messengerType: MessengerType, provider: string | null, settings: Record<string, any> | null): boolean {
  if (!settings) return false;

  switch (messengerType) {
    case 'whatsapp':
      if (provider === 'wappi') {
        return !!(settings.wappiProfileId && settings.wappiApiToken);
      } else if (provider === 'wpp') {
        return !!(settings.wppBaseUrl && settings.wppApiKey);
      } else {
        // Green API
        return !!(settings.instanceId && settings.apiToken);
      }
    case 'telegram':
      return !!(settings.botToken || settings.wappiProfileId);
    case 'max':
      return !!(settings.instanceId && settings.apiToken);
    default:
      return false;
  }
}

function getDisabledMessage(messengerType: MessengerType): string {
  const names: Record<MessengerType, string> = {
    whatsapp: 'WhatsApp',
    telegram: 'Telegram',
    max: 'MAX'
  };
  return `Интеграция ${names[messengerType]} отключена. Включите её в настройках администратора.`;
}

function getNotConfiguredMessage(messengerType: MessengerType): string {
  const names: Record<MessengerType, string> = {
    whatsapp: 'WhatsApp',
    telegram: 'Telegram',
    max: 'MAX'
  };
  return `Интеграция ${names[messengerType]} не настроена. Настройте её в панели администратора.`;
}
