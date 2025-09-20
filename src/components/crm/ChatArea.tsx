import { useState } from "react";
import { Send, Paperclip, Zap, MessageCircle, Mic, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ChatMessage } from "./ChatMessage";
import { ClientTasks } from "./ClientTasks";

interface ChatAreaProps {
  clientName: string;
  clientPhone: string;
  clientComment?: string;
  onMessageChange?: (hasUnsaved: boolean) => void;
}

// ChatArea component for CRM chat functionality
export const ChatArea = ({ clientName, clientPhone, clientComment = "Базовый комментарий", onMessageChange }: ChatAreaProps) => {
  const [message, setMessage] = useState("");
  const [isEditingComment, setIsEditingComment] = useState(false);
  const [editableComment, setEditableComment] = useState(clientComment);

  const handleMessageChange = (value: string) => {
    setMessage(value);
    onMessageChange?.(value.trim().length > 0);
  };

  const handleSaveComment = () => {
    setIsEditingComment(false);
    // Here you would save the comment to your backend
    console.log('Saving comment:', editableComment);
  };

  // Mock tasks data - in real app this would come from props or API
  const clientTasks = [
    {
      id: '1',
      title: 'Обсудить расписание на следующую неделю',
      student: 'Павел',
      priority: 'high' as const,
      dueDate: 'Сегодня',
    },
    {
      id: '2', 
      title: 'Отправить счет за обучение',
      priority: 'medium' as const,
      dueDate: '25.09.2025',
    }
  ];

  const messages = [
    {
      type: 'client' as const,
      message: 'Здравствуйте! Можно узнать расписание занятий для Павла на следующую неделю?',
      time: '10:30'
    },
    {
      type: 'manager' as const,
      message: 'Добрый день! Конечно, сейчас проверю расписание Павла.',
      time: '10:32'
    },
    {
      type: 'system' as const,
      message: '',
      time: '10:35',
      systemType: 'missed-call' as const
    },
    {
      type: 'system' as const,
      message: '',
      time: '10:40',
      systemType: 'call-record' as const,
      callDuration: '3:45'
    }
  ];

  return (
    <div className="flex-1 bg-background flex flex-col min-w-0">
      {/* Chat Header */}
      <div className="border-b p-3 shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h2 className="font-semibold text-base">{clientName}</h2>
            <p className="text-sm text-muted-foreground">{clientPhone}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline">
              Добавить задачу
            </Button>
            <Button size="sm" variant="outline">
              Выставить счёт
            </Button>
          </div>
        </div>
      </div>

      {/* Client Tasks */}
      <div className="p-3 shrink-0">
        <ClientTasks clientName={clientName} tasks={clientTasks} />
      </div>

      {/* Chat Messages with Tabs */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="whatsapp" className="h-full flex flex-col">
          <TabsList className="mx-3 mt-2 grid w-full grid-cols-3">
            <TabsTrigger value="whatsapp" className="text-xs">WhatsApp</TabsTrigger>
            <TabsTrigger value="telegram" className="text-xs">Telegram</TabsTrigger>
            <TabsTrigger value="email" className="text-xs">Email</TabsTrigger>
          </TabsList>
          
          <TabsContent value="whatsapp" className="flex-1 p-3 overflow-y-auto mt-0">
            <div className="space-y-1">
              {messages.map((msg, index) => (
                <ChatMessage
                  key={index}
                  type={msg.type}
                  message={msg.message}
                  time={msg.time}
                  systemType={msg.systemType}
                  callDuration={msg.callDuration}
                />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="telegram" className="flex-1 p-3 overflow-y-auto mt-0">
            <div className="space-y-1">
              <div className="text-center text-muted-foreground text-sm py-4">
                История переписки в Telegram
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="email" className="flex-1 p-3 overflow-y-auto mt-0">
            <div className="space-y-1">
              <div className="text-center text-muted-foreground text-sm py-4">
                История переписки Email
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Message Input */}
      <div className="border-t p-3 shrink-0">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Textarea
              placeholder="Введите сообщение..."
              value={message}
              onChange={(e) => handleMessageChange(e.target.value)}
              className="min-h-[40px] max-h-[120px] resize-none"
              rows={1}
            />
            <div className="flex items-center gap-1 mt-2">
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                <Paperclip className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                <Zap className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                <MessageCircle className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                <Mic className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <Button size="icon" className="rounded-full h-10 w-10">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};