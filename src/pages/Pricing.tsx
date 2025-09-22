import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import PriceCalculator from "@/components/PriceCalculator";
import PricingModal from "@/components/PricingModal";
import { 
  Users, 
  UserCheck, 
  User, 
  Zap, 
  Monitor, 
  Building2,
  Puzzle,
  Clock,
  Target,
  MapPin,
  GraduationCap,
  Calendar,
  TestTube,
  BookOpen,
  MessageCircle,
  TrendingUp,
  Headphones,
  Users2,
  Package,
  Handshake,
  Briefcase,
  CreditCard,
  Phone,
  MessageSquare
} from "lucide-react";

const plans = [
  {
    name: "Группа",
    tag: "выгоднее всего",
    bullets: [
      "6–10 человек, активная практика",
      "2–3 раза в неделю",
      "Отлично для системного прогресса"
    ],
    icon: Users
  },
  {
    name: "Мини-группа",
    tag: "больше внимания",
    bullets: [
      "3–5 человек",
      "Гибкое расписание",
      "Баланс цены и персонализации"
    ],
    icon: UserCheck
  },
  {
    name: "Индивидуально",
    tag: "максимальный прогресс",
    bullets: [
      "Программа под цель: экзамен, работа, переезд",
      "Любой график",
      "Быстрая обратная связь"
    ],
    icon: User
  },
  {
    name: "Интенсив / Экспресс",
    tag: "в короткий срок",
    bullets: [
      "Ускоренные модули",
      "Подготовка к экзаменам",
      "Подходит для дедлайнов"
    ],
    icon: Zap
  },
  {
    name: "Онлайн / Очно",
    tag: "на выбор",
    bullets: [
      "Занимайтесь из любой точки",
      "Или приходите в филиал «Окская»",
      "Можно комбинировать"
    ],
    icon: Monitor
  },
  {
    name: "Корпоративное обучение",
    tag: "для компаний",
    bullets: [
      "Тестирование сотрудников",
      "График под отделы",
      "Отчётность и KPI"
    ],
    icon: Building2
  }
];

const priceFactors = [
  { icon: Puzzle, title: "Формат занятий", text: "Группа, мини-группа, индивидуально" },
  { icon: Clock, title: "Частота и длительность", text: "Количество уроков и их продолжительность" },
  { icon: Target, title: "Цель и уровень", text: "CEFR, подготовка к экзаменам, интенсивность" },
  { icon: MapPin, title: "Филиал или онлайн", text: "Учитываем удобство и логистику" },
  { icon: GraduationCap, title: "Преподаватель", text: "В т.ч. занятия с носителем" },
  { icon: Calendar, title: "Абонемент", text: "Срок и пакет занятий" }
];

const includedFeatures = [
  { icon: TestTube, title: "Диагностика и пробный", text: "Определим уровень и дадим рекомендации" },
  { icon: BookOpen, title: "Материалы", text: "Современные учебники и онлайн-платформы" },
  { icon: MessageCircle, title: "Практика речи", text: "Разговорные клубы и проекты" },
  { icon: TrendingUp, title: "Контроль прогресса", text: "Промежуточные срезы и отчёты" },
  { icon: Headphones, title: "Поддержка", text: "Связь с преподавателем и менеджером" }
];

const savingOptions = [
  { icon: Users2, title: "Семейная/парная запись", text: "Учиться вместе — выгоднее" },
  { icon: Package, title: "Длительный абонемент", text: "Чем длиннее пакет, тем ниже стоимость урока" },
  { icon: Handshake, title: "Приведи друга", text: "Бонусы за рекомендацию" },
  { icon: Briefcase, title: "Корпоративные пакеты", text: "Нужна команда — сделаем спецусловия" }
];

const faqItems = [
  { 
    q: "Почему нет цен на сайте?", 
    a: "Мы подбираем программу под цель и расписание — так предложение получается честным и без переплаты. Оставьте заявку, подготовим расчёт за 2 минуты." 
  },
  { 
    q: "Есть ли рассрочка?", 
    a: "Да. Подберём удобный график платежей." 
  },
  { 
    q: "Материнский капитал?", 
    a: "Да, можно оплатить обучение. Поможем с документами." 
  },
  { 
    q: "Можно ли сменить формат mid-курса?", 
    a: "Да, при необходимости переведём в онлайн/офлайн, группу или индивидуально — стоимость скорректируем." 
  },
  { 
    q: "Что включено в стоимость?", 
    a: "Диагностика, пробный урок, программа по CEFR, материалы, отчёты о прогрессе и поддержка." 
  }
];

