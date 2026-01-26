import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MapPin, Phone, MessageCircle, Send, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface TrialLessonModalProps {
  branchName: string;
  branchAddress: string;
  children: React.ReactNode;
}

export const TrialLessonModal = ({ branchName, branchAddress, children }: TrialLessonModalProps) => {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    comment: '',
  });

  const phoneNumber = '79937073553';

  const handleWhatsApp = () => {
    const message = `Здравствуйте! Хочу записаться на пробный урок в филиал "${branchName}" (${branchAddress}).${formData.name ? ` Меня зовут ${formData.name}.` : ''}${formData.comment ? ` ${formData.comment}` : ''}`;
    window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`, '_blank');
    setOpen(false);
  };

  const handleTelegram = () => {
    const message = `Здравствуйте! Хочу записаться на пробный урок в филиал "${branchName}" (${branchAddress}).${formData.name ? ` Меня зовут ${formData.name}.` : ''}${formData.comment ? ` ${formData.comment}` : ''}`;
    window.open(`https://t.me/englishmanager?text=${encodeURIComponent(message)}`, '_blank');
    setOpen(false);
  };

  const handleCall = () => {
    window.open(`tel:+${phoneNumber}`, '_self');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast.error('Пожалуйста, заполните имя и телефон');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('submit-trial-request', {
        body: {
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          comment: formData.comment.trim() || undefined,
          branch_name: branchName,
          branch_address: branchAddress,
        },
      });

      if (error) {
        console.error('Error submitting trial request:', error);
        toast.error('Ошибка отправки заявки. Попробуйте ещё раз.');
        setIsSubmitting(false);
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);
      setIsSuccess(true);
      toast.success('Заявка отправлена! Мы свяжемся с вами в ближайшее время.');
      
      setTimeout(() => {
        setOpen(false);
        setIsSuccess(false);
        setFormData({ name: '', phone: '', comment: '' });
      }, 2000);
    } catch (err) {
      console.error('Unexpected error:', err);
      toast.error('Ошибка отправки заявки. Попробуйте ещё раз.');
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Записаться на пробный урок
          </DialogTitle>
          <DialogDescription>
            <Badge variant="secondary" className="mt-2">
              {branchName} — {branchAddress}
            </Badge>
          </DialogDescription>
        </DialogHeader>

        {isSuccess ? (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-center font-medium">Заявка успешно отправлена!</p>
            <p className="text-center text-sm text-muted-foreground">
              Мы свяжемся с вами в ближайшее время
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Быстрые способы связи */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">Быстрая связь:</p>
              <div className="grid grid-cols-3 gap-2">
                <Button 
                  variant="outline" 
                  className="flex flex-col gap-1 h-auto py-3"
                  onClick={handleWhatsApp}
                >
                  <MessageCircle className="h-5 w-5 text-green-600" />
                  <span className="text-xs">WhatsApp</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="flex flex-col gap-1 h-auto py-3"
                  onClick={handleTelegram}
                >
                  <Send className="h-5 w-5 text-blue-500" />
                  <span className="text-xs">Telegram</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="flex flex-col gap-1 h-auto py-3"
                  onClick={handleCall}
                >
                  <Phone className="h-5 w-5 text-primary" />
                  <span className="text-xs">Позвонить</span>
                </Button>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  или оставьте заявку
                </span>
              </div>
            </div>

            {/* Форма заявки */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Ваше имя *</Label>
                <Input
                  id="name"
                  placeholder="Как к вам обращаться?"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Телефон *</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+7 (999) 123-45-67"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="comment">Комментарий</Label>
                <Textarea
                  id="comment"
                  placeholder="Возраст ребёнка, удобное время и т.д."
                  value={formData.comment}
                  onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                  rows={3}
                />
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Отправка...
                  </>
                ) : (
                  'Отправить заявку'
                )}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Нажимая кнопку, вы соглашаетесь с политикой обработки персональных данных
              </p>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TrialLessonModal;
