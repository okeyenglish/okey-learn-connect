import { supabase } from "@/integrations/supabase/typedClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { selfHostedPost } from "@/lib/selfHostedApi";

export const useWhatsAppFile = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user, profile } = useAuth();

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

      // Use organization_id from profile via AuthProvider
      const organizationId = (profile as any)?.organization_id;

      const body = provider === 'wpp' 
        ? { messageId, organizationId }
        : { chatId, idMessage: messageId };

      const response = await selfHostedPost<{ downloadUrl?: string }>(functionName, body);

      if (!response.success) {
        console.error('Error downloading WhatsApp file:', response.error);
        toast({
          title: "Ошибка",
          description: "Не удалось загрузить файл",
          variant: "destructive",
        });
        return null;
      }

      if (response.data?.downloadUrl) {
        return response.data.downloadUrl;
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
