import { Button } from "@/components/ui/button";
import { MapPin, Phone, MessageCircle, UserCheck } from "lucide-react";

export default function LocationNovokosino() {
  return (
    <div className="min-h-screen py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl lg:text-5xl font-bold mb-4">
            Филиал <span className="text-gradient">Новокосино</span>
          </h1>
          <div className="flex items-center justify-center gap-2 text-lg text-muted-foreground mb-6">
            <MapPin className="w-5 h-5 text-primary" />
            <span>Реутов, Юбилейный проспект, 60</span>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={() => window.open("tel:+74997073535")} className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Позвонить
            </Button>
            <Button variant="outline" onClick={() => window.open("https://wa.me/74997073535")} className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </Button>
            <Button variant="hero" className="flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              Пробный урок
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}