import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Users, Scale, Calculator, Send, Building2 } from 'lucide-react';

export const CommunityChatsSection = () => {
  const [activeChat, setActiveChat] = useState<'community' | 'lawyer' | 'accountant' | null>(null);
  const [message, setMessage] = useState('');

  const consultants = [
    {
      id: 'lawyer',
      name: 'AI Юрист',
      icon: Scale,
      description: 'Консультации по юридическим вопросам',
      online: true,
      unread: 0
    },
    {
      id: 'accountant',
      name: 'AI Бухгалтер',
      icon: Calculator,
      description: 'Помощь с бухгалтерским учётом',
      online: true,
      unread: 0
    },
    {
      id: 'community',
      name: 'Сообщество школ',
      icon: Building2,
      description: 'Общение с владельцами других школ',
      online: true,
      unread: 3
    }
  ];

  const handleSendMessage = () => {
    if (!message.trim() || !activeChat) return;
    
    // TODO: Отправка сообщения через AI
    console.log('Sending message to:', activeChat, message);
    setMessage('');
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-3xl font-bold">Сообщество и консультанты</h2>
        <p className="text-muted-foreground">
          Общайтесь с другими владельцами школ и получайте консультации AI-специалистов
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Список чатов */}
        <Card className="lg:col-span-1 p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Чаты и консультанты
          </h3>
          
          <div className="space-y-2">
            {consultants.map((consultant) => (
              <button
                key={consultant.id}
                onClick={() => setActiveChat(consultant.id as any)}
                className={`w-full flex items-start gap-3 p-3 rounded-lg transition-colors hover:bg-muted/50 ${
                  activeChat === consultant.id ? 'bg-muted' : ''
                }`}
              >
                <div className="relative">
                  <Avatar>
                    <AvatarFallback className="bg-primary/10">
                      <consultant.icon className="h-5 w-5 text-primary" />
                    </AvatarFallback>
                  </Avatar>
                  {consultant.online && (
                    <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 border-background rounded-full" />
                  )}
                </div>
                
                <div className="flex-1 text-left">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{consultant.name}</p>
                    {consultant.unread > 0 && (
                      <Badge variant="default" className="h-5 w-5 p-0 flex items-center justify-center rounded-full">
                        {consultant.unread}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {consultant.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* Область чата */}
        <Card className="lg:col-span-2 flex flex-col h-[600px]">
          {!activeChat ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Выберите чат</h3>
                <p className="text-muted-foreground">
                  Выберите консультанта или сообщество для начала общения
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Заголовок чата */}
              <div className="p-4 border-b flex items-center gap-3">
                <Avatar>
                  <AvatarFallback className="bg-primary/10">
                    {(() => {
                      const Icon = consultants.find(c => c.id === activeChat)?.icon || MessageSquare;
                      return <Icon className="h-5 w-5 text-primary" />;
                    })()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">
                    {consultants.find(c => c.id === activeChat)?.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {activeChat === 'community' ? '15 участников онлайн' : 'AI консультант • Всегда онлайн'}
                  </p>
                </div>
              </div>

              {/* Сообщения */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {activeChat === 'lawyer' && (
                    <div className="flex gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10">
                          <Scale className="h-4 w-4 text-primary" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="bg-muted rounded-lg p-3 max-w-[80%]">
                          <p className="text-sm">
                            Здравствуйте! Я AI-юрист, готов помочь вам с юридическими вопросами по работе образовательного учреждения. Задайте свой вопрос!
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          только что
                        </p>
                      </div>
                    </div>
                  )}

                  {activeChat === 'accountant' && (
                    <div className="flex gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10">
                          <Calculator className="h-4 w-4 text-primary" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="bg-muted rounded-lg p-3 max-w-[80%]">
                          <p className="text-sm">
                            Привет! Я AI-бухгалтер. Помогу разобраться с налогами, отчётностью и финансовым учётом. Чем могу быть полезен?
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          только что
                        </p>
                      </div>
                    </div>
                  )}

                  {activeChat === 'community' && (
                    <>
                      <div className="flex gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>МА</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="bg-muted rounded-lg p-3 max-w-[80%]">
                            <p className="text-sm font-medium mb-1">Мария Алексеева</p>
                            <p className="text-sm">
                              Добрый день! Подскажите, кто-нибудь использует CRM для автоматизации записей учеников?
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            15 минут назад
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>ИС</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="bg-muted rounded-lg p-3 max-w-[80%]">
                            <p className="text-sm font-medium mb-1">Иван Смирнов</p>
                            <p className="text-sm">
                              Да, мы используем. Очень удобно! Все автоматизировано, включая оплаты.
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            10 минут назад
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </ScrollArea>

              {/* Поле ввода */}
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder={
                      activeChat === 'community' 
                        ? 'Написать сообщение в сообщество...' 
                        : 'Задайте вопрос консультанту...'
                    }
                    className="flex-1"
                  />
                  <Button onClick={handleSendMessage} size="icon">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {activeChat === 'community' 
                    ? 'Ваше сообщение увидят все участники сообщества' 
                    : 'AI-консультант работает на базе передовых языковых моделей'}
                </p>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};