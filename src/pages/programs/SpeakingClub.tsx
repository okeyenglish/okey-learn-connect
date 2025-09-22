import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import SpeakingClubSignupModal from "@/components/SpeakingClubSignupModal";
import { 
  Users, 
  Clock, 
  Globe, 
  MessageCircle, 
  CheckCircle, 
  Mic,
  Video,
  Wifi,
  BookOpen,
  Target,
  Lightbulb,
  UserCheck,
  Shield,
  Briefcase,
  Plane,
  Send
} from "lucide-react";

export default function SpeakingClub() {
  const handleWhatsApp = () => {
    window.open('https://wa.me/79999999999?text=Хочу записаться в Speaking Club', '_blank');
  };

  const handleTelegram = () => {
    window.open('https://t.me/okeyenglish', '_blank');
  };
  return (
    <div className="min-h-screen py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Hero Section */}
        <section className="text-center mb-20">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl lg:text-6xl font-bold mb-6">
              Speaking Club — <span className="text-gradient">разговорный английский c носителем онлайн</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Онлайн-клуб для подростков и взрослых: свободное общение в реальном времени, темы Cambridge/экзамены и живые дискуссии.
            </p>
            
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <Badge variant="outline" className="px-4 py-2 text-base">
                <Globe className="w-4 h-4 mr-2" />
                Online
              </Badge>
              <Badge variant="outline" className="px-4 py-2 text-base">
                <MessageCircle className="w-4 h-4 mr-2" />
                Носитель языка
              </Badge>
              <Badge variant="outline" className="px-4 py-2 text-base">
                <Users className="w-4 h-4 mr-2" />
                Teens & Adults
              </Badge>
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-8">
              <SpeakingClubSignupModal>
                <Button variant="hero" size="lg">
                  <UserCheck className="w-5 h-5 mr-2" />
                  Записаться в Speaking Club
                </Button>
              </SpeakingClubSignupModal>
              <Button variant="outline" size="lg" onClick={handleWhatsApp}>
                <MessageCircle className="w-5 h-5 mr-2" />
                WhatsApp
              </Button>
              <Button variant="outline" size="lg" onClick={handleTelegram}>
                <Send className="w-5 h-5 mr-2" />
                Telegram
              </Button>
            </div>

            <p className="text-sm text-muted-foreground italic">
              Подключайтесь из любой точки мира — нужна только камера/микрофон и стабильный интернет.
            </p>
          </div>
        </section>

        {/* Features */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">Почему это работает</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Живое общение</h3>
              <p className="text-muted-foreground">Практика с преподавателем и носителями языка — без языкового барьера.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Темы Cambridge</h3>
              <p className="text-muted-foreground">Структура по темам международных экзаменов: путешествия, культура, бизнес, обучение.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Фокус на речи</h3>
              <p className="text-muted-foreground">Свободные диалоги, ролевые игры, мини-дебаты и аргументация.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Lightbulb className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Быстрый прогресс</h3>
              <p className="text-muted-foreground">Словарь + «живые» фразы, актуальные для реального общения.</p>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="mb-20">
          <div className="bg-gradient-subtle rounded-2xl p-8 lg:p-12">
            <h2 className="text-3xl font-bold text-center mb-8">Как проходит занятие</h2>
            <p className="text-lg text-center text-muted-foreground max-w-4xl mx-auto">
              Разминка на разговорную тему → ввод лексики и полезных фраз → практика в парах/мини-группах → 
              общая дискуссия и обратная связь. В конце — мини-резюме и рекомендации по самостоятельной практике.
            </p>
          </div>
        </section>

        {/* Levels and Schedule */}
        <section className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Уровни и расписание (МСК)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="card-elevated">
                <CardHeader className="text-center">
                  <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-3">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-lg">A1 — суббота 10:00</CardTitle>
                  <CardDescription>Для начинающих: простые фразы, базовые темы и уверенность в диалоге.</CardDescription>
                </CardHeader>
                <CardContent>
                  <SpeakingClubSignupModal level="A1">
                    <Button className="w-full" aria-label="Записаться в Speaking Club уровня A1">Записаться</Button>
                  </SpeakingClubSignupModal>
                </CardContent>
              </Card>
              <Card className="card-elevated">
                <CardHeader className="text-center">
                  <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-3">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-lg">A2 — суббота 11:10</CardTitle>
                  <CardDescription>Ежедневные ситуации, расширение словаря и устойчивых выражений.</CardDescription>
                </CardHeader>
                <CardContent>
                  <SpeakingClubSignupModal level="A2">
                    <Button className="w-full" aria-label="Записаться в Speaking Club уровня A2">Записаться</Button>
                  </SpeakingClubSignupModal>
                </CardContent>
              </Card>
              <Card className="card-elevated">
                <CardHeader className="text-center">
                  <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-3">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-lg">B1 — суббота 12:20</CardTitle>
                  <CardDescription>Дискуссии и аргументы, более сложные темы и фразовые глаголы.</CardDescription>
                </CardHeader>
                <CardContent>
                  <SpeakingClubSignupModal level="B1">
                    <Button className="w-full" aria-label="Записаться в Speaking Club уровня B1">Записаться</Button>
                  </SpeakingClubSignupModal>
                </CardContent>
              </Card>
              <Card className="card-elevated">
                <CardHeader className="text-center">
                  <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-3">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-lg">B2+ — суббота 13:30</CardTitle>
                  <CardDescription>Глубокие обсуждения, нюансы речи, идиомы и спонтанная речь.</CardDescription>
                </CardHeader>
                <CardContent>
                  <SpeakingClubSignupModal level="B2+">
                    <Button className="w-full" aria-label="Записаться в Speaking Club уровня B2+">Записаться</Button>
                  </SpeakingClubSignupModal>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Requirements */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">Что понадобится</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Video className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Устройство</h3>
              <p className="text-muted-foreground">Компьютер/планшет с камерой и микрофоном.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Wifi className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Интернет</h3>
              <p className="text-muted-foreground">Стабильное соединение, лучше по кабелю/5GHz Wi-Fi.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Globe className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Платформа</h3>
              <p className="text-muted-foreground">Zoom/Meet — ссылку пришлём перед занятием.</p>
            </div>
          </div>
        </section>

        {/* Who it's for */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">Кому подойдёт</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Тем, кто боится говорить</h3>
              <p className="text-muted-foreground">Преодолеем языковой барьер в безопасной среде.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Готовящимся к экзаменам</h3>
              <p className="text-muted-foreground">Cambridge, IELTS, ТОЕFL — разговорная часть и тематика.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Briefcase className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Путешествия/работа</h3>
              <p className="text-muted-foreground">Практика для интервью, митингов и поездок.</p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">Частые вопросы</h2>
          <div className="max-w-3xl mx-auto space-y-6">
            {[
              {
                q: "Нужен ли определённый уровень?",
                a: "Да, группы разделены по CEFR (A1—B2+). Если сомневаетесь — пройдите тест и запишитесь на пробное."
              },
              {
                q: "Сколько человек в группе?",
                a: "Мини-группа: чтобы каждый говорил и получал обратную связь."
              },
              {
                q: "Можно ли попробовать разово?",
                a: "Да. Есть пробное занятие и разовые слоты — уточните у менеджера."
              },
              {
                q: "Что, если пропущу встречу?",
                a: "Сообщите администратору — предложим альтернативную дату/уровень."
              },
              {
                q: "Можно с телефона?",
                a: "Да, но компьютер удобнее для диалогов в «комнатах»."
              }
            ].map((item, index) => (
              <Card key={index} className="card-elevated">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2">{item.q}</h3>
                  <p className="text-muted-foreground">{item.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Payment info */}
        <section className="mb-20">
          <div className="bg-gradient-subtle rounded-2xl p-8 lg:p-12 text-center">
            <h2 className="text-3xl font-bold mb-8">Оплата и документы</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Оплата помесячно, безнал, возможна рассрочка. В O'KEY ENGLISH можно оплатить обучение материнским капиталом — 
              менеджер подскажет детали и поможет оформить документы.
            </p>
          </div>
        </section>

        {/* Final CTA */}
        <section className="text-center">
          <div className="bg-gradient-primary rounded-2xl p-8 lg:p-12 text-white">
            <h2 className="text-3xl font-bold mb-4">Готовы заговорить свободнее?</h2>
            <p className="text-xl mb-8 opacity-90">
              Оставьте контакты — подберём уровень и пришлём ссылку для подключения в удобное время.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <SpeakingClubSignupModal>
                <Button variant="secondary" size="lg">
                  <UserCheck className="w-5 h-5 mr-2" />
                  Записаться в Speaking Club
                </Button>
              </SpeakingClubSignupModal>
              <Button variant="outline" size="lg" className="border-white text-white hover:bg-white hover:text-primary" onClick={handleWhatsApp}>
                <MessageCircle className="w-5 h-5 mr-2" />
                Написать в WhatsApp
              </Button>
              <Button variant="outline" size="lg" className="border-white text-white hover:bg-white hover:text-primary" onClick={handleTelegram}>
                <Send className="w-5 h-5 mr-2" />
                Написать в Telegram
              </Button>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}