import { Phone, PhoneCall, Play, FileSpreadsheet, Edit2, Check, X, Forward, Trash2, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

interface ChatMessageProps {
  type: 'client' | 'manager' | 'system';
  message: string;
  time: string;
  systemType?: 'missed-call' | 'call-record';
  callDuration?: string;
  isEdited?: boolean;
  editedTime?: string;
  isSelected?: boolean;
  onSelectionChange?: (selected: boolean) => void;
  isSelectionMode?: boolean;
  messageId?: string;
  isForwarded?: boolean;
  forwardedFrom?: string;
  forwardedFromType?: 'client' | 'teacher' | 'corporate';
  onMessageEdit?: (messageId: string, newMessage: string) => Promise<void>;
  onMessageDelete?: (messageId: string) => Promise<void>;
  messageStatus?: 'sent' | 'delivered' | 'read' | 'queued';
}

export const ChatMessage = ({ type, message, time, systemType, callDuration, isEdited, editedTime, isSelected, onSelectionChange, isSelectionMode, messageId, isForwarded, forwardedFrom, forwardedFromType, onMessageEdit, onMessageDelete, messageStatus }: ChatMessageProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedMessage, setEditedMessage] = useState(message);

  const handleSaveEdit = async () => {
    if (editedMessage.trim() === message.trim()) {
      setIsEditing(false);
      return;
    }

    try {
      if (!messageId) {
        setIsEditing(false);
        return;
      }
      // Обновляем сообщение в базе данных
      const { error } = await supabase
        .from('chat_messages')
        .update({ 
          message_text: editedMessage.trim()
        })
        .eq('id', messageId);

      if (error) {
        console.error('Error updating message:', error);
        return;
      }

      // Если это исходящее сообщение менеджера, отправляем исправление клиенту и обновляем список
      if (type === 'manager' && onMessageEdit && messageId) {
        await onMessageEdit(messageId, editedMessage.trim());
      }

      setIsEditing(false);
      console.log('Message updated successfully');
    } catch (error) {
      console.error('Error saving edited message:', error);
    }
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
    return null;
  }

  return (
    <div className={`flex ${type === 'manager' ? 'justify-end' : 'justify-start'} mb-4 ${isSelectionMode ? 'hover:bg-muted/20 p-2 rounded-lg' : ''}`}>
      <div className="flex items-start gap-3 max-w-xs lg:max-w-md xl:max-w-lg">
        {/* Чекбокс для выделения сообщений */}
        {isSelectionMode && (
          <div className="flex items-center pt-2">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelectionChange}
              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
          </div>
        )}
        {type === 'manager' && (
          <div className="order-2">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <div className="w-6 h-6 rounded-full bg-blue-200 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-blue-400"></div>
              </div>
            </div>
          </div>
        )}
        <div className={`relative group ${type === 'manager' ? 'order-1' : ''}`}>
          {/* Индикатор пересланного сообщения */}
          {isForwarded && (
            <div className="flex items-center gap-1 mb-2 text-xs text-muted-foreground">
              <Forward className="h-3 w-3" />
              <span>
                Переслано из: 
                <Badge variant="secondary" className="ml-1 text-xs">
                  {forwardedFromType === 'client' ? 'Клиент' : 
                   forwardedFromType === 'teacher' ? 'Преподаватель' : 
                   forwardedFromType === 'corporate' ? 'Корп. чат' : 'Чат'}: {forwardedFrom}
                </Badge>
              </span>
            </div>
          )}
          
          {type === 'manager' && !isEditing && (
            <div className="text-xs text-muted-foreground mb-1 text-right">
              Менеджер поддержки
            </div>
          )}
          <div className={`rounded-2xl p-3 relative ${
            isForwarded ? 'border-l-4 border-l-blue-300 bg-blue-50/50' : ''
          } ${
            type === 'manager' 
              ? 'bg-blue-100 text-slate-800 rounded-tr-md' 
              : 'bg-muted rounded-tl-md'
          }`}>
            {isEditing ? (
              <div className="space-y-2">
                <Input
                  value={editedMessage}
                  onChange={(e) => setEditedMessage(e.target.value)}
                  className="text-sm bg-white border-slate-200"
                  onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()}
                />
                <div className="flex items-center gap-1 justify-end">
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-green-600 hover:bg-green-50" onClick={handleSaveEdit}>
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-600 hover:bg-red-50" onClick={handleCancelEdit}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {message === '[Сообщение удалено]' ? (
                  <p className="text-sm leading-relaxed italic text-muted-foreground">*Данное сообщение удалено*</p>
                ) : (
                  <p className="text-sm leading-relaxed">{editedMessage}</p>
                )}
                {type === 'manager' && message !== '[Сообщение удалено]' && (
                  <div className="absolute top-1 right-1 flex items-center gap-1">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-6 w-6 p-0 opacity-60 hover:opacity-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800"
                      onClick={() => setIsEditing(true)}
                      title="Редактировать сообщение"
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    {onMessageDelete && messageId && (
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-6 w-6 p-0 opacity-60 hover:opacity-100 text-red-600 hover:bg-red-100 hover:text-red-800"
                        onClick={() => onMessageDelete(messageId)}
                        title="Удалить сообщение"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
          <div className={`flex items-center mt-1 text-xs text-muted-foreground ${
            type === 'manager' ? 'justify-end' : 'justify-start'
          }`}>
            <span>
              {time}
              {isEdited && editedTime && (
                <span className="ml-2">отредактировано {editedTime}</span>
              )}
            </span>
            {type === 'manager' && messageStatus && message !== '[Сообщение удалено]' && (
              <div className="ml-2 flex items-center">
                {messageStatus === 'sent' && <Check className="h-3 w-3 text-muted-foreground" />}
                {messageStatus === 'delivered' && <CheckCheck className="h-3 w-3 text-muted-foreground" />}
                {messageStatus === 'read' && <CheckCheck className="h-3 w-3 text-blue-500" />}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};