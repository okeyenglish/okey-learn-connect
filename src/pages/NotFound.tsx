import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, MessageCircle, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const NotFound = () => {
  const location = useLocation();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    branch: ""
  });

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.branch) {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, заполните все поля",
        variant: "destructive"
      });
      return;
    }
    
    toast({
      title: "Заявка отправлена!",
      description: "Мы свяжемся с вами в ближайшее время",
    });
    
    // Reset form
    setFormData({ name: "", phone: "", branch: "" });
  };

  const phoneNumber = "+74997073535";
  const whatsappUrl = `https://wa.me/74997073535?text=Здравствуйте! Я получил скидку 5000₽ на странице 404. Хочу записаться на обучение.`;
  const telegramUrl = `https://t.me/+74997073535`;

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-elegant">
        <CardHeader className="text-center">
          <div className="text-6xl font-bold text-primary mb-4">🎉</div>
          <CardTitle className="text-2xl text-primary">
            Поздравляем!
          </CardTitle>
          <CardDescription className="text-lg">
            Вы попали на страницу, которая дарит Вам скидку <span className="font-bold text-primary">5000₽</span> на обучение в O'KEY ENGLISH
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                placeholder="Ваше имя"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full"
              />
            </div>
            
            <div>
              <Input
                placeholder="Ваш телефон"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full"
              />
            </div>
            
            <div>
              <Select value={formData.branch} onValueChange={(value) => setFormData({ ...formData, branch: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите филиал" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kotelniki">Котельники</SelectItem>
                  <SelectItem value="kosino">Новокосино</SelectItem>
                  <SelectItem value="okskaya">Окская</SelectItem>
                  <SelectItem value="stakhanovskaya">Стахановская</SelectItem>
                  <SelectItem value="solntsevo">Солнцево</SelectItem>
                  <SelectItem value="mytishchi">Мытищи</SelectItem>
                  <SelectItem value="lyubertsy-1">Люберцы-1</SelectItem>
                  <SelectItem value="lyubertsy-2">Люберцы-2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button type="submit" className="w-full" variant="hero">
              <Send className="w-4 h-4 mr-2" />
              Получить скидку
            </Button>
          </form>
          
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Или свяжитесь с нами удобным способом:
            </p>
            
            <div className="flex gap-2 justify-center">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open(whatsappUrl, '_blank')}
                className="flex-1"
              >
                <MessageCircle className="w-4 h-4 mr-1" />
                WhatsApp
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open(telegramUrl, '_blank')}
                className="flex-1"
              >
                <Send className="w-4 h-4 mr-1" />
                Telegram
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open(`tel:${phoneNumber}`, '_blank')}
                className="flex-1"
              >
                <Phone className="w-4 h-4 mr-1" />
                Звонок
              </Button>
            </div>
            
            <p className="text-xs text-muted-foreground mt-2">
              {phoneNumber}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;
