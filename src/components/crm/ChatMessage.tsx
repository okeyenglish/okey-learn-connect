import { useState, useEffect, memo, useMemo } from 'react';
import { Phone, PhoneCall, Play, FileSpreadsheet, Edit2, Check, X, Forward, Trash2, CheckCheck, MessageCircle, User, CheckCircle, XCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/typedClient";
import { OptimizedAttachedFile } from "./OptimizedAttachedFile";
import { MessageReadIndicator } from "./MessageReadIndicator";
import { MessageDeliveryStatus, DeliveryStatus } from "./MessageDeliveryStatus";
import { MessageReactions } from "./MessageReactions";
import { MessageContextMenu } from "./MessageContextMenu";
import { LazyImage } from "./LazyImage";

// URL regex pattern
const URL_REGEX = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g;

// Helper to render text with clickable links
function renderMessageWithLinks(text: string): React.ReactNode {
  const parts = text.split(URL_REGEX);
  if (parts.length === 1) {
    return text;
  }
  return parts.map((part, i) => {
    if (URL_REGEX.test(part)) {
      // Reset regex lastIndex
      URL_REGEX.lastIndex = 0;
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline hover:text-blue-800 break-all"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

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
  onResendMessage?: (messageId: string) => Promise<void>;
  messageStatus?: DeliveryStatus;
  clientAvatar?: string;
  managerName?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  whatsappChatId?: string;
  externalMessageId?: string;
  showAvatar?: boolean;
  showName?: boolean;
  isLastInGroup?: boolean;
  onForwardMessage?: (messageId: string) => void;
  onEnterSelectionMode?: () => void;
  onQuoteMessage?: (text: string) => void;
}

const ChatMessageComponent = ({ type, message, time, systemType, callDuration, isEdited, editedTime, isSelected, onSelectionChange, isSelectionMode, messageId, isForwarded, forwardedFrom, forwardedFromType, onMessageEdit, onMessageDelete, onResendMessage, messageStatus, clientAvatar, managerName, fileUrl, fileName, fileType, whatsappChatId, externalMessageId, showAvatar = true, showName = true, isLastInGroup = true, onForwardMessage, onEnterSelectionMode, onQuoteMessage }: ChatMessageProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedMessage, setEditedMessage] = useState(message);

  // Keep local rendered text in sync with realtime/optimistic updates
  useEffect(() => {
    if (!isEditing) {
      setEditedMessage(message);
    }
  }, [message, isEditing]);

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

  const handleDelete = async () => {
    if (!messageId || !onMessageDelete) return;
    await onMessageDelete(messageId);
  };

  const handleForward = () => {
    if (!messageId || !onForwardMessage) return;
    onForwardMessage(messageId);
  };

  const handleSelectMultiple = () => {
    if (onEnterSelectionMode) {
      onEnterSelectionMode();
    }
  };

  // Detect system-like messages that come with manager type but should be displayed as system
  const isAutoSystemMessage = useMemo(() => {
    const systemPatterns = [
      /^Клиент перемещен в/i,
      /^Клиент перемещён в/i,
      /^Статус изменён/i,
      /^Статус изменен/i,
      /^Новый платёж/i,
      /^Новый платеж/i,
      /^crm_system_/i,
    ];
    return systemPatterns.some(pattern => pattern.test(message));
  }, [message]);

  // If it looks like a system message, render it as simple centered text (same style as SalebotCallbackMessage)
  if (type === 'manager' && isAutoSystemMessage) {
    return (
      <div className="flex justify-center my-1">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60">
          <User className="h-3 w-3 text-muted-foreground/70" />
          <span className="text-muted-foreground/70">{message}</span>
          <span className="text-muted-foreground/40">·</span>
          <span className="text-muted-foreground/40">{time}</span>
        </div>
      </div>
    );
  }

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
              <div className="w-5 h-5 bg-blue-100 rounded flex items-center justify-center flex-shrink-0">
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
              <div className="w-5 h-5 bg-green-100 rounded flex items-center justify-center flex-shrink-0">
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
              <div className="w-5 h-5 bg-orange-100 rounded flex items-center justify-center flex-shrink-0">
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
            <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
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
            <div className="w-10 h-10 rounded bg-amber-100 flex items-center justify-center flex-shrink-0">
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
    <MessageContextMenu
      messageId={messageId}
      messageType={type}
      messageText={message}
      onEdit={type === 'manager' && message !== '[Сообщение удалено]' ? () => setIsEditing(true) : undefined}
      onDelete={onMessageDelete && messageId ? handleDelete : undefined}
      onForward={onForwardMessage && messageId ? handleForward : undefined}
      onSelectMultiple={onEnterSelectionMode ? handleSelectMultiple : undefined}
      onQuote={onQuoteMessage}
      isDeleted={message === '[Сообщение удалено]'}
    >
      <div className={`flex ${type === 'manager' ? 'justify-end' : 'justify-start'} ${isLastInGroup ? 'mb-4' : 'mb-1'} ${isSelectionMode ? 'hover:bg-muted/20 p-2 rounded-lg' : ''}`}>
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
        
        {/* Аватарка клиента (только для сообщений клиента и если showAvatar = true) */}
        {type === 'client' && showAvatar && (
          <div className="flex-shrink-0">
            {clientAvatar ? (
              <img 
                src={(clientAvatar || '').replace(/^http:\/\//i, 'https://')} 
                alt="Client avatar" 
                className="w-10 h-10 rounded object-cover border-2 border-green-200"
                style={{ borderRadius: '8px' }}
                loading="lazy"
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
                onError={(e) => {
                  const target = e.currentTarget as HTMLImageElement;
                  target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNGM0Y0RjYiLz4KPGF1Y2NsZSBjeD0iMjAiIGN5PSIxNiIgcj0iNiIgZmlsbD0iIzlDQTNBRiIvPgo8cGF0aCBkPSJNMzAgMzBDMzAgMjYuNjg2MyAyNi42Mjc0IDI0IDIyLjUgMjRIMTcuNUMxMy4zNzI2IDI0IDEwIDI2LjY4NjMgMTAgMzBWMzBIMzBWMzBaIiBmaWxsPSIjOUNBM0FGIi8+Cjwvc3ZnPgo=';
                }}
              />
            ) : (
              <div className="w-10 h-10 rounded bg-green-100 flex items-center justify-center flex-shrink-0">
                <div className="w-6 h-6 rounded bg-green-200 flex items-center justify-center">
                  <div className="w-3 h-3 rounded bg-green-400"></div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Пустое место для выравнивания, если аватарка не показывается */}
        {type === 'client' && !showAvatar && (
          <div className="w-10 flex-shrink-0"></div>
        )}
        
        {type === 'manager' && showAvatar && (
          <div className="order-2">
            <div className="w-10 h-10 rounded bg-blue-100 flex items-center justify-center flex-shrink-0">
              <div className="w-6 h-6 rounded bg-blue-200 flex items-center justify-center">
                <div className="w-3 h-3 rounded bg-blue-400"></div>
              </div>
            </div>
          </div>
        )}

        {/* Пустое место для выравнивания менеджера, если аватарка не показывается */}
        {type === 'manager' && !showAvatar && (
          <div className="w-10 flex-shrink-0 order-2"></div>
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
          
          {type === 'manager' && !isEditing && showName && (
            <div className="text-xs text-muted-foreground mb-1 text-right">
              Менеджер поддержки
            </div>
          )}
           <div className={`rounded-2xl p-2 relative ${
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
                    {/* Hide placeholder text like [documentMessage] if file is attached */}
                    {!(fileUrl && /^\[(imageMessage|videoMessage|audioMessage|documentMessage)\]$/.test(message)) && (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{renderMessageWithLinks(editedMessage)}</p>
                    )}
                    {systemType === 'comment' && managerName && (
                      <div className="text-xs text-amber-700 mt-1 flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" />
                        Комментарий от {managerName}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Attached file */}
                {message !== '[Сообщение удалено]' && fileUrl && fileName && fileType && (
                  <div className="mt-2">
                    <OptimizedAttachedFile
                      url={fileUrl}
                      name={fileName}
                      type={fileType}
                      className="max-w-xs"
                      chatId={whatsappChatId}
                      messageId={externalMessageId}
                    />
                  </div>
                )}
                
                {/* Время и галочки в WhatsApp стиле */}
                <div className="flex items-end justify-end mt-0.5">
                  <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground/60 font-normal">
                    <span className="leading-none">
                      {time}
                      {isEdited && editedTime && (
                        <span className="ml-1 text-[9px]">ред.</span>
                      )}
                    </span>
                    {/* Delivery status for outgoing messages - shows sent/delivered/read status */}
                    {type === 'manager' && message !== '[Сообщение удалено]' && (
                      <MessageDeliveryStatus 
                        status={messageStatus}
                        className="ml-1"
                        messageId={messageId}
                        onRetry={onResendMessage && messageId ? () => onResendMessage(messageId) : undefined}
                        showRetryButton={!!onResendMessage && !!messageId}
                      />
                    )}
                    {/* Read indicator for incoming messages */}
                    {type === 'client' && messageId && (
                      <MessageReadIndicator 
                        messageId={messageId} 
                        isOutgoing={false}
                        authorName="Клиент"
                        authorAvatar={clientAvatar}
                        className="ml-1"
                      />
                    )}
                  </div>
                </div>
                 
                {/* Эмодзи реакции в WhatsApp стиле */}
                {messageId && (type === 'client' || type === 'manager') && (
                  <div className="absolute -bottom-2 right-2 z-10">
                    <MessageReactions 
                      messageId={messageId} 
                      showAddButton={true}
                      className="whatsapp-reactions"
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
    </MessageContextMenu>
  );
};

export const ChatMessage = memo(ChatMessageComponent);