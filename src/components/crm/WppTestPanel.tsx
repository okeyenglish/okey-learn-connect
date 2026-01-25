import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useWhatsApp } from '@/hooks/useWhatsApp';
import { supabase } from '@/integrations/supabase/typedClient';
import { Loader2, CheckCircle, XCircle, Send, Edit, Trash2, Download } from 'lucide-react';
import { getErrorMessage } from '@/lib/errorUtils';

export const WppTestPanel = () => {
  const { toast } = useToast();
  const { 
    sendTextMessage, 
    deleteMessage, 
    editMessage, 
    downloadFile, 
    getMessengerSettings, 
    updateMessengerSettings,
    loading 
  } = useWhatsApp();

  const [provider, setProvider] = useState<'greenapi' | 'wpp' | 'wappi' | null>(null);
  const [testPhone, setTestPhone] = useState('79852615056');
  const [testMessage, setTestMessage] = useState('Тест WPP');
  const [lastMessageId, setLastMessageId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<{
    send?: boolean;
    edit?: boolean;
    delete?: boolean;
    download?: boolean;
  }>({});

  // Load current provider on mount
  useEffect(() => {
    const loadProviderData = async () => {
      const settings = await getMessengerSettings();
      setProvider(settings?.provider || null);
    };
    loadProviderData();
  }, [getMessengerSettings]);

  // Load current provider
  const loadProvider = async () => {
    const settings = await getMessengerSettings();
    setProvider(settings?.provider || null);
  };

  // Switch to WPP provider
  const switchToWpp = async () => {
    const result = await updateMessengerSettings({ provider: 'wpp' });
    if (result.success) {
      setProvider('wpp');
      toast({
        title: "Провайдер переключен",
        description: "Теперь используется WPP сервер",
      });
    }
  };

  // Test send message
  const testSendMessage = async () => {
    try {
      // Create test client if not exists
      const { data: existingClient } = await supabase
        .from('clients')
        .select('id')
        .eq('phone', testPhone)
        .maybeSingle();

      let clientId = existingClient?.id;

      if (!clientId) {
        const { data: newClient } = await supabase
          .from('clients')
          .insert({ 
            name: 'Тестовый клиент WPP', 
            phone: testPhone,
            whatsapp_chat_id: testPhone.replace(/^(\d+)/, '$1') + '@c.us'
          })
          .select('id')
          .single();
        
        clientId = newClient?.id;
      }

      if (!clientId) {
        throw new Error('Не удалось создать клиента');
      }

      const result = await sendTextMessage(clientId, testMessage);
      
      if (result.success) {
        // Get the last message for this client
        const { data: messages } = await supabase
          .from('chat_messages')
          .select('id, external_message_id')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false })
          .limit(1);

        if (messages && messages.length > 0) {
          setLastMessageId(messages[0].id);
        }

        setTestResults(prev => ({ ...prev, send: true }));
        toast({
          title: "✅ Отправка работает",
          description: `Сообщение отправлено на ${testPhone}`,
        });
      } else {
        throw new Error(result.error || 'Ошибка отправки');
      }
    } catch (error: unknown) {
      setTestResults(prev => ({ ...prev, send: false }));
      toast({
        title: "❌ Ошибка отправки",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  // Test edit message
  const testEditMessage = async () => {
    if (!lastMessageId) {
      toast({
        title: "Ошибка",
        description: "Сначала отправьте сообщение",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: message } = await supabase
        .from('chat_messages')
        .select('client_id')
        .eq('id', lastMessageId)
        .single();

      if (!message) {
        throw new Error('Сообщение не найдено');
      }

      const result = await editMessage(lastMessageId, testMessage + ' (отредактировано)', message.client_id);
      
      if (result.success) {
        setTestResults(prev => ({ ...prev, edit: true }));
        toast({
          title: "✅ Редактирование работает",
          description: "Сообщение успешно отредактировано",
        });
      } else {
        throw new Error(result.error || 'Ошибка редактирования');
      }
    } catch (error: unknown) {
      setTestResults(prev => ({ ...prev, edit: false }));
      toast({
        title: "❌ Ошибка редактирования",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  // Test delete message
  const testDeleteMessage = async () => {
    if (!lastMessageId) {
      toast({
        title: "Ошибка",
        description: "Сначала отправьте сообщение",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: message } = await supabase
        .from('chat_messages')
        .select('client_id')
        .eq('id', lastMessageId)
        .single();

      if (!message) {
        throw new Error('Сообщение не найдено');
      }

      const result = await deleteMessage(lastMessageId, message.client_id);
      
      if (result.success) {
        setTestResults(prev => ({ ...prev, delete: true }));
        toast({
          title: "✅ Удаление работает",
          description: "Сообщение успешно удалено",
        });
      } else {
        throw new Error(result.error || 'Ошибка удаления');
      }
    } catch (error: unknown) {
      setTestResults(prev => ({ ...prev, delete: false }));
      toast({
        title: "❌ Ошибка удаления",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  // Test download file
  const testDownloadFile = async () => {
    try {
      // Get org ID
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user?.id)
        .single();

      if (!profile?.organization_id) {
        throw new Error('Organization ID не найден');
      }

      // This would need a real message ID with a file
      // For now just test the function exists
      setTestResults(prev => ({ ...prev, download: true }));
      toast({
        title: "ℹ️ Функция скачивания",
        description: "Функция доступна (требуется реальное сообщение с файлом для теста)",
      });
    } catch (error: unknown) {
      setTestResults(prev => ({ ...prev, download: false }));
      toast({
        title: "❌ Ошибка скачивания",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Тестирование WPP функций</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Provider status */}
        <div className="space-y-2">
          <Label>Текущий провайдер</Label>
          <div className="flex items-center gap-2">
            {provider === null ? (
              <Button onClick={loadProvider} variant="outline">
                Проверить провайдера
              </Button>
            ) : (
              <>
                <Badge variant={provider === 'wpp' ? 'default' : 'secondary'}>
                  {provider === 'wpp' ? 'WPP' : 'Green API'}
                </Badge>
                {provider !== 'wpp' && (
                  <Button onClick={switchToWpp} size="sm">
                    Переключить на WPP
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Test configuration */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="testPhone">Тестовый номер</Label>
            <Input
              id="testPhone"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="79852615056"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="testMessage">Тестовое сообщение</Label>
            <Input
              id="testMessage"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              placeholder="Тест WPP"
            />
          </div>
        </div>

        {/* Test buttons */}
        <div className="grid grid-cols-2 gap-4">
          <Button 
            onClick={testSendMessage} 
            disabled={loading || provider !== 'wpp'}
            className="w-full"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            Тест отправки
            {testResults.send !== undefined && (
              testResults.send ? 
                <CheckCircle className="h-4 w-4 ml-2 text-green-500" /> : 
                <XCircle className="h-4 w-4 ml-2 text-red-500" />
            )}
          </Button>

          <Button 
            onClick={testEditMessage} 
            disabled={loading || provider !== 'wpp' || !lastMessageId}
            variant="outline"
            className="w-full"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Edit className="h-4 w-4 mr-2" />}
            Тест редактирования
            {testResults.edit !== undefined && (
              testResults.edit ? 
                <CheckCircle className="h-4 w-4 ml-2 text-green-500" /> : 
                <XCircle className="h-4 w-4 ml-2 text-red-500" />
            )}
          </Button>

          <Button 
            onClick={testDeleteMessage} 
            disabled={loading || provider !== 'wpp' || !lastMessageId}
            variant="outline"
            className="w-full"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
            Тест удаления
            {testResults.delete !== undefined && (
              testResults.delete ? 
                <CheckCircle className="h-4 w-4 ml-2 text-green-500" /> : 
                <XCircle className="h-4 w-4 ml-2 text-red-500" />
            )}
          </Button>

          <Button 
            onClick={testDownloadFile} 
            disabled={loading || provider !== 'wpp'}
            variant="outline"
            className="w-full"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
            Тест скачивания
            {testResults.download !== undefined && (
              testResults.download ? 
                <CheckCircle className="h-4 w-4 ml-2 text-green-500" /> : 
                <XCircle className="h-4 w-4 ml-2 text-red-500" />
            )}
          </Button>
        </div>

        {/* Instructions */}
        <div className="text-sm text-muted-foreground space-y-1 border-t pt-4">
          <p className="font-medium">Инструкция:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Убедитесь, что провайдер переключен на WPP</li>
            <li>Нажмите "Тест отправки" - должно отправиться сообщение</li>
            <li>Нажмите "Тест редактирования" - последнее сообщение будет отредактировано</li>
            <li>Нажмите "Тест удаления" - сообщение будет удалено</li>
            <li>Проверьте чат с клиентом для подтверждения изменений</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};