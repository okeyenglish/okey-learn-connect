import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/typedClient';

export type MessengerType = 'whatsapp' | 'telegram' | 'max';

export interface IntegrationStatus {
  isEnabled: boolean;
  isConfigured: boolean;
  provider?: string;
  errorMessage?: string;
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
