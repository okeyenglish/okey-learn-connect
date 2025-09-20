import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowRight, MessageSquare, Send } from "lucide-react";

const Workshop = () => {
  const handleWhatsApp = () => {
    window.open('https://wa.me/XXXXXXXXXXX?text=Хочу записаться на Workshop', '_blank');
  };

  const handleTelegram = () => {
    window.open('https://t.me/XXXXXXXX', '_blank');
  };

  const handleSignup = () => {
    window.open('/signup?course=workshop', '_blank');
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/10 to-secondary/10 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex flex-wrap gap-2 justify-center mb-6">
              <Badge variant="secondary">Офлайн</Badge>
              <Badge variant="secondary">Практика речи</Badge>
              <Badge variant="secondary">Для 7+</Badge>
              <Badge variant="secondary">Дети / Подростки / Взрослые</Badge>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-primary">
              Workshop — оффлайн практика по английскому
            </h1>
            
            <p className="text-xl md:text-2xl mb-8 text-muted-foreground max-w-3xl mx-auto">
              Живые мастер-классы для детей, подростков и взрослых. Речь, словарь и уверенность — через темы, задания и ролевые игры.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="text-lg" onClick={handleSignup}>
                Записаться на Workshop
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" size="lg" onClick={handleWhatsApp}>
                  <MessageSquare className="mr-2 h-5 w-5" />
                  WhatsApp
                </Button>
                <Button variant="outline" size="lg" onClick={handleTelegram}>
                  <Send className="mr-2 h-5 w-5" />
                  Telegram
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why it works */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-primary">
              Почему это работает
            </h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: "👨‍🏫", title: "Живой формат", text: "Занятия проходят в школе O'KEY ENGLISH с педагогом." },
                { icon: "🎯", title: "Одна встреча — одна тема", text: "Путешествия, культура, бизнес, экзамены и многое другое." },
                { icon: "🤝", title: "Максимум практики", text: "Парные и групповые задания, ролевые игры, питчинг и сценарии." },
                { icon: "💡", title: "Быстрый рост", text: "Свежий словарь + целевая грамматика → уверенная речь." }
              ].map((feature, index) => (
                <Card key={index} className="text-center">
                  <CardHeader>
                    <div className="text-4xl mb-4">{feature.icon}</div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{feature.text}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How Workshop works */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-8 text-primary">
              Как проходит Workshop
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Разогрев, ввод темы и целей → активная практика (кейсы, диалоги, ролевые игры) → разбор и обратная связь → мини-итог с персональными рекомендациями. Под каждый Workshop готовим раздатки/слайды.
            </p>
          </div>
        </div>
      </section>

      {/* Format and Organization */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-primary">
              Формат и организация
            </h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
              {[
                { icon: "👧", title: "Дети / Подростки / Взрослые", text: "Группы формируются по возрасту и уровню CEFR." },
                { icon: "⏱", title: "Длительность", text: "60 минут" },
                { icon: "🧑‍🤝‍🧑", title: "Размер группы", text: "Мини-группа для плотной практики." },
                { icon: "📍", title: "Где", text: "Оффлайн в филиалах O'KEY ENGLISH." },
                { icon: "📅", title: "Когда", text: "По пятницам; актуальные времена уточняйте при записи." }
              ].map((item, index) => (
                <Card key={index} className="text-center">
                  <CardHeader>
                    <div className="text-3xl mb-2">{item.icon}</div>
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm">{item.text}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Popular Topics */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-primary">
              Популярные темы
            </h2>
            
            <div className="flex flex-wrap gap-3 justify-center max-w-4xl mx-auto">
              {[
                "Travel English", "Speaking Booster", "Culture & Movies", "Business Basics",
                "Interview Skills", "Presentation Skills", "Exam Speaking (KET/PET/FCE/IELTS)",
                "Grammar Refresh", "Vocabulary Sprint", "Storytelling"
              ].map((topic, index) => (
                <Badge key={index} variant="outline" className="px-4 py-2 text-sm">
                  {topic}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Branches and Workshops */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-primary">
                Филиалы и ближайшие Workshops
              </h2>
            <p className="text-lg text-muted-foreground">
              Workshops проходят по пятницам. Выберите филиал для уточнения времени и записи.
            </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              {[
                {
                  title: "Филиал «Окская»",
                  text: "Оффлайн мастер-классы для всех возрастов.",
                  badge: "Москва",
                  scheduleLink: "/schedule?tag=workshop&branch=okskaya",
                  mapLink: "https://maps.yandex.ru/?text=OKEY%20ENGLISH%20Окская"
                },
                {
                  title: "Филиал «Новокосино»",
                  text: "Workshops по выходным и будням вечером.",
                  badge: "Москва",
                  scheduleLink: "/schedule?tag=workshop&branch=novokosino",
                  mapLink: "https://maps.yandex.ru/?text=OKEY%20ENGLISH%20Новокосино"
                },
                {
                  title: "Филиал «Грайвороновская»",
                  text: "Тематики для подростков и взрослых.",
                  badge: "Москва",
                  scheduleLink: "/schedule?tag=workshop&branch=graivoronovskaya",
                  mapLink: "https://maps.yandex.ru/?text=OKEY%20ENGLISH%20Грайвороновская"
                },
                {
                  title: "Филиал «Островцы»",
                  text: "Семейные форматы и тематические встречи.",
                  badge: "МО",
                  scheduleLink: "/schedule?tag=workshop&branch=ostrovcy",
                  mapLink: "https://maps.yandex.ru/?text=OKEY%20ENGLISH%20Островцы"
                }
              ].map((branch, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-xl">{branch.title}</CardTitle>
                      <Badge variant="secondary">{branch.badge}</Badge>
                    </div>
                    <CardDescription>{branch.text}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button className="flex-1" onClick={() => window.open(branch.scheduleLink, '_blank')}>
                        Расписание
                      </Button>
                      <Button variant="outline" onClick={() => window.open(branch.mapLink, '_blank')}>
                        Как добраться
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Who is it for */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-8 text-primary">
              Кому подойдёт
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Тем, кому не хватает практики речи; кто готовится к поездке, собеседованию или экзамену; кто хочет «перезагрузить» английский и вернуться к регулярным занятиям.
            </p>
          </div>
        </div>
      </section>

      {/* What you get */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-primary">
              Что вы получаете
            </h2>
            
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { icon: "🗣️", title: "Говорим больше", text: "Большая доля времени — на разговорную практику." },
                { icon: "📚", title: "Материалы", text: "Раздатка/чек-лист по теме + рекомендации по домашней практике." },
                { icon: "✅", title: "Обратная связь", text: "Персональные рекомендации от педагога." }
              ].map((item, index) => (
                <Card key={index} className="text-center">
                  <CardHeader>
                    <div className="text-4xl mb-4">{item.icon}</div>
                    <CardTitle className="text-xl">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{item.text}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-primary">
              Частые вопросы
            </h2>
            
            <Accordion type="single" collapsible className="space-y-4">
              {[
                { q: "Нужен ли определённый уровень?", a: "Мы формируем группы по CEFR — от A1 до B2+. При записи подскажем подходящий слот." },
                { q: "Сколько человек в группе?", a: "Мини-группа: чтобы все говорили и получали обратную связь." },
                { q: "Можно прийти разово?", a: "Да, Workshop — разовая встреча по теме. Также можно ходить регулярно — следите за расписанием." },
                { q: "Онлайн бывает?", a: "Workshop — оффлайн-формат. Онлайн-альтернативы есть по запросу." },
                { q: "Что если я пропущу?", a: "Сообщите администратору — подберём альтернативную дату или тему." }
              ].map((item, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left font-semibold">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 bg-primary/5">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-primary">
              Записаться на Workshop
            </h2>
            <p className="text-lg mb-8 text-muted-foreground">
              Оставьте контакты — подберём тему, филиал и время, пришлём памятку к занятию.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="text-lg" onClick={handleSignup}>
                Оставить заявку
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" size="lg" onClick={handleWhatsApp}>
                  <MessageSquare className="mr-2 h-5 w-5" />
                  Написать в WhatsApp
                </Button>
                <Button variant="outline" size="lg" onClick={handleTelegram}>
                  <Send className="mr-2 h-5 w-5" />
                  Написать в Telegram
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Workshop;