import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, CreditCard, Link2, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
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

      setPaymentUrl(data.payment_url);
      toast({
        title: 'Ссылка создана',
        description: 'Ссылка на оплату успешно сгенерирована',
      });
    } catch (error: any) {
      console.error('Error generating payment link:', error);
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось создать ссылку на оплату',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddToMessage = () => {
    if (!paymentUrl) return;

    onPaymentLinkGenerated({
      url: paymentUrl,
      amount: parseFloat(amount),
      description: description || undefined,
    });
    handleClose();
  };

  const handleClose = () => {
    setAmount('');
    setDescription('');
    setPaymentUrl(null);
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
              onChange={(e) => {
                setAmount(e.target.value);
                setPaymentUrl(null);
              }}
              disabled={isGenerating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Описание (опционально)</Label>
            <Textarea
              id="description"
              placeholder="Например: Оплата за октябрь"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setPaymentUrl(null);
              }}
              disabled={isGenerating}
              className="resize-none"
              rows={2}
            />
          </div>

          {paymentUrl && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-green-800 mb-2">
                <Link2 className="h-4 w-4" />
                <span className="font-medium">Ссылка готова!</span>
              </div>
              <p className="text-xs text-green-700 break-all">{paymentUrl}</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={isGenerating}>
            Отмена
          </Button>
          
          {!paymentUrl ? (
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
          ) : (
            <Button onClick={handleAddToMessage}>
              <Plus className="h-4 w-4 mr-2" />
              Добавить в сообщение
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
