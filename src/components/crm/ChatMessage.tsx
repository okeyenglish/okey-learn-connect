import { Phone, PhoneCall, Play, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatMessageProps {
  type: 'client' | 'manager' | 'system';
  message: string;
  time: string;
  systemType?: 'missed-call' | 'call-record';
  callDuration?: string;
}

export const ChatMessage = ({ type, message, time, systemType, callDuration }: ChatMessageProps) => {
  if (type === 'system') {
    if (systemType === 'missed-call') {
      return (
        <div className="flex justify-center my-2">
          <div className="bg-red-50 border border-red-200 rounded-lg p-2 flex items-center gap-2">
            <Phone className="h-4 w-4 text-red-600" />
            <span className="text-sm text-red-600">Пропущенный звонок</span>
            <Button size="sm" variant="outline" className="text-red-600 h-7 px-2">
              <PhoneCall className="h-3 w-3" />
            </Button>
          </div>
        </div>
      );
    }
    
    if (systemType === 'call-record') {
      return (
        <div className="flex justify-center my-2">
          <div className="bg-green-50 border border-green-200 rounded-lg p-2 flex items-center gap-2">
            <Phone className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-600">Звонок ({callDuration})</span>
            <Button size="sm" variant="outline" className="text-green-600 h-7 px-2">
              <Play className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="outline" className="text-green-600 h-7 px-2">
              <FileSpreadsheet className="h-3 w-3" />
            </Button>
          </div>
        </div>
      );
    }
  }

  return (
    <div className={`flex ${type === 'manager' ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`max-w-xs lg:max-w-md xl:max-w-lg rounded-lg p-3 ${
        type === 'manager' 
          ? 'bg-green-500 text-white' 
          : 'bg-muted'
      }`}>
        <p className="text-sm leading-relaxed">{message}</p>
        <div className="flex items-center justify-between mt-1">
          <span className={`text-xs ${
            type === 'manager' ? 'opacity-70' : 'text-muted-foreground'
          }`}>
            {time}
          </span>
          {type === 'manager' && (
            <span className="text-xs opacity-70">Оксана Ветрова</span>
          )}
        </div>
      </div>
    </div>
  );
};