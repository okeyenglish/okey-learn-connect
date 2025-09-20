import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Send, Clock } from "lucide-react";

interface SpeakingClubSignupModalProps {
  level?: string;
  children: React.ReactNode;
}

export default function SpeakingClubSignupModal({ level, children }: SpeakingClubSignupModalProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    phone: "",
    name: "",
    parentType: "мама",
    timeSlot: "",
    level: level || ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const timeSlots = [
    { value: "10:00", label: "10:00 - A1 (Beginner)", level: "A1" },
    { value: "11:10", label: "11:10 - A2 (Elementary)", level: "A2" },
    { value: "12:20", label: "12:20 - B1 (Intermediate)", level: "B1" },
    { value: "13:30", label: "13:30 - B2+ (Upper-Intermediate)", level: "B2+" }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('https://kbojujfwtvmsgudumown.supabase.co/functions/v1/webhook-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source: "speaking_club_signup",
          page: window.location.pathname,
          utm: new URLSearchParams(window.location.search).toString(),
          course: "Speaking Club Online",
          level: formData.timeSlot ? timeSlots.find(slot => slot.value === formData.timeSlot)?.level || formData.level || "Не указан" : formData.level || "Не указан",
          timeSlot: formData.timeSlot || "Не выбрано",
          phone: formData.phone,
          name: formData.name || "Не указано",
          parentType: formData.parentType,
          message: `Заявка на Speaking Club Online. Уровень: ${formData.level || "Не указан"}. Время: ${formData.timeSlot || "Не выбрано"}. Телефон ${formData.parentType}: ${formData.phone}${formData.name ? `. Имя: ${formData.name}` : ""}`
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const result = await response.json();
      if (!result.ok) {
        throw new Error(result.error || 'Webhook request failed');
      }
      
      toast({
        title: "Заявка отправлена!",
        description: "Мы свяжемся с вами в течение 15 минут для подтверждения места в Speaking Club",
      });

      // Reset form and close modal
      setFormData({
        phone: "",
        name: "",
        parentType: "мама",
        timeSlot: "",
        level: level || ""
      });
      setOpen(false);

    } catch (error) {
      console.error("Error submitting speaking club signup:", error);
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
          <DialogTitle>Записаться в Speaking Club</DialogTitle>
          <DialogDescription>
            Онлайн разговорный клуб с носителем языка • Суббота {
              formData.timeSlot 
                ? timeSlots.find(slot => slot.value === formData.timeSlot)?.value + " МСК"
                : "10:00-13:30 МСК"
            }
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
            <Label htmlFor="name">Имя / Имя ребенка (необязательно)</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="Введите имя"
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

          <div className="space-y-2">
            <Label htmlFor="timeSlot">Удобное время</Label>
            <Select value={formData.timeSlot} onValueChange={(value) => setFormData({...formData, timeSlot: value})}>
              <SelectTrigger>
                <Clock className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Выберите время и уровень" />
              </SelectTrigger>
              <SelectContent>
                {timeSlots.map((slot) => (
                  <SelectItem key={slot.value} value={slot.value}>
                    {slot.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {level && (
            <div className="space-y-2">
              <Label>Выбранный уровень</Label>
              <div className="p-2 bg-muted rounded-md text-sm">
                {level}
              </div>
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading || !formData.phone}
          >
            {isLoading ? (
              "Отправляем..."
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Попробовать бесплатно
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}