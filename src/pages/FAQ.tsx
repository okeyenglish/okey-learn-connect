import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { MessageCircle, Send, Phone } from "lucide-react";
import { Link } from "react-router-dom";

const faqItems = [
  {
    q: "С какого возраста можно начать?",
    a: "Дети — с 3 лет (игровые курсы), школьники и подростки — с программами по уровням CEFR, взрослые — с нуля до C2."
  },
  {
    q: "Какие языки доступны?",
    a: "Английский — основной. Также можно изучать испанский, итальянский, немецкий, французский, китайский и другие — уточните в филиале."
  },
  {
    q: "Как выбрать уровень?",
    a: "Пройдите онлайн-тест и посетите бесплатный пробный урок. Педагог диагностирует речь, грамматику и подскажет оптимальную группу."
  },
  {
    q: "Что происходит на пробном уроке?",
    a: "Знакомство с преподавателем, мини-диагностика и план обучения. По итогу — рекомендации по курсу и расписанию."
  },
  {
    q: "Какие форматы обучения есть?",
    a: "Группы, мини-группы и индивидуально. Очно в филиале и онлайн (можно комбинировать)."
  },
  {
    q: "Сколько человек в группе?",
    a: "Обычно 6–10 человек (мини-группы 3–5). Точные цифры зависят от направления и филиала."
  },
  {
    q: "Сколько длится занятие и как часто они идут?",
    a: "Дети — 45–60 минут, подростки и взрослые — 60–90 минут. Частота 1–3 раза в неделю — подбираем под цель и нагрузку."
  },
  {
    q: "Что, если ребёнок пропустил урок?",
    a: "Дадим конспект/материалы, подскажем, как наверстать. Возможны отработки в разговорном клубе или индивидуально."
  },
  {
    q: "Есть ли домашние задания?",
    a: "Да, в разумном объёме. Для дошкольников — в игровой форме. Для школьников — регулярная практика для прочного результата."
  },
  {
    q: "Кто преподаёт?",
    a: "Опытные преподаватели и носители языка. Используем современные методики и материалы (в т.ч. Cambridge)."
  },
  {
    q: "По каким уровням учитесь?",
    a: "По CEFR: A1–C2. Детские курсы — Super Safari, Kid's Box; школьники — Prepare; взрослые — Empower и др."
  },
  {
    q: "Готовите к экзаменам?",
    a: "Да. ОГЭ/ЕГЭ и международные — Cambridge Exams, IELTS, TOEFL. Поможем выбрать формат и срок подготовки."
  },
  {
    q: "Как вы измеряете прогресс?",
    a: "Стартовая диагностика, промежуточные срезы и отчёт педагога. Если прогресс замедляется — корректируем программу и даём доп.поддержку."
  },
  {
    q: "Сколько стоит обучение и как оплатить?",
    a: "Цена зависит от формата и длительности. Доступна помесячная оплата и безнал. Актуальные тарифы — на странице «Стоимость»."
  },
  {
    q: "Можно ли оплатить материнским капиталом?",
    a: "Да, в O'KEY ENGLISH можно оплачивать обучение материнским капиталом. Менеджер поможет оформить документы."
  },
  {
    q: "Можно ли сменить формат или филиал?",
    a: "Да. Можно перейти в онлайн/оффлайн или на другой адрес школы — подберём удобную группу по уровню и расписанию."
  },
  {
    q: "Материалы включены в стоимость?",
    a: "Используем современные учебники и онлайн-платформы. По курсам материалы могут входить в стоимость или оплачиваться отдельно — подскажем при записи."
  },
  {
    q: "Есть ли занятия в каникулы и праздники?",
    a: "График меняется по филиалам. Мы заранее уведомляем о переносах и предлагаем альтернативные даты."
  },
  {
    q: "Подходит ли обучение детям с особыми образовательными потребностями?",
    a: "Мы стараемся адаптировать формат и темп. Сообщите менеджеру детали — предложим индивидуальный план."
  },
  {
    q: "Как записаться на пробный урок?",
    a: "Нажмите «Записаться на пробный урок», напишите в WhatsApp/Telegram или позвоните — согласуем удобное время."
  }
];

export default function FAQ() {
  const handleWhatsApp = () => {
    window.open("https://wa.me/79937073553", "_blank");
  };

  const handleTelegram = () => {
    window.open("https://t.me/okeyenglish", "_blank");
  };

  const handleCall = () => {
    window.open("tel:+74997073535", "_blank");
  };

  return (
    <div className="min-h-screen py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            FAQ для родителей — O'KEY ENGLISH
          </h1>
          <p className="text-lg text-muted-foreground">
            Коротко о главном: как выбрать курс, как проходят занятия и как записаться на пробный урок.
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="mb-12">
          <Accordion type="single" collapsible className="w-full">
            {faqItems.map((item, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left font-medium">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* CTA Section */}
        <div className="text-center space-y-6">
          <div>
            <Link to="/contacts">
              <Button size="lg" className="btn-hero px-8 py-3 text-lg">
                Записаться на пробный урок
              </Button>
            </Link>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            <Button
              variant="outline"
              size="lg"
              onClick={handleWhatsApp}
              className="flex items-center gap-2"
            >
              <MessageCircle className="w-5 h-5 text-green-600" />
              WhatsApp
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={handleTelegram}
              className="flex items-center gap-2"
            >
              <Send className="w-5 h-5 text-blue-500" />
              Telegram
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={handleCall}
              className="flex items-center gap-2"
            >
              <Phone className="w-5 h-5 text-orange-500" />
              Позвонить
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}