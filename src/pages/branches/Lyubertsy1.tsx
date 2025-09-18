import { Button } from "@/components/ui/button";
import { MapPin, UserCheck } from "lucide-react";
import ScheduleTable from "@/components/ScheduleTable";
import PriceCalculator from "@/components/PriceCalculator";
import YandexReviews from "@/components/YandexReviews";

export default function LocationLyubertsy1() {

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl lg:text-5xl font-bold mb-4">
            Филиал <span className="text-gradient">Люберцы</span>
          </h1>
          <div className="flex items-center justify-center gap-2 text-lg text-muted-foreground mb-6">
            <MapPin className="w-5 h-5 text-primary" />
            <span>3 Почтовое отделение, 65к1</span>
          </div>
          
          <Button variant="hero" className="flex items-center gap-2">
            <UserCheck className="w-4 h-4" />
            Пробный урок
          </Button>
        </div>

        {/* Reviews from Yandex Maps */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">Отзывы с Яндекс.Карт</h2>
          {/* TODO: Добавить ID организации для Люберцы-1 */}
          <div className="text-center text-muted-foreground">
            <p>Отзывы для этого филиала будут добавлены после получения ID организации на Яндекс.Картах</p>
          </div>
        </div>

        {/* Price Calculator Section */}
        <div className="mt-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Рассчитайте стоимость обучения</h2>
            <p className="text-lg text-muted-foreground mb-8">
              Узнайте точную стоимость с учетом всех скидок и получите 2 подарка!
            </p>
          </div>
          <PriceCalculator preSelectedBranch="lyubertsy-1" />
        </div>

        {/* Schedule Section */}
        <div className="mt-16">
          <ScheduleTable branchName="Люберцы" />
        </div>
      </div>
    </div>
  );
}