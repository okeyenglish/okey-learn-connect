import React, { useState } from 'react';
import { Search, Phone, MessageCircle, Mail, Video, Calendar, Users, Clock, ChevronRight, Send } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { ChatMessage } from './ChatMessage';

interface TeacherGroup {
  id: string;
  name: string;
  level: string;
  nextLesson: string;
  studentsCount: number;
  branch: string;
}

interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  avatar?: string;
  phone: string;
  email: string;
  telegram?: string;
  whatsapp?: string;
  branch: string;
  subject: string;
  category: string;
  unreadMessages: number;
  isOnline: boolean;
  lastSeen: string;
  groups: TeacherGroup[];
  zoomLink?: string;
}

const mockTeachers: Teacher[] = [
  {
    id: 'teacher-1',
    firstName: 'Семён',
    lastName: 'Пяткин',
    fullName: 'Пяткин Семён',
    phone: '+7 (999) 123-45-67',
    email: 'semyon.pyatkin@okeyenglish.ru',
    telegram: '@semyon_teacher',
    whatsapp: '+7 (999) 123-45-67',
    branch: 'Окская',
    subject: 'Английский',
    category: 'Школьники',
    unreadMessages: 2,
    isOnline: true,
    lastSeen: 'в сети',
    zoomLink: 'okeyclass.ktalk.ru/qt43k5...',
    groups: [
      {
        id: 'group-1',
        name: 'Группа ОКС38_PR7',
        level: 'Prepare 6',
        nextLesson: '20.09, 19:20-20:40',
        studentsCount: 4,
        branch: 'Окская'
      },
      {
        id: 'group-2', 
        name: 'Индивидуальные занятия',
        level: 'Mixed',
        nextLesson: '21.09, 15:00-15:45',
        studentsCount: 3,
        branch: 'Окская'
      }
    ]
  },
  {
    id: 'teacher-2',
    firstName: 'Маргарита',
    lastName: 'Селицкая',
    fullName: 'Селицкая Маргарита Андреевна',
    phone: '+7 (999) 234-56-78',
    email: 'margarita.selitskaya@okeyenglish.ru',
    branch: 'Новокосино',
    subject: 'Английский',
    category: 'Дети',
    unreadMessages: 0,
    isOnline: false,
    lastSeen: '2 часа назад',
    groups: [
      {
        id: 'group-3',
        name: 'Super Safari 2',
        level: 'Beginner',
        nextLesson: '22.09, 10:00-10:45',
        studentsCount: 6,
        branch: 'Новокосино'
      }
    ]
  },
  {
    id: 'teacher-3',
    firstName: 'Оксана',
    lastName: 'Ветрова',
    fullName: 'Ветрова Оксана Юрьевна',
    phone: '+7 (999) 345-67-89',
    email: 'oksana.vetrova@okeyenglish.ru',
    branch: 'Котельники',
    subject: 'Английский',
    category: 'Взрослые',
    unreadMessages: 1,
    isOnline: true,
    lastSeen: 'в сети',
    groups: [
      {
        id: 'group-4',
        name: 'Empower B2',
        level: 'Upper-Intermediate',
        nextLesson: '23.09, 18:00-19:30',
        studentsCount: 8,
        branch: 'Котельники'
      }
    ]
  }
];

interface TeacherChatAreaProps {
  selectedTeacherId?: string;
  onSelectTeacher: (teacherId: string) => void;
}

