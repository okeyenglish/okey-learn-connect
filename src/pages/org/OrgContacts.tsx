import { useState } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import { PublicOrganization } from '@/hooks/useOrganizationPublic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Phone, Mail, MapPin, MessageCircle, Send, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface OrgContext {
  org: PublicOrganization;
}

export const OrgContacts = () => {
  const { org } = useOutletContext<OrgContext>();
  const { orgSlug } = useParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    message: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast.error('Пожалуйста, заполните имя и телефон');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('https://api.academyos.ru/functions/v1/submit-trial-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          comment: formData.message.trim() || undefined,
          branch_name: org.name,
          branch_address: 'Контактная форма',
        }),
      });

      const data = await response.json();

      if (!response.ok || data?.error) {
        toast.error(data?.error || 'Ошибка отправки. Попробуйте ещё раз.');
        setIsSubmitting(false);
        return;
      }

      setIsSuccess(true);
      toast.success('Заявка отправлена! Мы свяжемся с вами в ближайшее время.');
      setFormData({ name: '', phone: '', message: '' });

      setTimeout(() => setIsSuccess(false), 5000);
    } catch (err) {
      toast.error('Ошибка отправки. Попробуйте ещё раз.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold mb-4">Контакты</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Свяжитесь с нами любым удобным способом
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
        {/* Contact Info */}
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Как с нами связаться</h3>
              
              <div className="space-y-4">
                {org.settings?.phone && (
                  <a 
                    href={`tel:${org.settings.phone}`}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Phone className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">Телефон</div>
                      <div className="text-sm text-muted-foreground">{org.settings.phone}</div>
                    </div>
                  </a>
                )}

                {org.settings?.email && (
                  <a 
                    href={`mailto:${org.settings.email}`}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">Email</div>
                      <div className="text-sm text-muted-foreground">{org.settings.email}</div>
                    </div>
                  </a>
                )}

                {org.settings?.social_links?.whatsapp && (
                  <a 
                    href={`https://wa.me/${org.settings.social_links.whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <MessageCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <div className="font-medium">WhatsApp</div>
                      <div className="text-sm text-muted-foreground">Напишите нам</div>
                    </div>
                  </a>
                )}

                {org.settings?.social_links?.telegram && (
                  <a 
                    href={`https://t.me/${org.settings.social_links.telegram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Send className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium">Telegram</div>
                      <div className="text-sm text-muted-foreground">@{org.settings.social_links.telegram}</div>
                    </div>
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contact Form */}
        <Card>
          <CardHeader>
            <CardTitle>Оставить заявку</CardTitle>
          </CardHeader>
          <CardContent>
            {isSuccess ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="font-semibold mb-2">Заявка отправлена!</h3>
                <p className="text-muted-foreground">
                  Мы свяжемся с вами в ближайшее время
                </p>
              </div>
            ) : (
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
                  <Label htmlFor="message">Сообщение</Label>
                  <Textarea
                    id="message"
                    placeholder="Ваш вопрос или пожелание..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows={4}
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
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OrgContacts;
