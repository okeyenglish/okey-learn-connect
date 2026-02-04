import React from 'react';
import { MessageSquare } from 'lucide-react';
import { IntegrationsList, SettingsFieldConfig } from './IntegrationsList';

// WhatsApp provider options
const whatsappProviders = [
  { 
    value: 'green_api', 
    label: 'Green API', 
    description: 'Облачный сервис, не требует своего сервера' 
  },
  { 
    value: 'wappi', 
    label: 'Wappi.pro', 
    description: 'Простой API, все типы медиа' 
  },
  { 
    value: 'wpp', 
    label: 'WPP Connect', 
    description: 'Self-hosted, полный контроль' 
  },
];

// WhatsApp settings fields
const whatsappFields: SettingsFieldConfig[] = [
  // Green API fields
  {
    key: 'instanceId',
    label: 'ID Инстанса',
    type: 'text',
    placeholder: '1101234567',
    required: true,
    showForProviders: ['green_api'],
  },
  {
    key: 'apiToken',
    label: 'API Token',
    type: 'password',
    placeholder: '••••••••••••••••••••••••••••••••',
    required: true,
    showForProviders: ['green_api'],
  },
  {
    key: 'apiUrl',
    label: 'API URL',
    type: 'url',
    placeholder: 'https://api.green-api.com',
    helpText: 'Оставьте пустым для использования по умолчанию',
    showForProviders: ['green_api'],
  },
  // Wappi fields
  {
    key: 'wappiProfileId',
    label: 'Profile ID',
    type: 'text',
    placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    helpText: 'ID профиля из личного кабинета Wappi.pro',
    required: true,
    showForProviders: ['wappi'],
  },
  {
    key: 'wappiApiToken',
    label: 'API Token',
    type: 'password',
    placeholder: '••••••••••••••••••••••••••••••••',
    helpText: 'Токен авторизации из настроек Wappi.pro',
    required: true,
    showForProviders: ['wappi'],
  },
  // WPP Connect fields (New API - msg.academyos.ru)
  {
    key: 'wppApiKey',
    label: 'API Key',
    type: 'password',
    placeholder: '••••••••••••••••••••••••••••••••',
    helpText: 'Уникальный API ключ вашей организации для WPP платформы',
    required: true,
    showForProviders: ['wpp'],
  },
  {
    key: 'wppAccountNumber',
    label: 'Номер WhatsApp',
    type: 'text',
    placeholder: '79990001122',
    helpText: 'Номер телефона WhatsApp аккаунта (только цифры)',
    required: true,
    showForProviders: ['wpp'],
  },
];

export const WhatsAppIntegrations: React.FC = () => {
  return (
    <IntegrationsList
      messengerType="whatsapp"
      title="WhatsApp аккаунты"
      description="Управление подключенными номерами WhatsApp"
      icon={<MessageSquare className="h-6 w-6 text-green-600" />}
      providerOptions={whatsappProviders}
      settingsFields={whatsappFields}
    />
  );
};
