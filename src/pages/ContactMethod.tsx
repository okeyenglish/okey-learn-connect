import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, Send, Phone, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ContactMethod() {
  const navigate = useNavigate();

  const handleWhatsApp = () => {
    const message = "Здравствуйте! Я отправил заявку на пробный урок английского языка через сайт. Хочу обсудить детали.";
    window.open(`https://wa.me/79937073553?text=${encodeURIComponent(message)}`, "_blank");
  };

  const handleTelegram = () => {
    window.open("https://t.me/englishmanager", "_blank");
  };

  const handlePhone = () => {
    window.location.href = "tel:+74997073535";
  };

  const handleBackToHome = () => {
    navigate("/");
  };

  return (
    <div className="min-h-screen py-20 bg-gradient-subtle">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
        {/* Success Message */}
        <div className="text-center mb-16">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold mb-6">
            <span className="text-gradient">Заявка отправлена!</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Спасибо за вашу заявку. Выберите удобный способ связи для быстрого общения с нашими менеджерами.
          </p>
        </div>

        {/* Contact Methods */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* WhatsApp */}
          <Card className="card-elevated hover:shadow-lg transition-all duration-300 cursor-pointer group" onClick={handleWhatsApp}>
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <MessageCircle className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle className="text-xl">WhatsApp</CardTitle>
              <CardDescription>
                Мгновенные ответы в популярном мессенджере
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button variant="outline" className="w-full group-hover:bg-green-50 group-hover:border-green-300">
                <MessageCircle className="w-4 h-4 mr-2" />
                Написать в WhatsApp
              </Button>
              <p className="text-sm text-muted-foreground mt-2">
                Ответим в течение 5 минут
              </p>
            </CardContent>
          </Card>

          {/* Telegram */}
          <Card className="card-elevated hover:shadow-lg transition-all duration-300 cursor-pointer group" onClick={handleTelegram}>
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Send className="w-8 h-8 text-blue-600" />
              </div>
              <CardTitle className="text-xl">Telegram</CardTitle>
              <CardDescription>
                Удобное общение в Telegram боте
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button variant="outline" className="w-full group-hover:bg-blue-50 group-hover:border-blue-300">
                <Send className="w-4 h-4 mr-2" />
                Открыть Telegram
              </Button>
              <p className="text-sm text-muted-foreground mt-2">
                @okeyenglish_bot
              </p>
            </CardContent>
          </Card>

          {/* Phone */}
          <Card className="card-elevated hover:shadow-lg transition-all duration-300 cursor-pointer group" onClick={handlePhone}>
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Phone className="w-8 h-8 text-orange-600" />
              </div>
              <CardTitle className="text-xl">Телефон</CardTitle>
              <CardDescription>
                Классический звонок нашим менеджерам
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button variant="outline" className="w-full group-hover:bg-orange-50 group-hover:border-orange-300">
                <Phone className="w-4 h-4 mr-2" />
                Позвонить сейчас
              </Button>
              <p className="text-sm text-muted-foreground mt-2">
                +7 (499) 707-35-35
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Additional Info */}
        <Card className="card-elevated bg-gradient-subtle">
          <CardContent className="p-8 text-center">
            <h3 className="text-xl font-semibold mb-4">Что дальше?</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-muted-foreground">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                  <span className="font-bold text-primary">1</span>
                </div>
                <p>Наш менеджер свяжется с вами в течение 15 минут</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                  <span className="font-bold text-primary">2</span>
                </div>
                <p>Подберем программу и удобное расписание</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                  <span className="font-bold text-primary">3</span>
                </div>
                <p>Проведем бесплатный пробный урок</p>
              </div>
            </div>
            
            <div className="mt-8">
              <Button variant="ghost" onClick={handleBackToHome}>
                Вернуться на главную
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}