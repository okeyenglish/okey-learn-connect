import { MessageCircle } from 'lucide-react';
import usePageAnalytics from '@/hooks/usePageAnalytics';

export default function FloatingChat() {
  const { trackCTA } = usePageAnalytics();

  const handleWhatsAppClick = () => {
    trackCTA('whatsapp_floating', 'floating_button');
    const phoneNumber = '79161234567'; // Замените на реальный номер
    const message = encodeURIComponent('Здравствуйте! Хочу узнать подробнее про Академиус');
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
  };

  return (
    <button
      onClick={handleWhatsAppClick}
      className="fixed bottom-6 right-6 z-50 group"
      aria-label="Написать в WhatsApp"
    >
      <div className="relative">
        {/* Пульсирующие прямоугольники */}
        <div className="absolute inset-0 bg-green-500 rounded-xl animate-ping opacity-75" />
        <div className="absolute inset-0 bg-green-500 rounded-xl animate-pulse opacity-50" />
        
        {/* Основная кнопка */}
        <div className="relative bg-green-500 hover:bg-green-600 text-white p-4 rounded-xl shadow-2xl transition-all duration-300 group-hover:scale-110">
          <MessageCircle className="w-6 h-6" />
        </div>

        {/* Badge "Онлайн" */}
        <div className="absolute -top-1 -right-1 bg-green-400 text-white text-xs font-bold px-2 py-0.5 rounded-md shadow-lg flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-white rounded-sm animate-pulse" />
          Онлайн
        </div>
      </div>

      {/* Tooltip */}
      <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
        <div className="bg-gray-900 text-white text-sm px-3 py-2 rounded-lg shadow-xl whitespace-nowrap">
          Есть вопросы? Напишите нам!
          <div className="absolute top-full right-4 -mt-1">
            <div className="border-4 border-transparent border-t-gray-900" />
          </div>
        </div>
      </div>
    </button>
  );
}