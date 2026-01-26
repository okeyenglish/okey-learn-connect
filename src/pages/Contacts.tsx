import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Phone, 
  Mail, 
  MapPin, 
  MessageCircle, 
  Clock, 
  Send,
  CheckCircle
} from "lucide-react";
import { getBranchesForSelect } from "@/lib/branches";
import { selfHostedPost } from "@/lib/selfHostedApi";

const courses = [
  "Super Safari (3-6 лет)",
  "Kid's Box (5-9 лет)",
  "Prepare (10-17 лет)",
  "Empower (18+ лет)"
];

export default function Contacts() {
  const branches = getBranchesForSelect();
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    branch: "",
    age: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Submit form data via self-hosted Edge Function proxy
      const response = await selfHostedPost('webhook-proxy', {
        source: "website",
        page: window.location.pathname,
        utm: new URLSearchParams(window.location.search).toString(),
        name: formData.name,
        phone: formData.phone,
        branch: formData.branch,
        age: formData.age
      }, { requireAuth: false });


      if (!response.success) {
        console.error('Webhook proxy error details:', response.error);
        throw new Error(response.error || 'Webhook error');
      }

      console.log('Webhook proxy success:', response.data);
      
      toast({
        title: "Заявка отправлена!",
        description: "Мы свяжемся с вами в течение 15 минут",
      });

      // Reset form
      setFormData({
        name: "",
        phone: "",
        branch: "",
        age: ""
      });

      // Redirect to contact method selection page
      setTimeout(() => {
        window.location.href = "/contact-method";
      }, 2000);
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось отправить заявку. Попробуйте еще раз или свяжитесь с нами по телефону.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleWhatsApp = () => {
    const message = "Здравствуйте! Хочу записаться на пробный урок английского языка.";
    window.open(`https://wa.me/79937073553?text=${encodeURIComponent(message)}`, "_blank");
  };

  return (
    <div className="min-h-screen py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl lg:text-5xl font-bold mb-6">
            <span className="text-gradient">Записаться</span> на пробный урок
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Оставьте заявку, и мы подберем программу, расписание и филиал специально для вас
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div>
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="text-2xl">Заявка на пробный урок</CardTitle>
                <CardDescription>
                  Заполните форму, и мы свяжемся с вами в течение 15 минут
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Имя *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        placeholder="Ваше имя"
                        required
                      />
                    </div>
                    <div>
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
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="branch">Филиал *</Label>
                      <Select onValueChange={(value) => setFormData({...formData, branch: value})} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите филиал" />
                        </SelectTrigger>
                        <SelectContent>
                          {branches.map((branch) => (
                            <SelectItem key={branch.value} value={branch.value}>
                              {branch.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="age">Возраст *</Label>
                      <Input
                        id="age"
                        type="number"
                        value={formData.age}
                        onChange={(e) => setFormData({...formData, age: e.target.value})}
                        placeholder="Укажите возраст"
                        min="3"
                        max="99"
                        required
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    variant="hero"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      "Отправляем..."
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Записаться на пробный урок
                      </>
                    )}
                  </Button>

                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-4">Или свяжитесь с нами прямо сейчас:</p>
                    <Button 
                      type="button"
                      variant="outline" 
                      className="w-full"
                      onClick={handleWhatsApp}
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Написать в WhatsApp
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Contact Information */}
          <div className="space-y-8">
            {/* Quick Contact */}
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle>Свяжитесь с нами</CardTitle>
                <CardDescription>
                  Готовы ответить на ваши вопросы
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <a
                  href="tel:+74997073535"
                  className="flex items-center gap-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Phone className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium">+7 (499) 707-35-35</div>
                    <div className="text-sm text-muted-foreground">Звонок бесплатный</div>
                  </div>
                </a>

                <a
                  href="mailto:hello@okeyenglish.ru"
                  className="flex items-center gap-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium">hello@okeyenglish.ru</div>
                    <div className="text-sm text-muted-foreground">Ответим в течение часа</div>
                  </div>
                </a>

                <div className="flex items-center gap-3 p-4 rounded-lg border">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium">Время работы</div>
                    <div className="text-sm text-muted-foreground">Пн-Пт: 9:00-21:00, Сб-Вс: 10:00-18:00</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Branches */}
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle>Наши филиалы</CardTitle>
                <CardDescription>
                  8 филиалов в Москве и онлайн
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {branches.map((branch) => (
                  <Link 
                    key={branch.value} 
                    to={`/branches/${branch.value}`}
                    className="flex items-start gap-3 p-3 rounded-lg border hover:border-primary/50 hover:bg-muted/50 transition-all cursor-pointer"
                  >
                    <MapPin className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <div className="font-medium">{branch.label}</div>
                      <div className="text-sm text-muted-foreground">{branch.address}</div>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>

            {/* Benefits */}
            <Card className="card-elevated bg-gradient-subtle">
              <CardHeader>
                <CardTitle>Почему выбирают нас</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <div className="font-medium">Бесплатный пробный урок</div>
                    <div className="text-sm text-muted-foreground">Познакомьтесь с методикой и преподавателем</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <div className="font-medium">Гарантия прогресса</div>
                    <div className="text-sm text-muted-foreground">При соблюдении условий обучения</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <div className="font-medium">Гибкое расписание</div>
                    <div className="text-sm text-muted-foreground">Подберем удобное время</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <div className="font-medium">Опытные преподаватели</div>
                    <div className="text-sm text-muted-foreground">CELTA, TESOL, опыт от 5 лет</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}