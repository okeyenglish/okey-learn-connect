import { Button } from "@/components/ui/button";
import { MapPin, Phone, MessageCircle, UserCheck } from "lucide-react";
import ScheduleTable from "@/components/ScheduleTable";

export default function LocationKotelniki() {


  return (
    <div className="min-h-screen py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl lg:text-5xl font-bold mb-4">
            Филиал <span className="text-gradient">Котельники</span>
          </h1>
          <div className="flex items-center justify-center gap-2 text-lg text-muted-foreground mb-6">
            <MapPin className="w-5 h-5 text-primary" />
            <span>2-й Покровский проезд, 14к2</span>
          </div>
          
          <Button variant="hero" className="flex items-center gap-2">
            <UserCheck className="w-4 h-4" />
            Пробный урок
          </Button>
        </div>

        {/* Schedule Section */}
        <div className="mt-16">
          <ScheduleTable branchName="Котельники" />
        </div>
      </div>
    </div>
  );
}