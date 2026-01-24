import { supabase } from "@/integrations/supabase/typedClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export const useWhatsAppFile = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const downloadFile = async (chatId: string, messageId: string): Promise<string | null> => {
    setLoading(true);
    try {
      // Get provider settings from messenger_settings
      const { data: settingsData } = await supabase
        .from('messenger_settings')
        .select('provider')
        .eq('messenger_type', 'whatsapp')
        .single();

      const provider = settingsData?.provider || 'greenapi';
      const functionName = provider === 'wpp' ? 'wpp-download' : 'download-whatsapp-file';

      // Get organization_id from profile
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user?.id)
        .single();

      const body = provider === 'wpp' 
        ? { messageId, organizationId: profile?.organization_id }
        : { chatId, idMessage: messageId };

      const { data, error } = await supabase.functions.invoke(functionName, {
        body
      });

      if (error) {
        console.error('Error downloading WhatsApp file:', error);
        toast({
          title: "Ошибка",
          description: "Не удалось загрузить файл",
          variant: "destructive",
        });
        return null;
      }

      if (data?.downloadUrl) {
        return data.downloadUrl;
      }

      return null;
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить файл",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    downloadFile,
    loading
  };
};