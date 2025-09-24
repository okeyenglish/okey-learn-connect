import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, User, Users, Clock, Bell } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { TeacherMessage, useTeacherMessages } from '@/hooks/useTeacherMessages';
import { TeacherMessageModerationModal } from './TeacherMessageModerationModal';

export const TeacherMessagesPanel = () => {
  const [selectedMessage, setSelectedMessage] = useState<TeacherMessage | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const { messages, isLoading } = useTeacherMessages();

  const pendingMessages = messages.filter(msg => msg.status === 'pending');
  const recentMessages = messages.slice(0, 10);

  const handleMessageClick = (message: TeacherMessage) => {
    setSelectedMessage(message);
    setModalOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'approved': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'sent': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'На модерации';
      case 'approved': return 'Одобрено';
      case 'rejected': return 'Отклонено';
      case 'sent': return 'Отправлено';
      default: return status;
    }
  };

  if (isLoading) {
    return <div className="text-center py-4">Загрузка сообщений...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Сообщения преподавателей
            </div>
            {pendingMessages.length > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <Bell className="h-3 w-3" />
                {pendingMessages.length} на модерации
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Модерация сообщений от преподавателей для отправки студентам
          </CardDescription>
        </CardHeader>
        <CardContent>
          {messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Нет сообщений от преподавателей</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Сообщения на модерации */}
              {pendingMessages.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-medium text-amber-600 dark:text-amber-400 flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Требуют модерации ({pendingMessages.length})
                  </h3>
                  {pendingMessages.map((message) => (
                    <div
                      key={message.id}
                      className="p-3 border-2 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 rounded-lg cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900 transition-colors"
                      onClick={() => handleMessageClick(message)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span className="font-medium">{message.teacher_name}</span>
                          {message.message_type === 'group' ? (
                            <Users className="h-3 w-3 text-muted-foreground" />
                          ) : (
                            <User className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                        <Badge className={getStatusColor(message.status)}>
                          {getStatusText(message.status)}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {message.message_text}
                      </p>
                      
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {message.target_student_name 
                            ? `Для: ${message.target_student_name}`
                            : 'Групповое сообщение'
                          }
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(message.created_at), 'dd.MM в HH:mm', { locale: ru })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Все недавние сообщения */}
              <div className="space-y-2">
                <h3 className="font-medium text-muted-foreground">
                  Недавние сообщения
                </h3>
                {recentMessages.map((message) => (
                  <div
                    key={message.id}
                    className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleMessageClick(message)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span className="font-medium">{message.teacher_name}</span>
                        {message.message_type === 'group' ? (
                          <Users className="h-3 w-3 text-muted-foreground" />
                        ) : (
                          <User className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                      <Badge className={getStatusColor(message.status)}>
                        {getStatusText(message.status)}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                      {message.message_text}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {message.target_student_name 
                          ? `Для: ${message.target_student_name}`
                          : 'Групповое сообщение'
                        }
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(message.created_at), 'dd.MM в HH:mm', { locale: ru })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <TeacherMessageModerationModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        message={selectedMessage}
      />
    </>
  );
};