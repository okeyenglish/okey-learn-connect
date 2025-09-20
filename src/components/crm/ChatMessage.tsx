import { Phone, PhoneCall, Play, FileSpreadsheet, Edit2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

interface ChatMessageProps {
  type: 'client' | 'manager' | 'system';
  message: string;
  time: string;
  systemType?: 'missed-call' | 'call-record';
  callDuration?: string;
  isEdited?: boolean;
  editedTime?: string;
}

export const ChatMessage = ({ type, message, time, systemType, callDuration, isEdited, editedTime }: ChatMessageProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedMessage, setEditedMessage] = useState(message);

  const handleSaveEdit = () => {
    setIsEditing(false);
    // Here you would save the edited message to your backend
    console.log('Saving edited message:', editedMessage);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedMessage(message);
  };
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
      <div className={`max-w-xs lg:max-w-md xl:max-w-lg rounded-lg p-3 relative group ${
        type === 'manager' 
          ? 'bg-green-500 text-white' 
          : 'bg-muted'
      }`}>
        {isEditing ? (
          <div className="space-y-2">
            <Input
              value={editedMessage}
              onChange={(e) => setEditedMessage(e.target.value)}
              className="text-sm bg-white/10 border-white/20 text-white placeholder:text-white/70"
              onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()}
            />
            <div className="flex items-center gap-1 justify-end">
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-white hover:bg-white/20" onClick={handleSaveEdit}>
                <Check className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-white hover:bg-white/20" onClick={handleCancelEdit}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm leading-relaxed">{editedMessage}</p>
            {type === 'manager' && (
              <Button 
                size="sm" 
                variant="ghost" 
                className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-white hover:bg-white/20"
                onClick={() => setIsEditing(true)}
              >
                <Edit2 className="h-3 w-3" />
              </Button>
            )}
          </>
        )}
        <div className="flex items-center justify-between mt-1">
          <span className={`text-xs ${
            type === 'manager' ? 'opacity-70' : 'text-muted-foreground'
          }`}>
            {time}
            {isEdited && editedTime && (
              <span className="ml-2">отредактировано {editedTime}</span>
            )}
          </span>
          {type === 'manager' && !isEditing && (
            <span className="text-xs opacity-70">Оксана Ветрова</span>
          )}
        </div>
      </div>
    </div>
  );
};