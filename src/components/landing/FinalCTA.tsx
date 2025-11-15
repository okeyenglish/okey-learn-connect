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
    <section className="py-20 bg-gradient-subtle">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Посмотрите, как Академиус будет работать именно у вас
          </h2>
          <p className="text-lg text-muted-foreground mb-12">
            Оставьте заявку — мы разберем ваш текущий процесс и покажем, как его собрать в одну систему
          </p>

          <form onSubmit={handleSubmit} className="space-y-6 bg-card p-8 rounded-lg border border-border">
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

            <Input
              placeholder="Ваше имя"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />

            <Input
              placeholder="Телефон / WhatsApp"
              value={formData.contact}
              onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
              required
            />

            <Input
              type="email"
              placeholder="E-mail"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />

            <Textarea
              placeholder="Расскажите, как вы сейчас ведете учет/занятия"
              value={formData.comment}
              onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
              rows={4}
            />

            <Button type="submit" size="lg" className="w-full">
              Получить консультацию
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}
