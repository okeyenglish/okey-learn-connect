import { useState } from "react";
import { Send, Paperclip, Zap, MessageCircle, Mic, Edit2, Search, Plus, FileText, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ChatMessage } from "./ChatMessage";
import { ClientTasks } from "./ClientTasks";
import { AddTaskModal } from "./AddTaskModal";
import { CreateInvoiceModal } from "./CreateInvoiceModal";

interface ChatAreaProps {
  clientName: string;
  clientPhone: string;
  clientComment?: string;
  onMessageChange?: (hasUnsaved: boolean) => void;
  activePhoneId?: string; // Add this prop to track which phone number is active
}

// Mock chat history for different phone numbers
const mockChatHistory: Record<string, any[]> = {
  '1': [ // +7 (985) 261-50-56
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
  ],
  '2': [ // +7 (916) 185-33-85
    {
      type: 'client' as const,
      message: 'Добрый день! Хотела уточнить по оплате за октябрь.',
      time: '09:15'
    },
    {
      type: 'manager' as const,
      message: 'Здравствуйте! Сейчас посмотрю информацию по оплате.',
      time: '09:17'
    },
    {
      type: 'manager' as const,
      message: 'Вижу что оплата за октябрь поступила 15 числа. Всё в порядке.',
      time: '09:19'
    },
    {
      type: 'client' as const,
      message: 'Отлично, спасибо! А когда следующий платеж?',
      time: '09:21'
    },
    {
      type: 'manager' as const,
      message: 'Следующий платеж по расписанию 15 ноября.',
      time: '09:22'
    }
  ]
};

// ChatArea component for CRM chat functionality
export const ChatArea = ({ clientName, clientPhone, clientComment = "Базовый комментарий", onMessageChange, activePhoneId = '1' }: ChatAreaProps) => {
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [isEditingComment, setIsEditingComment] = useState(false);
  const [editableComment, setEditableComment] = useState(clientComment);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  const handleMessageChange = (value: string) => {
    setMessage(value);
    onMessageChange?.(value.trim().length > 0);
  };

  const handleSearchToggle = () => {
    setShowSearchInput(!showSearchInput);
    if (showSearchInput) {
      setSearchQuery(""); // Clear search when hiding
    }
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

  const messages = mockChatHistory[activePhoneId] || [];

  // Filter messages based on search query
  const filteredMessages = messages.filter(msg => 
    msg.message.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 bg-background flex flex-col min-w-0">
      {/* Chat Header */}
      <div className="border-b p-3 shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-base">{clientName}</h2>
            <p className="text-sm text-muted-foreground">{clientPhone}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              className="h-8 w-8 p-0"
              title="Добавить задачу"
              onClick={() => setShowAddTaskModal(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="h-8 w-8 p-0"
              title="Выставить счёт"
              onClick={() => setShowInvoiceModal(true)}
            >
              <FileText className="h-4 w-4" />
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="h-8 w-8 p-0"
              title="Позвонить"
              onClick={() => console.log('Calling client...')}
            >
              <Phone className="h-4 w-4" />
            </Button>
            <Button 
              size="sm" 
              variant={showSearchInput ? "default" : "outline"}
              className="h-8 w-8 p-0"
              title="Поиск в чате"
              onClick={handleSearchToggle}
            >
              <Search className="h-4 w-4" />
            </Button>
            {showSearchInput && (
              <Input
                placeholder="Поиск в чате..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 h-8 ml-2"
                autoFocus
              />
            )}
          </div>
        </div>
      </div>

      {/* Client Tasks */}
      <div className="shrink-0">
        <ClientTasks clientName={clientName} tasks={clientTasks} />
      </div>

      {/* Chat Messages with Tabs */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="whatsapp" className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-4 rounded-none bg-orange-50/30 border-orange-200 border-t rounded-t-none">
            <TabsTrigger value="whatsapp" className="text-xs">WhatsApp</TabsTrigger>
            <TabsTrigger value="telegram" className="text-xs">Telegram</TabsTrigger>
            <TabsTrigger value="max" className="text-xs">Max</TabsTrigger>
            <TabsTrigger value="email" className="text-xs">Email</TabsTrigger>
          </TabsList>
          
          <TabsContent value="whatsapp" className="flex-1 p-3 overflow-y-auto mt-0">
            <div className="space-y-1">
              {filteredMessages.map((msg, index) => (
                <ChatMessage
                  key={index}
                  type={msg.type}
                  message={msg.message}
                  time={msg.time}
                  systemType={msg.systemType}
                  callDuration={msg.callDuration}
                />
              ))}
              {searchQuery && filteredMessages.length === 0 && (
                <div className="text-center text-muted-foreground text-sm py-4">
                  Сообщения не найдены
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="telegram" className="flex-1 p-3 overflow-y-auto mt-0">
            <div className="space-y-1">
              <div className="text-center text-muted-foreground text-sm py-4">
                История переписки в Telegram
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="max" className="flex-1 p-3 overflow-y-auto mt-0">
            <div className="space-y-1">
              <div className="text-center text-muted-foreground text-sm py-4">
                История переписки Max
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

      {/* Add Task Modal */}
      <AddTaskModal 
        open={showAddTaskModal}
        onOpenChange={setShowAddTaskModal}
        clientName={clientName}
      />

      {/* Create Invoice Modal */}
      <CreateInvoiceModal 
        open={showInvoiceModal}
        onOpenChange={setShowInvoiceModal}
        clientName={clientName}
      />
    </div>
  );
};