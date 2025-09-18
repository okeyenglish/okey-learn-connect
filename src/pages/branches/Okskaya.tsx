import { Button } from "@/components/ui/button";
import { MapPin, Phone, MessageCircle, UserCheck } from "lucide-react";
import ScheduleTable from "@/components/ScheduleTable";
import PriceCalculator from "@/components/PriceCalculator";
import YandexReviews from "@/components/YandexReviews";

export default function LocationOkskaya() {
  return (
    <div className="min-h-screen py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl lg:text-5xl font-bold mb-4">
            Филиал <span className="text-gradient">Окская</span>
          </h1>
          <div className="flex items-center justify-center gap-2 text-lg text-muted-foreground mb-6">
            <MapPin className="w-5 h-5 text-primary" />
            <span>ул. Окская, д. 3, корп. 1</span>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="hero" className="flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              Пробный урок
            </Button>
          </div>
        </div>

        {/* Reviews from Yandex Maps */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">Отзывы с Яндекс.Карт</h2>
          <YandexReviews 
            orgId="1276487501"
            orgUrl="https://yandex.ru/maps/org/1276487501"
            orgTitle="O'KEY ENGLISH Окская на Яндекс.Картах"
            height={600}
            maxWidth={800}
          />
        </div>

        {/* Price Calculator Section */}
        <div className="mt-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Рассчитайте стоимость обучения</h2>
            <p className="text-lg text-muted-foreground mb-8">
              Узнайте точную стоимость с учетом всех скидок и получите 2 подарка!
            </p>
          </div>
          <PriceCalculator preSelectedBranch="okskaya" />
        </div>

        {/* Schedule Section */}
        <div className="mt-16">
          <ScheduleTable branchName="Окская" />
        </div>
      </div>
    </div>
  );
}