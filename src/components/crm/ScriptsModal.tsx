import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { 
  Phone, 
  PhoneCall, 
  Users, 
  ArrowLeft, 
  ArrowRight, 
  Home, 
  MessageCircle,
  Bot,
  Send,
  PhoneIncoming,
  PhoneOutgoing,
  UserCheck,
  GraduationCap
} from "lucide-react";

interface ScriptsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ScriptType = 'call' | 'meeting';
type CallType = 'incoming' | 'outgoing';
type MeetingType = 'initial' | 'after_trial';

interface ScriptStep {
  id: string;
  title: string;
  content: string;
  duration?: string;
  actions?: string[];
  nextSteps?: string[];
}

export const ScriptsModal = ({ open, onOpenChange }: ScriptsModalProps) => {
  const [currentView, setCurrentView] = useState<'main' | 'script'>('main');
  const [selectedType, setSelectedType] = useState<ScriptType | null>(null);
  const [selectedSubType, setSelectedSubType] = useState<CallType | MeetingType | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [gptQuestion, setGptQuestion] = useState('');
  const [gptResponse, setGptResponse] = useState('');
  const [isLoadingGPT, setIsLoadingGPT] = useState(false);

  // Скрипт для входящих звонков
  const incomingCallScript: ScriptStep[] = [
    {
      id: '1',
      title: 'Приветствие',
      content: 'Добрый день! Школа английского **O\'KEY ENGLISH**, меня зовут *[Имя]*. Подскажите, как к вам обращаться?\n\n(Если уже видите имя/номер в CRM)\n"*[Имя клиента]*, рада/рад слышать! Удобно говорить 2–3 минуты?"',
      duration: '0–10 сек',
      actions: ['Записать имя клиента', 'Проверить время звонка']
    },
    {
      id: '2', 
      title: 'Цель звонка',
      content: 'Вы по какому вопросу: хотите подобрать курс, записаться на пробный урок, или уточнить расписание/стоимость?',
      duration: '10–20 сек',
      actions: ['Отметить цель в CRM (выпадающий список: подбор курса / пробный / расписание / стоимость / др.)']
    },
    {
      id: '3',
      title: 'Квалификация',
      content: '**Кого обучаем?**\n\n• Ребёнка → "Сколько лет? Какой опыт/уровень? Есть цель — разговорная речь, школа/ОГЭ/ЕГЭ, олимпиада?"\n• Подростка → "Класс/уровень? Цель — КЕТ/ПЕТ/FCE, ОГЭ/ЕГЭ, говорение?"\n• Взрослого → "Для чего английский: работа/переезд/путешествия/экзамен? Какой удобный формат: группа/индивидуально/онлайн?"\n\n**Логистика:** "Какой филиал/район удобнее? В какие дни/время получается: будни/выходные, утро/день/вечер? Онлайн рассматриваете?"\n\n**Контакт:** "Запишу ваш WhatsApp/Telegram для отправки деталей. Верный номер: *+7…*? Почта нужна для подтверждения?"',
      actions: ['Заполнить в CRM: возраст/категория, уровень, цель, формат, филиал/онлайн, окна времени, канал связи']
    },
    {
      id: '4',
      title: 'Короткая презентация',
      content: '**Детям 3–9:**\n"Работаем по Cambridge Kids Box/Super Safari: игры, речь с первого урока. Группы по возрасту, 2×в неделю по 60 мин. Первый пробный бесплатно."\n\n**Подросткам 10–17:**\n"Готовим к KET/PET/FCE, ОГЭ/ЕГЭ. 2× в неделю, Speaking Club, домашняя поддержка. На пробном — диагностика уровня."\n\n**Взрослым:**\n"Практический курс *Empower*: говорение с первого занятия, гибкое расписание, можно онлайн/офлайн. Пробный — бесплатно и сразу план обучения."',
      duration: '15–25 сек'
    },
    {
      id: '5',
      title: 'Перевод к записи',
      content: 'Предлагаю записать вас на пробный урок, чтобы преподаватель оценил уровень и мы предложили точную программу и расписание. Вам удобнее *[день/время]* — *[вариант 1]* или *[вариант 2]*?\n\n**Подтверждение:**\n"Итак, *[дата, время]*, *[филиал/онлайн]*, на имя *[ребёнка/вас]*. Пришлю адрес/ссылку и чек-лист подготовки в WhatsApp. Можно?"',
      actions: ['Дать 2 варианта времени', 'Зафиксировать запись в CRM']
    },
    {
      id: '6',
      title: 'Стоимость',
      content: 'После пробного мы предложим формат. В среднем:\n\n• Группы детям/подросткам — от *N* ₽ за 60 мин (абонемент *X* занятий).\n• Взрослым — от *N* ₽, индивидуально — от *N* ₽.\n\nЕсть рассрочка и скидка при оплате модулем. На пробном посчитаем точную стоимость.',
      actions: ['Не спорить о цене в воздухе', 'Якорить на индивидуальный план после диагностики']
    },
    {
      id: '7',
      title: 'Работа с возражениями',
      content: '**"Дорого"**\n"Понимаю. Чтобы не переплачивать, мы сначала измеряем уровень и цель, а потом подбираем оптимальный формат — часто удаётся уложиться в бюджет за счёт правильной группы/частоты. Давайте назначим пробный, а после обсудим варианты от *N* ₽?"\n\n**"Далеко/неудобно"**\n"Есть онлайн-формат с живым преподавателем. Пробный тоже можно онлайн — когда удобно, *[дата]*?"\n\n**"Подумать/сравниваю"**\n"Ок! Чтобы решение было лёгким, пришлю вам программу, отзывы и пример урока. На какую дату вас ориентировать с обратной связью? Поставлю напоминание."\n\n**"Ребёнок не хочет/боится"**\n"Понимаю. Пробный строим в игровом формате, без стресса. Часто дети уходят с улыбкой. Давайте попробуем короткую встречу на 30–40 мин?"'
    },
    {
      id: '8',
      title: 'Финальное подтверждение',
      content: '*Итак, записали: [дата/время], [филиал/онлайн].* За 10 минут пришлю сообщение в WhatsApp с адресом/ссылкой и контактами. За сутки напомню. Если что-то поменяется — просто ответьте на сообщение.',
      actions: ['В CRM пометить: Пробный назначен', 'Метка "Напоминание за 24 ч"', 'Канал (WA/TG/SMS)']
    }
  ];

  // Другие скрипты (пока заглушки)
  const outgoingCallScript: ScriptStep[] = [
    {
      id: '1',
      title: 'Исходящий звонок',
      content: 'Скрипт для исходящих звонков будет добавлен позже.',
      actions: []
    }
  ];

  const initialMeetingScript: ScriptStep[] = [
    { 
      id: '1',
      title: 'Первичная встреча',
      content: 'Скрипт для первичных встреч будет добавлен позже.',
      actions: []
    }
  ];

  const afterTrialScript: ScriptStep[] = [
    {
      id: '1', 
      title: 'Встреча после ПУ',
      content: 'Скрипт для встреч после пробного урока будет добавлен позже.',
      actions: []
    }
  ];

  const getCurrentScript = (): ScriptStep[] => {
    if (selectedType === 'call') {
      return selectedSubType === 'incoming' ? incomingCallScript : outgoingCallScript;
    } else {
      return selectedSubType === 'initial' ? initialMeetingScript : afterTrialScript;
    }
  };

  const handleScriptSelect = (type: ScriptType, subType: CallType | MeetingType) => {
    setSelectedType(type);
    setSelectedSubType(subType);
    setCurrentView('script');
    setCurrentStepIndex(0);
  };

  const handleBack = () => {
    if (currentView === 'script') {
      setCurrentView('main');
      setSelectedType(null);
      setSelectedSubType(null);
      setCurrentStepIndex(0);
    }
  };

  const handleStepChange = (index: number) => {
    setCurrentStepIndex(index);
  };

  const handleGPTQuestion = async () => {
    if (!gptQuestion.trim()) return;
    
    setIsLoadingGPT(true);
    try {
      // Здесь будет интеграция с GPT
      // Пока заглушка
      await new Promise(resolve => setTimeout(resolve, 1000));
      setGptResponse('Ответ GPT будет здесь. Интеграция с ChatGPT будет добавлена позже.');
    } catch (error) {
      setGptResponse('Ошибка при получении ответа от GPT');
    } finally {
      setIsLoadingGPT(false);
    }
  };

  const frequentQuestions = [
    "Сколько стоит обучение?",
    "Какие у вас филиалы?", 
    "Можно ли заниматься онлайн?",
    "Сколько длится курс?",
    "Есть ли скидки?",
    "Какие документы нужны для записи?"
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Скрипты продаж
            {currentView === 'script' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="ml-2"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Назад
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        {currentView === 'main' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Звонки */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-blue-600" />
                  Звонок
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleScriptSelect('call', 'incoming')}
                >
                  <PhoneIncoming className="h-4 w-4 mr-2 text-green-600" />
                  Входящий звонок
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleScriptSelect('call', 'outgoing')}
                >
                  <PhoneOutgoing className="h-4 w-4 mr-2 text-blue-600" />
                  Исходящий звонок
                </Button>
              </CardContent>
            </Card>

            {/* Встречи */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-600" />
                  Встреча
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleScriptSelect('meeting', 'initial')}
                >
                  <UserCheck className="h-4 w-4 mr-2 text-orange-600" />
                  Первичная встреча
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleScriptSelect('meeting', 'after_trial')}
                >
                  <GraduationCap className="h-4 w-4 mr-2 text-purple-600" />
                  После пробного урока
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[70vh]">
            {/* Навигация по этапам */}
            <div className="lg:col-span-1">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="text-sm">Этапы скрипта</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[50vh]">
                    <div className="p-4 space-y-2">
                      {getCurrentScript().map((step, index) => (
                        <Button
                          key={step.id}
                          variant={index === currentStepIndex ? "default" : "ghost"}
                          size="sm"
                          className="w-full justify-start text-left h-auto p-3"
                          onClick={() => handleStepChange(index)}
                        >
                          <div>
                            <div className="font-medium text-sm">
                              {index + 1}. {step.title}
                            </div>
                            {step.duration && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {step.duration}
                              </div>
                            )}
                          </div>
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Содержимое этапа */}
            <div className="lg:col-span-2">
              <Card className="h-full">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      {getCurrentScript()[currentStepIndex]?.title}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStepChange(Math.max(0, currentStepIndex - 1))}
                        disabled={currentStepIndex === 0}
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                      <Badge variant="outline">
                        {currentStepIndex + 1} из {getCurrentScript().length}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStepChange(Math.min(getCurrentScript().length - 1, currentStepIndex + 1))}
                        disabled={currentStepIndex === getCurrentScript().length - 1}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ScrollArea className="h-[35vh]">
                    <div className="prose prose-sm max-w-none">
                      <div className="whitespace-pre-wrap">
                        {getCurrentScript()[currentStepIndex]?.content}
                      </div>
                      
                      {getCurrentScript()[currentStepIndex]?.actions && (
                        <div className="mt-4 p-3 bg-muted rounded-lg">
                          <h4 className="font-medium text-sm mb-2">Действия:</h4>
                          <ul className="text-sm space-y-1">
                            {getCurrentScript()[currentStepIndex].actions!.map((action, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-primary">•</span>
                                <span>{action}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </ScrollArea>

                  <Separator />

                  {/* Часто задаваемые вопросы */}
                  <div>
                    <h4 className="font-medium text-sm mb-2">Частые вопросы:</h4>
                    <div className="flex flex-wrap gap-2">
                      {frequentQuestions.map((question, idx) => (
                        <Button
                          key={idx}
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => setGptQuestion(question)}
                        >
                          {question}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* GPT помощник */}
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Задайте вопрос GPT помощнику..."
                        value={gptQuestion}
                        onChange={(e) => setGptQuestion(e.target.value)}
                        className="flex-1"
                        rows={2}
                      />
                      <Button
                        onClick={handleGPTQuestion}
                        disabled={!gptQuestion.trim() || isLoadingGPT}
                        size="sm"
                      >
                        {isLoadingGPT ? (
                          <Bot className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    
                    {gptResponse && (
                      <div className="p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Bot className="h-4 w-4 text-primary" />
                          <span className="font-medium text-sm">GPT Ответ:</span>
                        </div>
                        <p className="text-sm">{gptResponse}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};