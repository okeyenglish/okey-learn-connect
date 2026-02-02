import React from 'react';
import { Send } from 'lucide-react';
import { IntegrationsList, SettingsFieldConfig } from './IntegrationsList';

// Telegram provider options
const telegramProviders = [
  { 
    value: 'wappi', 
    label: 'Wappi.pro User API', 
    description: 'Интеграция через Wappi.pro' 
  },
];

// Telegram settings fields
const telegramFields: SettingsFieldConfig[] = [
  {
    key: 'profileId',
    label: 'Profile ID',
    type: 'text',
    placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    helpText: 'ID Telegram профиля из личного кабинета Wappi.pro',
    required: true,
  },
  {
    key: 'apiToken',
    label: 'API Token',
    type: 'password',
    placeholder: '••••••••••••••••••••••••••••••••',
    helpText: 'Токен авторизации из настроек Wappi.pro',
    required: true,
  },
];

export const TelegramIntegrations: React.FC = () => {
  return (
    <IntegrationsList
      messengerType="telegram"
      title="Telegram аккаунты"
      description="Управление подключенными аккаунтами Telegram"
      icon={<Send className="h-6 w-6 text-blue-500" />}
      providerOptions={telegramProviders}
      settingsFields={telegramFields}
    />
  );
};
