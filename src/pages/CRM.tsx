import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Search, 
  CheckSquare, 
  FileText, 
  User, 
  Building, 
  GraduationCap, 
  Monitor, 
  Calendar, 
  DollarSign, 
  BarChart3, 
  Settings,
  Phone,
  Send,
  Paperclip,
  Zap,
  MessageCircle,
  Mic,
  PhoneCall,
  Play,
  FileSpreadsheet,
  ExternalLink
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

const CRM = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [openModal, setOpenModal] = useState<string | null>(null);
  const [hasUnsavedChat, setHasUnsavedChat] = useState(false);
  
  const handleAuth = () => {
    if (password === "12345") {
      setIsAuthenticated(true);
    } else {
      alert("Неверный пароль");
    }
  };

  const handleMenuClick = (action: string) => {
    if (hasUnsavedChat && message.trim()) {
      const confirm = window.confirm("У вас есть несохраненное сообщение. Продолжить?");
      if (!confirm) return;
    }
    setOpenModal(action);
  };

  const handleMessageChange = (value: string) => {
    setMessage(value);
    setHasUnsavedChat(value.trim().length > 0);
  };

  const menuItems = [
    { icon: CheckSquare, label: "Мои задачи" },
    { icon: FileText, label: "Заявки" },
    { icon: User, label: "Лиды" },
    { icon: Building, label: "Компания" },
    { icon: GraduationCap, label: "Обучение" },
    { icon: Monitor, label: "Занятия онлайн" },
    { icon: Calendar, label: "Расписание" },
    { icon: DollarSign, label: "Финансы" },
    { icon: BarChart3, label: "Отчёты" },
    { icon: Settings, label: "Настройки" },
  ];

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Вход в CRM</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="password"
              placeholder="Введите пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAuth()}
            />
            <Button onClick={handleAuth} className="w-full">
              Войти
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen bg-muted/30 flex flex-col">
      {/* Search Bar */}
      <div className="bg-background border-b p-4 shrink-0">
        <div className="relative max-w-7xl mx-auto">
          <Input
            placeholder="Поиск клиентов по ФИО, телефону, email..."
            className="pr-10"
          />
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      <div className="flex flex-1 max-w-7xl mx-auto w-full">
        {/* Left Unified Sidebar */}
        <div className="w-80 bg-background border-r flex flex-col">
          <Tabs defaultValue="chats" className="flex flex-col h-full">
            <TabsList className="grid w-full grid-cols-2 m-2">
              <TabsTrigger value="menu">Меню</TabsTrigger>
              <TabsTrigger value="chats">Чаты</TabsTrigger>
            </TabsList>
            
            <TabsContent value="menu" className="flex-1 mt-0">
              <div className="p-2 space-y-1">
                {menuItems.map((item, index) => (
                  <Dialog key={index} open={openModal === item.label} onOpenChange={(open) => !open && setOpenModal(null)}>
                    <DialogTrigger asChild>
                      <button
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-left"
                        onClick={() => handleMenuClick(item.label)}
                      >
                        <item.icon className="h-5 w-5 shrink-0" />
                        <span className="text-sm">{item.label}</span>
                        <ExternalLink className="h-3 w-3 ml-auto opacity-50" />
                      </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <item.icon className="h-5 w-5" />
                          {item.label}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="py-4">
                        {item.label === "Расписание" && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <Card>
                                <CardHeader>
                                  <CardTitle>Сегодня</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="space-y-2">
                                    <div className="p-2 bg-green-50 rounded border-l-4 border-green-500">
                                      <p className="font-medium">17:20-20:40 Павел</p>
                                      <p className="text-sm text-muted-foreground">Kids Box 2, Ауд. WASHINGTON</p>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                              <Card>
                                <CardHeader>
                                  <CardTitle>Завтра</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <p className="text-muted-foreground">Занятий нет</p>
                                </CardContent>
                              </Card>
                            </div>
                          </div>
                        )}
                        {item.label === "Финансы" && (
                          <div className="space-y-4">
                            <Card>
                              <CardHeader>
                                <CardTitle>Ближайшие платежи</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-2">
                                  <div className="p-3 bg-orange-50 border border-orange-200 rounded">
                                    <p className="font-medium">Мария Петрова - 11490₽</p>
                                    <p className="text-sm text-muted-foreground">Срок: 25.09.2025</p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        )}
                        {item.label === "Мои задачи" && (
                          <div className="space-y-4">
                            <Card>
                              <CardHeader>
                                <CardTitle>Активные задачи</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-2">
                                  <div className="p-2 border-l-4 border-blue-500 bg-blue-50">
                                    <p className="font-medium">Связаться с Марией Петровой</p>
                                    <p className="text-sm text-muted-foreground">Обсудить расписание Павла</p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        )}
                        {!["Расписание", "Финансы", "Мои задачи"].includes(item.label) && (
                          <div className="text-center py-8">
                            <p className="text-muted-foreground">Функция "{item.label}" в разработке</p>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="chats" className="flex-1 mt-0 flex flex-col">
              <div className="flex-1 overflow-y-auto">
                <div className="p-2 space-y-1">
                  <button className="w-full p-3 text-left rounded-lg bg-muted hover:bg-muted/80 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">Мария Петрова</p>
                        <p className="text-xs text-muted-foreground">+7 (985) 261-50-56</p>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-xs text-muted-foreground">10:32</span>
                        <span className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">2</span>
                      </div>
                    </div>
                  </button>
                  <button className="w-full p-3 text-left rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">Анна Смирнова</p>
                        <p className="text-xs text-muted-foreground">+7 (916) 123-45-67</p>
                      </div>
                      <span className="text-xs text-muted-foreground">09:15</span>
                    </div>
                  </button>
                  <button className="w-full p-3 text-left rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">Игорь Волков</p>
                        <p className="text-xs text-muted-foreground">+7 (903) 987-65-43</p>
                      </div>
                      <span className="text-xs text-muted-foreground">Вчера</span>
                    </div>
                  </button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Center - Chat */}
        <div className="flex-1 bg-background border-r flex flex-col min-w-0">
          {/* Chat Header */}
          <div className="border-b p-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Мария Петрова</h2>
              <p className="text-sm text-muted-foreground">+7 (985) 261-50-56</p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline">
                <Phone className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" className="text-green-600">
                <MessageCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 p-4 space-y-4 overflow-y-auto">
            {/* Client Message */}
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg p-3 max-w-xs">
                <p className="text-sm">Здравствуйте! Можно узнать расписание занятий для Павла на следующую неделю?</p>
                <span className="text-xs text-muted-foreground">10:30</span>
              </div>
            </div>

            {/* Manager Message */}
            <div className="flex justify-end">
              <div className="bg-primary text-primary-foreground rounded-lg p-3 max-w-xs">
                <p className="text-sm">Добрый день! Конечно, сейчас проверю расписание Павла.</p>
                <span className="text-xs opacity-70">10:32</span>
              </div>
            </div>

            {/* Missed Call */}
            <div className="flex justify-center">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                <Phone className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-600">Пропущенный звонок</span>
                <Button size="sm" variant="outline" className="text-red-600">
                  <PhoneCall className="h-4 w-4" />
                  Перезвонить
                </Button>
              </div>
            </div>

            {/* Call Record */}
            <div className="flex justify-center">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                <Phone className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-600">Был звонок (3:45)</span>
                <Button size="sm" variant="outline" className="text-green-600">
                  <Play className="h-4 w-4" />
                  Прослушать
                </Button>
                <Button size="sm" variant="outline" className="text-green-600">
                  <FileSpreadsheet className="h-4 w-4" />
                  Саммари
                </Button>
              </div>
            </div>
          </div>

          {/* Message Input */}
          <div className="border-t p-4">
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-2">
                <Textarea
                  placeholder="Введите сообщение..."
                  value={message}
                  onChange={(e) => handleMessageChange(e.target.value)}
                  className="min-h-[60px] resize-none"
                />
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost">
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost">
                    <Zap className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost">
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost">
                    <Mic className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Button size="icon" className="rounded-full">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Client Card */}
        <div className="w-80 bg-background p-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Карточка клиента</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Contact Info */}
              <div className="space-y-2">
                <p className="font-medium">Мария Петрова</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm">+7 (985) 261-50-56</span>
                  <Button size="sm" variant="ghost">
                    <Phone className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" className="text-green-600">
                    <MessageCircle className="h-3 w-3" />
                    WhatsApp
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" className="text-blue-600">
                    <MessageCircle className="h-3 w-3" />
                    Telegram
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">maria.petrova@email.com</p>
              </div>

              {/* Tabs */}
              <Tabs defaultValue="students" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="students">Учатся</TabsTrigger>
                  <TabsTrigger value="courses">Не учатся</TabsTrigger>
                  <TabsTrigger value="payments">Платежи</TabsTrigger>
                </TabsList>
                
                <TabsContent value="students" className="space-y-2">
                  <Accordion type="single" collapsible defaultValue="pavel">
                    <AccordionItem value="pavel">
                      <AccordionTrigger className="text-sm">Павел</AccordionTrigger>
                      <AccordionContent className="space-y-2">
                        <div className="text-sm space-y-1">
                          <p className="font-medium">Вт/Чт с 19:20 до 20:40</p>
                          <p className="text-muted-foreground">с 26.08 по 28.05.26</p>
                          <p className="text-muted-foreground">Ауд. WASHINGTON</p>
                        </div>
                        <div className="grid grid-cols-4 gap-1 text-xs mt-2">
                          <div className="p-1 bg-muted rounded text-center">26.08</div>
                          <div className="p-1 bg-muted rounded text-center">28.08</div>
                          <div className="p-1 bg-muted rounded text-center">2.09</div>
                          <div className="p-1 bg-muted rounded text-center">4.09</div>
                          <div className="p-1 bg-muted rounded text-center">9.09</div>
                          <div className="p-1 bg-muted rounded text-center">11.09</div>
                          <div className="p-1 bg-muted rounded text-center">16.09</div>
                          <div className="p-1 bg-muted rounded text-center">18.09</div>
                          <div className="p-1 bg-green-100 text-green-800 rounded text-center">23.09</div>
                          <div className="p-1 bg-green-100 text-green-800 rounded text-center">25.09</div>
                          <div className="p-1 bg-muted rounded text-center">30.09</div>
                          <div className="p-1 bg-muted rounded text-center">2.10</div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">Курс: Kids Box 2</p>
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="masha">
                      <AccordionTrigger className="text-sm">Маша</AccordionTrigger>
                      <AccordionContent>
                        <p className="text-sm text-muted-foreground">Информация о студенте</p>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </TabsContent>
                
                <TabsContent value="courses">
                  <div className="space-y-2">
                    <div className="p-2 bg-muted/50 rounded">
                      <p className="text-sm font-medium">Мария Петрова</p>
                      <p className="text-xs text-muted-foreground">Не обучается</p>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="payments">
                  <div className="space-y-2">
                    <div className="p-2 bg-orange-50 border border-orange-200 rounded">
                      <p className="text-sm font-medium text-orange-800">Ближайшая оплата 25.09.2025</p>
                      <p className="text-sm text-orange-600">Выставить счёт на сумму 11490₽ за Марию</p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      История платежей
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CRM;