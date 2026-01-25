import { useEffect, useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { MessageCircle, Send, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/typedClient";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
}

export default function FAQ() {
  const [faqItems, setFaqItems] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFAQ = async () => {
      try {
        const { data, error } = await (supabase.from('faq' as any) as any)
          .select('id, question, answer, sort_order')
          .eq('is_published', true)
          .order('sort_order', { ascending: true });

        if (error) {
          console.error('Error loading FAQ:', error);
        } else {
          setFaqItems(data || []);
        }
      } catch (error) {
        console.error('Error loading FAQ:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFAQ();
  }, []);

  const handleWhatsApp = () => {
    window.open("https://wa.me/79937073553", "_blank");
  };

  const handleTelegram = () => {
    window.open("https://t.me/okeyenglish", "_blank");
  };

  const handleCall = () => {
    window.open("tel:+74997073535", "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Загрузка вопросов...</p>
          </div>
        </div>
      </div>
    );
  }

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
              <AccordionItem key={item.id} value={`item-${item.id}`}>
                <AccordionTrigger className="text-left font-medium">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  {item.answer}
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