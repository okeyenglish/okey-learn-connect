import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function FAQ() {
  const faqs = [
    {
      question: 'Чем Академиус отличается от обычного CRM?',
      answer: 'Академиус — это не просто CRM, а комплексная платформа, которая объединяет управление школой, работу преподавателя и взаимодействие с родителями. Вы получаете не только воронку продаж, но и расписание, финансы, зарплаты, журнал занятий и приложение для родителей — всё в одной системе.'
    },
    {
      question: 'Можно ли перенести данные из текущей системы или Excel?',
      answer: 'Да, мы поможем перенести ваши данные из Excel, Google Таблиц или другой CRM. Наша команда проведет вас через процесс миграции, чтобы переход был максимально плавным.'
    },
    {
      question: 'Как учитываются зарплаты преподавателей?',
      answer: 'Вы можете настроить любую схему оплаты: за академический час, за урок, за ученика, фиксированная ставка или комбинированная модель. Система автоматически рассчитывает зарплату на основе реально проведенных занятий и посещаемости учеников.'
    },
    {
      question: 'Есть ли мобильное приложение для родителей?',
      answer: 'Да, мы разрабатываем мобильное приложение для родителей, где они смогут видеть расписание, домашние задания, прогресс ребенка и оплачивать занятия. На данный момент доступна веб-версия с адаптивным дизайном для мобильных устройств.'
    },
    {
      question: 'Можно ли использовать только часть модулей?',
      answer: 'Да, вы можете начать с базовых модулей (например, только CRM или только расписание) и постепенно подключать дополнительные функции по мере роста вашей школы. Мы предлагаем гибкие тарифы под ваши задачи.'
    }
  ];

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center">
            Частые вопросы
          </h2>

          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
