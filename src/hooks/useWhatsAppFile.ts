import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export const useWhatsAppFile = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const downloadFile = async (chatId: string, messageId: string): Promise<string | null> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('download-whatsapp-file', {
        body: { chatId, idMessage: messageId }
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