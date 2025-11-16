import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import ScrollReveal from '@/components/effects/ScrollReveal';

const faqs = [
  {
    question: 'Как быстро можно начать пользоваться платформой?',
    answer: 'Вы можете настроить базовый функционал за 10 минут. Наш AI-ассистент проведёт вас через все шаги, и вы сразу сможете начать работать с системой.'
  },
  {
    question: 'Действительно ли это бесплатно?',
    answer: 'Да, все основные функции Академиус полностью бесплатны: CRM, расписание, журнал, приложения для преподавателей и родителей. Навсегда.'
  },
  {
    question: 'Нужно ли устанавливать программу?',
    answer: 'Нет, Академиус работает в браузере. Также доступны мобильные приложения для iOS и Android для преподавателей и родителей.'
  },
  {
    question: 'Можно ли подключить WhatsApp и Telegram?',
    answer: 'Да, вы можете интегрировать популярные мессенджеры для приёма заявок и общения с клиентами. Все сообщения будут в единой CRM.'
  },
  {
    question: 'Как работает AI-ассистент?',
    answer: 'AI помогает генерировать планы уроков, отвечать на вопросы родителей, анализировать успеваемость и автоматизировать рутинные задачи. Он доступен в любое время.'
  }
];

export const FAQSection = () => {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <ScrollReveal>
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-primary mb-4">
              Часто задаваемые вопросы
            </h2>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.2}>
          <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq, index) => (
                <AccordionItem 
                  key={index} 
                  value={`item-${index}`}
                  className="bg-card border border-border rounded-lg px-6"
                >
                  <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};
