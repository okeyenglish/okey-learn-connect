import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { MessageCircle } from 'lucide-react';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const MiniSadik = () => {
  const handleWhatsApp = () => {
    const message = encodeURIComponent("Здравствуйте! Интересует мини-садик для дошкольников. Можно узнать подробности?");
    window.open(`https://wa.me/79937073553?text=${message}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="py-16 px-4 bg-gradient-to-br from-primary/5 to-background">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex flex-wrap gap-2 mb-6">
                <Badge variant="secondary">3–6 лет</Badge>
                <Badge variant="secondary">Суббота утром</Badge>
                <Badge variant="secondary">Игровой английский</Badge>
              </div>
              
              <h1 className="text-4xl lg:text-5xl font-bold mb-6 leading-tight">
                Субботний мини-садик — английский для детей
              </h1>
              
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                Весёлые и полезные занятия для дошкольников 3–6 лет: игры, творчество, песни и сказки на английском. Утро выходного, которое ребёнок ждёт!
              </p>
              
              <div className="flex flex-wrap gap-4">
                <Button asChild size="lg" className="bg-primary hover:bg-primary/90">
                  <Link to="/contacts?course=minisadik">Записаться на пробный</Link>
                </Button>
                <Button 
                  variant="outline" 
                  size="lg"
                  onClick={handleWhatsApp}
                  className="gap-2"
                >
                  <MessageCircle className="w-5 h-5" />
                  WhatsApp
                </Button>
              </div>
            </div>
            
            <div className="relative">
              <div className="aspect-square bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl flex items-center justify-center text-8xl">
                👧👦
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Почему родителям это нравится */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-12">Почему родителям это нравится</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: "👧👦",
                title: "Заботливое утро по-субботам",
                text: "Дети проводят время в компании сверстников и педагога — в тёплой и безопасной атмосфере."
              },
              {
                icon: "🎲",
                title: "Английский через игру",
                text: "Игры, творчество, песни и сказки — язык усваивается естественно и с радостью."
              },
              {
                icon: "🗣️",
                title: "Речь и понимание",
                text: "Формируется правильное восприятие речи и первые навыки общения на английском."
              },
              {
                icon: "☕",
                title: "Перерывы и перекусы",
                text: "В расписании предусмотрены паузы на отдых и лёгкие перекусы."
              },
              {
                icon: "🤝",
                title: "Адаптация к учёбе",
                text: "Мини-садик помогает мягко привыкнуть к занятиям и режиму, развивает самостоятельность."
              }
            ].map((feature, index) => (
              <Card key={index} className="h-full">
                <CardContent className="p-6">
                  <div className="text-4xl mb-4">{feature.icon}</div>
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Content Section - Как проходят занятия */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-center mb-8">Как проходят занятия</h2>
          <div className="prose prose-lg mx-auto text-center">
            <p className="text-lg leading-relaxed">
              Утро субботы в O'KEY ENGLISH — это чередование игровых активностей на английском: приветственный круг, песни и движения, тематические игры и творчество, сказочное чтение, мини-проекты. Между блоками — короткие перерывы для отдыха.
            </p>
          </div>
        </div>
      </section>

      {/* Format Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-12">Формат и организация</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: "👶", title: "Возраст", text: "3–6 лет (дошкольники)" },
              { icon: "📍", title: "Где", text: "Все филиалы — уточняйте доступность" },
              { icon: "📅", title: "Когда", text: "По субботам утром (удобное время подберём при записи)" },
              { icon: "🧩", title: "Группа", text: "Мини-группа с вниманием к каждому ребёнку" },
              { icon: "🎓", title: "Уровень", text: "Игровой Pre-A1: первые фразы, звуки, словарь по темам" }
            ].map((item, index) => (
              <Card key={index}>
                <CardContent className="p-6 text-center">
                  <div className="text-3xl mb-3">{item.icon}</div>
                  <h3 className="font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Learning Outcomes */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-12">Чему научится ребёнок</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: "🧠", title: "Слушать и понимать", text: "Распознавать знакомые фразы и инструкции на занятии" },
              { icon: "🗣️", title: "Говорить простое", text: "Приветствия, просьбы, ответы «да/нет», короткие фразы" },
              { icon: "🧩", title: "Словарь по темам", text: "Цвета, игрушки, животные, семья, еда, базовые действия" },
              { icon: "🤗", title: "Уверенность", text: "Не бояться говорить, общаться в группе и участвовать в играх" }
            ].map((item, index) => (
              <Card key={index} className="h-full">
                <CardContent className="p-6 text-center">
                  <div className="text-3xl mb-3">{item.icon}</div>
                  <h3 className="font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* What to Bring */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-center mb-8">Что взять с собой</h2>
          <div className="text-center">
            <p className="text-lg leading-relaxed">
              Сменную обувь, бутылочку воды, любимую маленькую игрушку (по желанию). О перекусах и особенностях питания сообщите администратору при записи.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-gradient-to-r from-primary/5 to-primary/10">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold mb-4">Хочу попробовать</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Запишитесь на бесплатный пробный — познакомимся, покажем формат и подскажем подходящую группу.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4">
            <Button asChild size="lg">
              <Link to="/contacts?course=minisadik">Записаться на пробный</Link>
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              onClick={handleWhatsApp}
              className="gap-2"
            >
              <MessageCircle className="w-5 h-5" />
              WhatsApp
            </Button>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-12">Стоимость и оплата</h2>
          
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {[
              { icon: "💳", title: "Удобная оплата", text: "Безнал, рассрочка — подберём комфортный вариант" },
              { icon: "👨‍👩‍👧", title: "Семейно выгоднее", text: "Скидки на совместное обучение братьев и сестёр" },
              { icon: "🧾", title: "Материнский капитал", text: "В O'KEY ENGLISH можно оплатить обучение маткапиталом" }
            ].map((item, index) => (
              <Card key={index}>
                <CardContent className="p-6 text-center">
                  <div className="text-3xl mb-3">{item.icon}</div>
                  <h3 className="font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="text-center">
            <p className="text-muted-foreground">
              Мы формируем персональное предложение под ваш график и формат — уточните у менеджера.
            </p>
          </div>
        </div>
      </section>

      {/* Schedule */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold mb-6">Расписание</h2>
          <p className="text-lg mb-8 leading-relaxed">
            Мини-садик проходит по субботам утром. Актуальные места и время — в расписании. Если не нашли удобный слот, оставьте заявку — предложим альтернативы.
          </p>
          
          <Button asChild variant="outline" size="lg">
            <Link to="/contacts">Смотреть расписание</Link>
          </Button>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-center mb-12">Вопросы родителей</h2>
          
          <Accordion type="single" collapsible className="space-y-4">
            {[
              {
                q: "Подойдёт ли ребёнку без опыта английского?",
                a: "Да. Формат — игровой, без стресса. Мы начинаем с простых фраз и действий, чтобы ребёнок постепенно вливался."
              },
              {
                q: "Ребёнок стесняется — не будет ли тяжело?",
                a: "Мы поддерживаем мягкую адаптацию: короткие активности, позитивная обратная связь, участие по желанию. Обычно через 1–2 встречи дети раскрываются."
              },
              {
                q: "Сколько детей в группе?",
                a: "Мини-группа. Набор ограничен, чтобы педагог уделял внимание каждому. Актуальные места подскажем при записи."
              },
              {
                q: "Нужны ли тетради и учебники?",
                a: "Дошкольный курс — про движение и творчество. Материалы готовим мы, ничего покупать не требуется."
              },
              {
                q: "Если ребёнок пропустил субботу?",
                a: "Дадим материалы для дома и подскажем, как наверстать. Возможны альтернативные даты — уточняйте у администратора."
              },
              {
                q: "Можно остаться родителю?",
                a: "Первые встречи — да, по согласованию, чтобы ребёнку было спокойнее. Далее рекомендуем самостоятельность, чтобы он увереннее общался с педагогом и группой."
              }
            ].map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent>
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 px-4 bg-gradient-to-r from-primary to-primary-hover text-primary-foreground">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold mb-4">Запишитесь на пробный</h2>
          <p className="text-lg mb-8 opacity-90">
            Оставьте контакты — согласуем день и познакомим ребёнка с мини-садиком.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" variant="secondary">
              <Link to="/contacts?course=minisadik">Оставить заявку</Link>
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              onClick={handleWhatsApp}
              className="gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <MessageCircle className="w-5 h-5" />
              WhatsApp
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default MiniSadik;