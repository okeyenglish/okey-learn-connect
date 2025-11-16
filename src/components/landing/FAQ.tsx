import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useState } from 'react';
import { Search, ThumbsUp, ThumbsDown, MessageCircle, DollarSign, Settings, Plug } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import ScrollReveal from '@/components/effects/ScrollReveal';

type FAQCategory = 'general' | 'pricing' | 'technical' | 'integrations';

export default function FAQ() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FAQCategory | 'all'>('all');

  const categories = [
    { id: 'all' as const, label: 'Все', icon: MessageCircle, count: 9 },
    { id: 'general' as const, label: 'Общие', icon: MessageCircle, count: 2 },
    { id: 'pricing' as const, label: 'Тарифы', icon: DollarSign, count: 3 },
    { id: 'technical' as const, label: 'Технические', icon: Settings, count: 2 },
    { id: 'integrations' as const, label: 'Интеграции', icon: Plug, count: 2 },
  ];

  const faqs = [
    {
      question: 'Чем Академиус отличается от обычного CRM?',
      answer: 'Академиус — это не просто CRM, а комплексная платформа, которая объединяет управление школой, работу преподавателя и взаимодействие с родителями. Вы получаете не только воронку продаж, но и расписание, финансы, зарплаты, журнал занятий и приложение для родителей — всё в одной системе.',
      category: 'general' as const,
      helpful: 124,
      notHelpful: 3
    },
    {
      question: 'Можно ли перенести данные из текущей системы или Excel?',
      answer: 'Да, мы поможем перенести ваши данные из Excel, Google Таблиц или другой CRM. Наша команда проведет вас через процесс миграции, чтобы переход был максимально плавным.',
      category: 'technical' as const,
      helpful: 89,
      notHelpful: 5
    },
    {
      question: 'Как учитываются зарплаты преподавателей?',
      answer: 'Вы можете настроить любую схему оплаты: за академический час, за урок, за ученика, фиксированная ставка или комбинированная модель. Система автоматически рассчитывает зарплату на основе реально проведенных занятий и посещаемости учеников.',
      category: 'pricing' as const,
      helpful: 156,
      notHelpful: 2
    },
    {
      question: 'Есть ли мобильное приложение для родителей?',
      answer: 'Да, мы разрабатываем мобильное приложение для родителей, где они смогут видеть расписание, домашние задания, прогресс ребенка и оплачивать занятия. На данный момент доступна веб-версия с адаптивным дизайном для мобильных устройств.',
      category: 'general' as const,
      helpful: 201,
      notHelpful: 8
    },
    {
      question: 'Можно ли использовать только часть модулей?',
      answer: 'Да, вы можете начать с базовых модулей (например, только CRM или только расписание) и постепенно подключать дополнительные функции по мере роста вашей школы. Мы предлагаем гибкие тарифы под ваши задачи.',
      category: 'pricing' as const,
      helpful: 78,
      notHelpful: 4
    },
    {
      question: 'Какие интеграции поддерживаются?',
      answer: 'Мы интегрируемся с WhatsApp, Telegram, Zoom, Google Meet, ЮKassa, Stripe, Сбербанк Онлайн, Яндекс.Метрика и многими другими сервисами. Список интеграций постоянно расширяется.',
      category: 'integrations' as const,
      helpful: 112,
      notHelpful: 1
    },
    {
      question: 'Какая техподдержка предоставляется?',
      answer: 'Мы предоставляем круглосуточную поддержку через чат, email и телефон. Также доступна база знаний с видеоинструкциями и регулярные вебинары для пользователей.',
      category: 'technical' as const,
      helpful: 145,
      notHelpful: 7
    },
    {
      question: 'Есть ли пробный период?',
      answer: 'Да, мы предоставляем 14-дневный бесплатный пробный период со всеми функциями без ограничений. Кредитная карта не требуется для активации.',
      category: 'pricing' as const,
      helpful: 289,
      notHelpful: 2
    },
    {
      question: 'Как работает интеграция с WhatsApp?',
      answer: 'Интеграция с WhatsApp позволяет автоматически получать заявки из мессенджера в CRM, отправлять уведомления о занятиях и платежах, а также вести переписку с клиентами прямо из системы.',
      category: 'integrations' as const,
      helpful: 167,
      notHelpful: 3
    }
  ];

  const filteredFaqs = faqs.filter(faq => {
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    const matchesSearch = 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <section id="faq" className="py-20 bg-background" aria-labelledby="faq-heading">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <ScrollReveal>
            <h2 id="faq-heading" className="text-3xl md:text-4xl font-bold mb-4 text-center">
              Частые вопросы
            </h2>
            <p className="text-muted-foreground text-center mb-8">
              Не нашли ответ? Напишите нам в чат или спросите AI-ассистента
            </p>
          </ScrollReveal>

          <ScrollReveal delay={100}>
            <div className="mb-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Поиск по вопросам..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12"
                />
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={200}>
            <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
              {categories.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                      selectedCategory === cat.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card border border-border hover:border-primary'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {cat.label}
                    <Badge variant="secondary" className="ml-1">
                      {cat.count}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </ScrollReveal>

          {filteredFaqs.length === 0 ? (
            <ScrollReveal delay={300}>
              <div className="text-center py-12 bg-card rounded-lg border border-border">
                <p className="text-muted-foreground mb-4">
                  Ничего не найдено по запросу "{searchQuery}"
                </p>
                <button className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                  🤖 Спросить AI-ассистента
                </button>
              </div>
            </ScrollReveal>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {filteredFaqs.map((faq, index) => (
                <ScrollReveal key={index} delay={300 + index * 50}>
                  <AccordionItem value={`item-${index}`}>
                    <AccordionTrigger className="text-left hover:no-underline">
                      <span className="pr-4">{faq.question}</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="text-muted-foreground mb-4">
                        {searchQuery && (
                          <div 
                            dangerouslySetInnerHTML={{
                              __html: faq.answer.replace(
                                new RegExp(searchQuery, 'gi'),
                                (match) => `<mark class="bg-primary/20">${match}</mark>`
                              )
                            }}
                          />
                        )}
                        {!searchQuery && faq.answer}
                      </div>
                      <div className="flex items-center gap-4 pt-4 border-t border-border">
                        <span className="text-sm text-muted-foreground">Полезно?</span>
                        <button className="flex items-center gap-2 text-sm hover:text-primary transition-colors">
                          <ThumbsUp className="w-4 h-4" />
                          <span>{faq.helpful}</span>
                        </button>
                        <button className="flex items-center gap-2 text-sm hover:text-destructive transition-colors">
                          <ThumbsDown className="w-4 h-4" />
                          <span>{faq.notHelpful}</span>
                        </button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </ScrollReveal>
              ))}
            </Accordion>
          )}

          <ScrollReveal delay={400}>
            <div className="mt-12 p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">Не нашли ответ?</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Спросите AI-ассистента или свяжитесь с нашей службой поддержки
                  </p>
                  <button className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                    Задать вопрос AI
                  </button>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
