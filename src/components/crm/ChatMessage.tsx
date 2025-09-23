import { useState } from 'react';
import { Phone, PhoneCall, Play, FileSpreadsheet, Edit2, Check, X, Forward, Trash2, CheckCheck, MessageCircle, User, CheckCircle, XCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { AttachedFile } from "./AttachedFile";
import { MessageReadIndicator } from "./MessageReadIndicator";
import { MessageReactions } from "./MessageReactions";

interface ChatMessageProps {
  type: 'client' | 'manager' | 'system' | 'comment';
  message: string;
  time: string;
  systemType?: 'missed-call' | 'call-record' | 'comment';
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
  clientAvatar?: string;
  managerName?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  whatsappChatId?: string;
  greenApiMessageId?: string;
}

export const ChatMessage = ({ type, message, time, systemType, callDuration, isEdited, editedTime, isSelected, onSelectionChange, isSelectionMode, messageId, isForwarded, forwardedFrom, forwardedFromType, onMessageEdit, onMessageDelete, messageStatus, clientAvatar, managerName, fileUrl, fileName, fileType, whatsappChatId, greenApiMessageId }: ChatMessageProps) => {
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

    // Default system message display (for task notifications)
    if (message.includes('создана на')) {
      return (
        <div className="flex justify-center my-2">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 max-w-md">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Plus className="h-3 w-3 text-blue-600" />
              </div>
              <div className="text-xs text-blue-800 font-medium">{message}</div>
            </div>
          </div>
        </div>
      );
    }

    if (message.includes('успешно завершена')) {
      return (
        <div className="flex justify-center my-2">
          <div className="bg-green-50 border border-green-200 rounded-lg p-2 max-w-md">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle className="h-3 w-3 text-green-600" />
              </div>
              <div className="text-xs text-green-800 font-medium">{message}</div>
            </div>
          </div>
        </div>
      );
    }

    if (message.includes('отменена')) {
      return (
        <div className="flex justify-center my-2">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 max-w-md">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                <XCircle className="h-3 w-3 text-orange-600" />
              </div>
              <div className="text-xs text-orange-800 font-medium">{message}</div>
            </div>
          </div>
        </div>
      );
    }

    // Other system messages
    return (
      <div className="flex justify-center my-2">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 max-w-md">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <div className="text-xs text-blue-600 font-medium">Менеджер поддержки</div>
              <div className="text-sm text-blue-800">{message}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Отображение комментария
  if (type === 'comment') {
    return (
      <div className="flex justify-end mb-4">
        <div className="flex items-start gap-3 max-w-xs lg:max-w-md xl:max-w-lg">
          {isSelectionMode && (
            <div className="flex items-center pt-2">
              <Checkbox
                checked={isSelected}
                onCheckedChange={onSelectionChange}
                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
            </div>
          )}
          <div className="order-2">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <div className="order-1">
            <div className="text-xs text-muted-foreground mb-1 text-right flex items-center gap-1">
              <span className="text-amber-600">{managerName || "Менеджер"}</span>
              <span className="text-amber-500">•</span>
              <span className="text-amber-500 text-xs">комментарий</span>
            </div>
            <div className="rounded-2xl p-3 bg-amber-50 text-slate-800 rounded-tr-md border border-amber-200">
              <p className="text-sm leading-relaxed">{message}</p>
            </div>
            <div className="flex items-center mt-1 text-xs text-muted-foreground justify-end">
              <span>{time}</span>
            </div>
          </div>
        </div>
      </div>
    );
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
        
        {/* Аватарка клиента (только для сообщений клиента) */}
        {type === 'client' && (
          <div className="flex-shrink-0">
            {clientAvatar ? (
              <img 
                src={(clientAvatar || '').replace(/^http:\/\//i, 'https://')} 
                alt="Client avatar" 
                className="w-10 h-10 rounded-full object-cover border-2 border-green-200"
                loading="lazy"
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
                onError={(e) => {
                  const target = e.currentTarget as HTMLImageElement;
                  target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNGM0Y0RjYiLz4KPGF1Y2NsZSBjeD0iMjAiIGN5PSIxNiIgcj0iNiIgZmlsbD0iIzlDQTNBRiIvPgo8cGF0aCBkPSJNMzAgMzBDMzAgMjYuNjg2MyAyNi42Mjc0IDI0IDIyLjUgMjRIMTcuNUMxMy4zNzI2IDI0IDEwIDI2LjY4NjMgMTAgMzBWMzBIMzBWMzBaIiBmaWxsPSIjOUNBM0FGIi8+Cjwvc3ZnPgo=';
                }}
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <div className="w-6 h-6 rounded-full bg-green-200 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
              </div>
            )}
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
                  <div>
                    <p className="text-sm leading-relaxed">{editedMessage}</p>
                    {systemType === 'comment' && managerName && (
                      <div className="text-xs text-amber-700 mt-1 flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" />
                        Комментарий от {managerName}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Attached file */}
                {fileUrl && fileName && fileType && (
                  <div className="mt-2">
                    <AttachedFile
                      url={fileUrl}
                      name={fileName}
                      type={fileType}
                      className="max-w-xs"
                      chatId={whatsappChatId}
                      messageId={greenApiMessageId}
                    />
                  </div>
                )}
                
                {type === 'manager' && message !== '[Сообщение удалено]' && (
                  <div className="absolute top-1 right-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-6 w-6 p-0 text-slate-600 hover:bg-slate-200 hover:text-slate-800"
                      onClick={() => setIsEditing(true)}
                      title="Редактировать сообщение"
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    {onMessageDelete && messageId && (
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-6 w-6 p-0 text-red-600 hover:bg-red-100 hover:text-red-800"
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
            {type === 'manager' && messageId && message !== '[Сообщение удалено]' && (
              <div className="ml-2 flex items-center">
                <MessageReadIndicator 
                  messageId={messageId} 
                  isOutgoing={true}
                  authorName={managerName || "Менеджер"}
                  authorAvatar={undefined}
                />
              </div>
            )}
            {type === 'client' && messageId && (
              <div className="ml-2 flex items-center">
                <MessageReadIndicator 
                  messageId={messageId} 
                  isOutgoing={false}
                  authorName="Клиент"
                  authorAvatar={clientAvatar}
                />
              </div>
            )}
          </div>
          
          {/* Реакции на сообщения */}
          {messageId && (type === 'client' || type === 'manager') && (
            <div className="mt-2">
              <MessageReactions 
                messageId={messageId} 
                showAddButton={true}
                className="justify-start"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};