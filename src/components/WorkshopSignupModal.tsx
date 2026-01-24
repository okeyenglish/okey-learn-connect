import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Send, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/typedClient";

interface WorkshopSignupModalProps {
  branchId: string;
  branchName: string;
  children: React.ReactNode;
}

export default function WorkshopSignupModal({ branchId, branchName, children }: WorkshopSignupModalProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    phone: "",
    childName: "",
    parentType: "мама"
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('webhook-proxy', {
        body: {
          source: "workshop_signup",
          page: window.location.pathname,
          utm: new URLSearchParams(window.location.search).toString(),
          course: "Workshop",
          branch: branchName,
          branchId: branchId,
          phone: formData.phone,
          childName: formData.childName || "Не указано",
          parentType: formData.parentType,
          message: `Заявка на Workshop в филиале ${branchName}. Телефон ${formData.parentType}: ${formData.phone}${formData.childName ? `. Имя ребенка: ${formData.childName}` : ""}`
        }
      });

      if (error) {
        console.error('Workshop webhook proxy error:', error);
        throw error;
      }

      console.log('Workshop webhook proxy response:', data);

      
      toast({
        title: "Заявка отправлена!",
        description: "Мы свяжемся с вами в течение 15 минут для уточнения деталей Workshop",
      });

      // Reset form and close modal
      setFormData({
        phone: "",
        childName: "",
        parentType: "мама"
      });
      setOpen(false);

    } catch (error) {
      console.error("Error submitting workshop signup:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось отправить заявку. Попробуйте еще раз или свяжитесь с нами по телефону.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            <span>Попробовать Workshop бесплатно</span>
          </DialogTitle>
          <DialogDescription>
            Филиал: {branchName} • Курс: Workshop
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Телефон *</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              placeholder="+7 (999) 123-45-67"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="childName">Имя ребенка (необязательно)</Label>
            <Input
              id="childName"
              value={formData.childName}
              onChange={(e) => setFormData({...formData, childName: e.target.value})}
              placeholder="Имя ребенка"
            />
          </div>

          <div className="space-y-2">
            <Label>Чей номер *</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={formData.parentType === "мама" ? "default" : "outline"}
                size="sm"
                onClick={() => setFormData({...formData, parentType: "мама"})}
                className="flex-1"
              >
                Мама
              </Button>
              <Button
                type="button"
                variant={formData.parentType === "папа" ? "default" : "outline"}
                size="sm"
                onClick={() => setFormData({...formData, parentType: "папа"})}
                className="flex-1"
              >
                Папа
              </Button>
              <Button
                type="button"
                variant={formData.parentType === "мой" ? "default" : "outline"}
                size="sm"
                onClick={() => setFormData({...formData, parentType: "мой"})}
                className="flex-1"
              >
                Мой
              </Button>
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading}
          >
            {isLoading ? (
              "Отправляем..."
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Записаться на пробный Workshop
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}