import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2 } from 'lucide-react';

export default function FinalCTA() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({ name: '', email: '', role: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast({ title: "Заявка отправлена!", description: "Мы свяжемся с вами в течение 15 минут в рабочее время." });
    setFormData({ name: '', email: '', role: '' });
    setIsSubmitting(false);
  };

  return (
    <section className="py-20 bg-gradient-to-r from-primary via-primary/90 to-primary">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">
            Посмотрите, как Академиус будет работать именно у вас
          </h2>
          <p className="text-xl text-white/90 mb-12">
            Оставьте заявку — мы разберем ваш текущий процесс и покажем, как его собрать в одну систему
          </p>
          <div className="max-w-md mx-auto bg-card p-8 rounded-2xl border border-border shadow-xl">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Ваше имя *</Label>
                <Input id="name" placeholder="Иван Иванов" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" placeholder="ivan@school.ru" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Ваша роль *</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                  <SelectTrigger><SelectValue placeholder="Выберите роль" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="school">Директор школы</SelectItem>
                    <SelectItem value="admin">Администратор</SelectItem>
                    <SelectItem value="teacher">Преподаватель</SelectItem>
                    <SelectItem value="other">Другое</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                type="submit" 
                size="lg" 
                className="w-full text-lg bg-green-600 hover:bg-green-700" 
                disabled={isSubmitting || !formData.name || !formData.email || !formData.role}
              >
                {isSubmitting ? 'Отправка...' : 'Получить бесплатную консультацию'}
              </Button>
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="text-sm font-medium">Ответим за 15 минут в рабочее время</span>
                </div>
                <p className="text-xs text-muted-foreground">Никакого спама. Только полезные материалы.</p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
