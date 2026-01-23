import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, MessageCircle, Send, Bot, Sparkles } from 'lucide-react';
import { WhatsAppSettings } from './WhatsAppSettings';
import { MaxGreenApiSettings } from './MaxGreenApiSettings';
import { TelegramWappiSettings } from './TelegramWappiSettings';
import { SalebotSettings } from './SalebotSettings';
import { OpenAISettings } from './OpenAISettings';
import { WebhookUrlReset } from './WebhookUrlReset';

export const MessengersSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('whatsapp');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <MessageSquare className="h-7 w-7 text-primary" />
        <div>
          <h2 className="text-2xl font-bold">Мессенджеры</h2>
          <p className="text-muted-foreground">
            Настройки интеграций с мессенджерами для общения с клиентами
          </p>
        </div>
      </div>

      {/* Webhook URL Reset utility */}
      <WebhookUrlReset />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 lg:w-[600px]">
          <TabsTrigger value="whatsapp" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-green-600" />
            <span className="hidden sm:inline">WhatsApp</span>
          </TabsTrigger>
          <TabsTrigger value="telegram" className="flex items-center gap-2">
            <Send className="h-4 w-4 text-blue-500" />
            <span className="hidden sm:inline">Telegram</span>
          </TabsTrigger>
          <TabsTrigger value="salebot" className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-orange-500" />
            <span className="hidden sm:inline">Salebot</span>
          </TabsTrigger>
          <TabsTrigger value="max" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-purple-500" />
            <span className="hidden sm:inline">MAX</span>
          </TabsTrigger>
          <TabsTrigger value="openai" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-500" />
            <span className="hidden sm:inline">OpenAI</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="whatsapp" className="mt-6">
          <WhatsAppSettings />
        </TabsContent>

        <TabsContent value="telegram" className="mt-6">
          <TelegramWappiSettings />
        </TabsContent>

        <TabsContent value="salebot" className="mt-6">
          <SalebotSettings />
        </TabsContent>

        <TabsContent value="max" className="mt-6">
          <MaxGreenApiSettings />
        </TabsContent>

        <TabsContent value="openai" className="mt-6">
          <OpenAISettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};
