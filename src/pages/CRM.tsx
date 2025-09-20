import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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
  FileSpreadsheet
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

const CRM = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  
  const handleAuth = () => {
    if (password === "12345") {
      setIsAuthenticated(true);
    } else {
      alert("Неверный пароль");
    }
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
        {/* Left Sidebar - Menu */}
        <div className="relative group">
          <div className="w-16 bg-background border-r flex flex-col py-4 shrink-0">
            {menuItems.map((item, index) => (
              <button
                key={index}
                className="flex items-center justify-center h-12 hover:bg-muted transition-colors relative"
                title={item.label}
              >
                <item.icon className="h-5 w-5" />
              </button>
            ))}
          </div>
          
          {/* Expanded Menu on Hover */}
          <div className="absolute left-16 top-0 w-48 bg-background border-r shadow-lg transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out opacity-0 group-hover:opacity-100 z-10">
            <div className="flex flex-col py-4">
              {menuItems.map((item, index) => (
                <button
                  key={index}
                  className="flex items-center gap-3 px-4 h-12 hover:bg-muted transition-colors text-left"
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-sm">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
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
                  onChange={(e) => setMessage(e.target.value)}
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
                  <TabsTrigger value="students">Дети/Студенты</TabsTrigger>
                  <TabsTrigger value="courses">Курсы</TabsTrigger>
                  <TabsTrigger value="payments">Платежи</TabsTrigger>
                </TabsList>
                
                <TabsContent value="students" className="space-y-2">
                  <Accordion type="single" collapsible defaultValue="pavel">
                    <AccordionItem value="pavel">
                      <AccordionTrigger className="text-sm">Павел</AccordionTrigger>
                      <AccordionContent className="space-y-2">
                        <p className="text-sm">
                          <a href="#" className="text-primary hover:underline">
                            Ближайшее занятие сегодня в 17:20
                          </a>
                        </p>
                        <p className="text-sm">
                          <a href="#" className="text-primary hover:underline">
                            Ближайшая оплата 25.09.2025
                          </a>
                        </p>
                        <p className="text-sm text-muted-foreground">Курс: Kids Box 2</p>
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
                  <div className="text-sm text-muted-foreground">
                    Информация о курсах
                  </div>
                </TabsContent>
                
                <TabsContent value="payments">
                  <div className="text-sm text-muted-foreground">
                    История платежей
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