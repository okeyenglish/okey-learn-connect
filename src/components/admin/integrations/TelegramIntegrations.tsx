import React from 'react';
import { Send } from 'lucide-react';
import { IntegrationsList, SettingsFieldConfig } from './IntegrationsList';

// Telegram provider options
const telegramProviders = [
  { 
    value: 'wappi', 
    label: 'Wappi.pro User API', 
    description: 'Интеграция через облачный сервис Wappi.pro' 
  },
  { 
    value: 'telegram_crm', 
    label: 'Telegram CRM (Self-Hosted)', 
    description: 'Собственный сервер с Telethon — полный контроль' 
  },
];

// Telegram settings fields - provider-specific fields use showForProviders
const telegramFields: SettingsFieldConfig[] = [
  // Wappi.pro fields
  {
    key: 'profileId',
    label: 'Profile ID',
    type: 'text',
    placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    helpText: 'ID Telegram профиля из личного кабинета Wappi.pro',
    required: true,
    showForProviders: ['wappi'],
  },
  {
    key: 'apiToken',
    label: 'API Token',
    type: 'password',
    placeholder: '••••••••••••••••••••••••••••••••',
    helpText: 'Токен авторизации из настроек Wappi.pro',
    required: true,
    showForProviders: ['wappi'],
  },
  // Telegram CRM (Self-Hosted) fields
  {
    key: 'crmApiUrl',
    label: 'API URL сервера',
    type: 'url',
    placeholder: 'https://telegram.academyos.ru',
    helpText: 'URL вашего FastAPI сервера с Telethon',
    required: true,
    showForProviders: ['telegram_crm'],
  },
  {
    key: 'crmApiKey',
    label: 'API Key',
    type: 'password',
    placeholder: '••••••••••••••••••••••••••••••••',
    helpText: 'Ключ авторизации для вашего сервера',
    required: true,
    showForProviders: ['telegram_crm'],
  },
  {
    key: 'crmPhoneNumber',
    label: 'Номер телефона Telegram',
    type: 'text',
    placeholder: '+79955073535',
    helpText: 'Номер телефона Telegram аккаунта на сервере',
    required: true,
    showForProviders: ['telegram_crm'],
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
