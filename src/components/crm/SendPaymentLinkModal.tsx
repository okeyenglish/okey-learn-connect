import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, CreditCard, Link2, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getErrorMessage } from '@/lib/errorUtils';

interface SendPaymentLinkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  onPaymentLinkGenerated: (data: { url: string; amount: number; description?: string }) => void;
}

export const SendPaymentLinkModal = ({
  open,
  onOpenChange,
  clientId,
  clientName,
  onPaymentLinkGenerated,
}: SendPaymentLinkModalProps) => {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerateLink = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: 'Ошибка',
        description: 'Введите корректную сумму',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('tbank-init-client', {
        body: {
          client_id: clientId,
          amount: parseFloat(amount),
          description: description || `Оплата от ${clientName}`,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      // Сразу добавляем ссылку в поле ввода и закрываем модалку
      onPaymentLinkGenerated({
        url: data.payment_url,
        amount: parseFloat(amount),
        description: description || undefined,
      });
      
      toast({
        title: 'Ссылка создана',
        description: 'Ссылка добавлена в поле ввода',
      });
      
      // Сбрасываем и закрываем
      setAmount('');
      setDescription('');
      onOpenChange(false);
    } catch (error: unknown) {
      console.error('Error generating payment link:', error);
      toast({
        title: 'Ошибка',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    setAmount('');
    setDescription('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md z-[100]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Выставить счёт
          </DialogTitle>
          <DialogDescription>
            Создайте ссылку на оплату и отправьте клиенту
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Сумма (₽)</Label>
            <Input
              id="amount"
              type="number"
              min="1"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isGenerating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Описание (опционально)</Label>
            <Textarea
              id="description"
              placeholder="Например: Оплата за октябрь"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isGenerating}
              className="resize-none"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={isGenerating}>
            Отмена
          </Button>
          
          <Button
            onClick={handleGenerateLink}
            disabled={!amount || parseFloat(amount) <= 0 || isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Создание...
              </>
            ) : (
              <>
                <Link2 className="h-4 w-4 mr-2" />
                Создать ссылку
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