export default function Pricing() {
  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="bg-gradient-hero py-20 text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Гибкая стоимость обучения
          </h1>
          <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto opacity-90">
            Подберём формат и отправим персональное предложение за 2 минуты. Пробный урок — бесплатно.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Button asChild size="lg" className="btn-hero">
              <a href="#calculator">Рассчитать мою стоимость</a>
            </Button>
            <div className="flex gap-3">
              <Button 
                asChild
                variant="outline" 
                size="lg" 
                className="bg-white/10 border-white/30 text-white hover:bg-white/20"
              >
                <a href="https://wa.me/79937073553?text=Здравствуйте! Хочу узнать стоимость обучения английским языком." target="_blank" rel="noopener noreferrer">
                  <Phone className="w-4 h-4 mr-2" />
                  WhatsApp
                </a>
              </Button>
              <Button 
                asChild
                variant="outline" 
                size="lg" 
                className="bg-white/10 border-white/30 text-white hover:bg-white/20"
              >
                <a href="https://t.me/englishmanager" target="_blank" rel="noopener noreferrer">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Telegram
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Price Calculator Section */}
      <section id="calculator" className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Рассчитайте стоимость обучения
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Ответьте на несколько вопросов и получите персональное предложение за 2 минуты
            </p>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <PriceCalculator />
          </div>
        </div>
      </section>

      {/* Plans Section */}
      <section className="py-20 bg-gradient-subtle">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Форматы без привязки к цифрам
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-8">
            {plans.map((plan, index) => {
              const IconComponent = plan.icon;
              return (
                <Card key={index} className="card-elevated hover:scale-105 transition-all duration-300">
                  <CardHeader className="text-center">
                    <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                      <IconComponent className="w-8 h-8 text-white" />
                    </div>
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <div className="inline-block bg-accent/10 text-accent px-3 py-1 rounded-full text-sm font-medium">
                      {plan.tag}
                    </div>
                  </CardHeader>
                  <CardContent className="text-center">
                    <ul className="space-y-3 mb-6">
                      {plan.bullets.map((bullet, bulletIndex) => (
                        <li key={bulletIndex} className="text-muted-foreground">
                          {bullet}
                        </li>
                      ))}
                    </ul>
                    <PricingModal
                      formatName={plan.name}
                      formatDescription={plan.tag}
                      formatIcon={plan.icon}
                    >
                      <Button className="w-full" variant="outline">
                        Узнать стоимость
                      </Button>
                    </PricingModal>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Price Factors Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Как формируется стоимость
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {priceFactors.map((factor, index) => {
              const IconComponent = factor.icon;
              return (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <IconComponent className="w-8 h-8 text-secondary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{factor.title}</h3>
                  <p className="text-muted-foreground">{factor.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Included Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Что входит в обучение
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8">
            {includedFeatures.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <IconComponent className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Saving Options Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Как можно сэкономить
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {savingOptions.map((option, index) => {
              const IconComponent = option.icon;
              return (
                <Card key={index} className="card-elevated text-center">
                  <CardContent className="pt-6">
                    <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <IconComponent className="w-8 h-8 text-accent" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{option.title}</h3>
                    <p className="text-muted-foreground text-sm">{option.text}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Payment and Documents Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <div className="w-20 h-20 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-6">
              <CreditCard className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Оплата и документы
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Оплата картой/по счёту, рассрочка. В O'KEY ENGLISH можно оплатить обучение материнским капиталом — поможем оформить. Заключаем договор, выдаём чек.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Вопросы про стоимость
            </h2>
          </div>
          
          <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="space-y-4">
              {faqItems.map((item, index) => (
                <AccordionItem key={index} value={`item-${index}`} className="border border-border rounded-lg px-6">
                  <AccordionTrigger className="text-left hover:no-underline">
                    <span className="font-semibold">{item.q}</span>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-4">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="bg-gradient-primary text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center py-20">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Хочу персональный расчёт
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">
            Оставьте контакты — пришлём предложение и ближайшие места в группах.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" variant="secondary">
              <a href="#calculator">Рассчитать стоимость</a>
            </Button>
            <div className="flex gap-3">
              <Button 
                asChild
                variant="outline" 
                size="lg" 
                className="bg-white/10 border-white/30 text-white hover:bg-white/20"
              >
                <a href="https://wa.me/79937073553?text=Здравствуйте! Хочу персональный расчет стоимости обучения." target="_blank" rel="noopener noreferrer">
                  <Phone className="w-4 h-4 mr-2" />
                  Написать в WhatsApp
                </a>
              </Button>
              <Button 
                asChild
                variant="outline" 
                size="lg" 
                className="bg-white/10 border-white/30 text-white hover:bg-white/20"
              >
                <a href="https://t.me/englishmanager" target="_blank" rel="noopener noreferrer">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Написать в Telegram
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}