export const TeacherChatArea: React.FC<TeacherChatAreaProps> = ({
  selectedTeacherId = 'teacher-1',
  onSelectTeacher
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('диалог');
  const [message, setMessage] = useState('');

  const filteredTeachers = mockTeachers.filter(teacher =>
    teacher.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    teacher.branch.toLowerCase().includes(searchQuery.toLowerCase()) ||
    teacher.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedTeacher = mockTeachers.find(t => t.id === selectedTeacherId) || mockTeachers[0];

  const handleLessonClick = (groupId: string) => {
    // Navigate to lesson page
    console.log('Navigate to lesson:', groupId);
  };

  // Mock chat messages for individual teacher
  const teacherMessages = [
    {
      type: 'client' as const,
      message: 'Добрый день! Как дела с домашним заданием у Павла?',
      time: '10:15'
    },
    {
      type: 'manager' as const,
      message: 'Здравствуйте! Все отлично, Павел очень старается',
      time: '10:18'
    },
    {
      type: 'client' as const,
      message: 'Замечательно! Завтра на уроке будем проходить новую тему',
      time: '10:20'
    },
    {
      type: 'manager' as const,
      message: 'Отлично! Павел готов к новому материалу. Есть ли что-то особенное, на что стоит обратить внимание?',
      time: '10:22'
    }
  ];

  // Mock group chat messages for all teachers
  const groupChatMessages = [
    {
      type: 'client' as const,
      message: 'Коллеги, напоминаю про методическое собрание завтра в 14:00',
      time: '09:30'
    },
    {
      type: 'manager' as const,
      message: 'Семён, я буду! Подготовлю отчет по новым учебникам',
      time: '09:32'
    },
    {
      type: 'client' as const,
      message: 'Отлично! А кто-нибудь может поделиться презентацией по грамматике для уровня B1?',
      time: '09:35'
    },
    {
      type: 'manager' as const,
      message: 'У меня есть хорошая презентация, скину в чат после урока',
      time: '09:37'
    },
    {
      type: 'client' as const,
      message: 'Спасибо, Маргарита! Очень поможет для завтрашних занятий',
      time: '09:40'
    }
  ];

  const isGroupChat = selectedTeacherId === 'teachers-group';
  const currentMessages = isGroupChat ? groupChatMessages : teacherMessages;
  const currentTeacher = isGroupChat ? null : selectedTeacher;

  return (
    <div className="h-full flex">
      {/* Compact Teachers List */}
      <div className="w-72 border-r border-border flex flex-col">
        <div className="p-3 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-foreground">Преподаватели</h2>
            <Badge variant="secondary" className="text-xs">
              {filteredTeachers.length + 1}
            </Badge>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Поиск преподавателя..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-8 text-sm"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2">
            {/* Group Chat for All Teachers */}
            <div
              onClick={() => onSelectTeacher('teachers-group')}
              className={`p-2 rounded-lg cursor-pointer transition-colors mb-2 ${
                selectedTeacherId === 'teachers-group'
                  ? 'bg-muted border border-border'
                  : 'hover:bg-muted/50'
              }`}
            >
              <div className="flex items-start space-x-2">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-xs font-medium text-primary">
                  ЧП
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-sm text-foreground truncate">
                      Чат педагогов
                    </h3>
                    <Badge variant="destructive" className="h-4 w-4 p-0 flex items-center justify-center text-xs">
                      4
                    </Badge>
                  </div>
                  
                  <p className="text-xs text-muted-foreground truncate">
                    Общий чат всех преподавателей
                  </p>
                  
                  <p className="text-xs text-muted-foreground">
                    15 мин назад
                  </p>
                </div>
              </div>
            </div>

            {/* Individual Teachers */}
            {filteredTeachers.map((teacher) => (
              <div
                key={teacher.id}
                onClick={() => onSelectTeacher(teacher.id)}
                className={`p-2 rounded-lg cursor-pointer transition-colors mb-1 ${
                  selectedTeacherId === teacher.id
                    ? 'bg-muted border border-border'
                    : 'hover:bg-muted/50'
                }`}
              >
                <div className="flex items-start space-x-2">
                  <div className="relative">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-xs font-medium text-primary">
                      {teacher.firstName[0]}{teacher.lastName[0]}
                    </div>
                    {teacher.isOnline && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border border-background"></div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-sm text-foreground truncate">
                        {teacher.fullName}
                      </h3>
                      {teacher.unreadMessages > 0 && (
                        <Badge variant="destructive" className="h-4 w-4 p-0 flex items-center justify-center text-xs">
                          {teacher.unreadMessages}
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-xs text-muted-foreground truncate">
                      {teacher.branch} • {teacher.subject}
                    </p>
                    
                    <p className="text-xs text-muted-foreground">
                      {teacher.lastSeen}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area with Header */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-3 border-b border-border bg-background">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-primary font-medium text-xs">
                    {isGroupChat ? 'ЧП' : `${currentTeacher?.firstName[0]}${currentTeacher?.lastName[0]}`}
                  </span>
                </div>
                {!isGroupChat && currentTeacher?.isOnline && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border border-background"></div>
                )}
              </div>
              <div>
                <h3 className="font-medium text-sm text-foreground">
                  {isGroupChat ? 'Чат педагогов' : currentTeacher?.fullName}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {isGroupChat 
                    ? 'Общий чат всех преподавателей' 
                    : `${currentTeacher?.branch} • ${currentTeacher?.lastSeen}`
                  }
                </p>
              </div>
            </div>
            
            {!isGroupChat && (
              <div className="flex items-center space-x-1">
                <Button size="sm" variant="outline" className="h-7 w-7 p-0">
                  <Phone className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="outline" className="h-7 w-7 p-0">
                  <Video className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="outline" className="h-7 w-7 p-0">
                  <Mail className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Compact Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-2 mx-3 mt-2 h-8">
            <TabsTrigger value="диалог" className="text-xs">Диалог</TabsTrigger>
            <TabsTrigger value="запланированные" className="text-xs">Запланированные сообщения</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden">
            {/* Chat tab - Диалог */}
            <TabsContent value="диалог" className="h-full m-0 flex flex-col">
              {/* Chat Messages Area */}
              <ScrollArea className="flex-1 p-3">
                <div className="space-y-1">
                  {currentMessages.map((msg, index) => (
                    <ChatMessage
                      key={index}
                      type={msg.type}
                      message={msg.message}
                      time={msg.time}
                    />
                  ))}
                </div>
              </ScrollArea>
              
              {/* Message Input */}
              <div className="border-t p-3">
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Textarea
                      placeholder={isGroupChat ? "Написать в общий чат..." : "Написать сообщение..."}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="min-h-[40px] max-h-[120px] resize-none text-sm"
                      rows={1}
                    />
                  </div>
                  <Button size="icon" className="rounded-full h-10 w-10">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Scheduled Messages tab */}
            <TabsContent value="запланированные" className="h-full m-0">
              <ScrollArea className="h-full p-3">
                <div className="space-y-3">
                  <div className="text-center py-8">
                    <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground">Запланированные сообщения</p>
                    <p className="text-xs text-muted-foreground mt-2">Здесь будут отображаться сообщения, запланированные к отправке</p>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};