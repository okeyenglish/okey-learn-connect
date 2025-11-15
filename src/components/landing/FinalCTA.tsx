import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function FinalCTA() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    role: '',
    name: '',
    contact: '',
    email: '',
    comment: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Заявка отправлена!",
      description: "Мы свяжемся с вами в ближайшее время",
    });
    setFormData({ role: '', name: '', contact: '', email: '', comment: '' });
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

          <form onSubmit={handleSubmit} className="space-y-4 bg-white p-8 rounded-2xl shadow-2xl">
            <Select
              value={formData.role}
              onValueChange={(value) => setFormData({ ...formData, role: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите вашу роль" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="school">Школа / Учебный центр</SelectItem>
                <SelectItem value="teacher">Педагог</SelectItem>
                <SelectItem value="parent">Родитель</SelectItem>
              </SelectContent>
            </Select>

            <div className="grid md:grid-cols-2 gap-4">
              <Input
                placeholder="Ваше имя"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="text-base"
              />

              <Input
                type="email"
                placeholder="E-mail"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="text-base"
              />
            </div>

            <Input
              placeholder="Телефон / WhatsApp"
              value={formData.contact}
              onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
              required
              className="text-base"
            />

            <Button type="submit" size="lg" className="w-full text-lg py-6 bg-success hover:bg-success-600 shadow-lg hover:shadow-xl transition-all">
              Получить демо бесплатно
            </Button>

            <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-success animate-pulse"></span>
              Ответим за 15 минут • Настроим за 1 день
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
