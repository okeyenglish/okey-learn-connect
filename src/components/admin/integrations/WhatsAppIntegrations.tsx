import React from 'react';
import { MessageSquare } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { IntegrationsList, SettingsFieldConfig } from './IntegrationsList';
import { WppQuickConnect } from './WppQuickConnect';

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
    description: 'Быстрое подключение в один клик' 
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
  // WPP Connect - no manual fields needed (auto-provisioning)
];

export const WhatsAppIntegrations: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Quick Connect Card for WPP */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <MessageSquare className="h-6 w-6 text-green-600" />
            <div>
              <CardTitle>Быстрое подключение WhatsApp</CardTitle>
              <CardDescription>
                Подключите WhatsApp в один клик — просто отсканируйте QR-код
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <WppQuickConnect />
        </CardContent>
      </Card>

      {/* Standard integrations list for other providers */}
      <IntegrationsList
        messengerType="whatsapp"
        title="Другие WhatsApp провайдеры"
        description="Green API, Wappi.pro и другие"
        icon={<MessageSquare className="h-6 w-6 text-green-600" />}
        providerOptions={whatsappProviders.filter(p => p.value !== 'wpp')}
        settingsFields={whatsappFields}
      />
    </div>
  );
};
