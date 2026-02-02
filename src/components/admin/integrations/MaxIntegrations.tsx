import React from 'react';
import { MessageSquare } from 'lucide-react';
import { IntegrationsList, SettingsFieldConfig } from './IntegrationsList';

// MAX provider options
const maxProviders = [
  { 
    value: 'green_api', 
    label: 'Green API for VK Teams', 
    description: 'Интеграция через Green API' 
  },
];

// MAX settings fields
const maxFields: SettingsFieldConfig[] = [
  {
    key: 'instanceId',
    label: 'ID Инстанса',
    type: 'text',
    placeholder: '1101234567',
    helpText: 'ID инстанса Green API для VK Teams',
    required: true,
  },
  {
    key: 'apiToken',
    label: 'API Token',
    type: 'password',
    placeholder: '••••••••••••••••••••••••••••••••',
    helpText: 'Токен авторизации Green API',
    required: true,
  },
];

export const MaxIntegrations: React.FC = () => {
  return (
    <IntegrationsList
      messengerType="max"
      title="MAX (VK Teams) аккаунты"
      description="Управление подключенными аккаунтами VK Teams"
      icon={<MessageSquare className="h-6 w-6 text-purple-600" />}
      providerOptions={maxProviders}
      settingsFields={maxFields}
    />
  );
};
