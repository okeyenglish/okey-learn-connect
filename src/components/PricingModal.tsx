import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Phone, MessageSquare, User } from "lucide-react";

interface PricingModalProps {
  children: React.ReactNode;
  formatName: string;
  formatDescription: string;
  formatIcon: React.ComponentType<{ className?: string }>;
}

export default function PricingModal({ 
  children, 
  formatName, 
  formatDescription,
  formatIcon: IconComponent 
}: PricingModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !phone.trim()) {
      toast({
        title: "Заполните все поля",
        description: "Пожалуйста, укажите имя и номер телефона",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('https://pjlqwdqcupjwujvqphzd.supabase.co/functions/v1/webhook-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          format: formatName,
          source: 'pricing_page'
        }),
      });

      if (response.ok) {
        toast({
          title: "Заявка отправлена!",
          description: "Мы свяжемся с вами в ближайшее время для расчета стоимости"
        });
        setName("");
        setPhone("");
        setIsOpen(false);
      } else {
        throw new Error('Failed to submit');
      }
    } catch (error) {
      toast({
        title: "Ошибка отправки",
        description: "Попробуйте еще раз или свяжитесь с нами по телефону",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWhatsApp = () => {
    const message = encodeURIComponent(
      `Здравствуйте! Хочу узнать стоимость обучения в формате "${formatName}". Меня зовут ${name || '[Имя]'}, мой телефон ${phone || '[Телефон]'}.`
    );
    window.open(`https://wa.me/79854088855?text=${message}`, '_blank');
  };

  const handleTelegram = () => {
    const message = encodeURIComponent(
      `Здравствуйте! Хочу узнать стоимость обучения в формате "${formatName}". Меня зовут ${name || '[Имя]'}, мой телефон ${phone || '[Телефон]'}.`
    );
    window.open(`https://t.me/okeyenglish?text=${message}`, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-gradient-hero text-white border-none">
        <DialogHeader className="text-center pb-6">
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <IconComponent className="w-8 h-8 text-white" />
          </div>
          <DialogTitle className="text-2xl font-bold">
            Хочу персональный расчёт
          </DialogTitle>
          <p className="text-white/90 text-sm">
            Оставьте контакты — пришлём предложение и ближайшие места в группах.
          </p>
        </DialogHeader>

        <Card className="bg-white/10 border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white">{formatName}</h3>
                <p className="text-white/70 text-sm">{formatDescription}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-white">Имя</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Как вас зовут?"
              className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-white">Телефон</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+7 (999) 123-45-67"
              className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-3 pt-4">
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-white text-primary hover:bg-white/90 font-semibold"
            >
              {isSubmitting ? "Отправляем..." : "Рассчитать стоимость"}
            </Button>
            
            <div className="grid grid-cols-2 gap-3">
              <Button 
                type="button"
                variant="outline" 
                onClick={handleWhatsApp}
                className="bg-white/10 border-white/30 text-white hover:bg-white/20"
              >
                <Phone className="w-4 h-4 mr-2" />
                WhatsApp
              </Button>
              <Button 
                type="button"
                variant="outline" 
                onClick={handleTelegram}
                className="bg-white/10 border-white/30 text-white hover:bg-white/20"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Telegram
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}