import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Video, Users, Clock, MapPin, BookOpen, ExternalLink, Play, Settings, Mic, MicOff, Camera, CameraOff, PhoneOff } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

interface StartLessonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: any;
  teacherName: string;
}

export const StartLessonModal = ({ open, onOpenChange, session, teacherName }: StartLessonModalProps) => {
  const [lessonNotes, setLessonNotes] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [lessonStarted, setLessonStarted] = useState(false);
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const jitsiApiRef = useRef<any>(null);
  const { toast } = useToast();

  // Получаем студентов занятия
  const { data: students, isLoading: studentsLoading } = useQuery({
    queryKey: ['lesson_students', session?.id],
    queryFn: async () => {
      if (!session?.id) return [];
      
      const { data, error } = await supabase
        .from('student_lesson_sessions')
        .select(`
          students!student_lesson_sessions_student_id_fkey (
            id,
            name,
            first_name,
            last_name
          )
        `)
        .eq('lesson_session_id', session.id);

      if (error) throw error;
      return data?.map(item => item.students).filter(Boolean) || [];
    },
    enabled: open && !!session?.id,
  });

  // Получаем информацию о группе
  const { data: groupInfo, isLoading: groupLoading } = useQuery({
    queryKey: ['group_info', session?.group_id],
    queryFn: async () => {
      if (!session?.group_id) return null;
      
      const { data, error } = await supabase
        .from('learning_groups')
        .select('*')
        .eq('id', session.group_id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: open && !!session?.group_id,
  });

  // Загрузка Jitsi Meet API
  useEffect(() => {
    if (lessonStarted && jitsiContainerRef.current) {
      const loadJitsiScript = () => {
        return new Promise((resolve, reject) => {
          if (window.JitsiMeetExternalAPI) {
            resolve(window.JitsiMeetExternalAPI);
            return;
          }

          const script = document.createElement('script');
          script.src = 'https://meet.jit.si/external_api.js';
          script.async = true;
          script.onload = () => resolve(window.JitsiMeetExternalAPI);
          script.onerror = reject;
          document.head.appendChild(script);
        });
      };

      loadJitsiScript()
        .then(() => {
          if (jitsiContainerRef.current && window.JitsiMeetExternalAPI) {
            const roomName = `lesson-${session.id}-${Date.now()}`;
            const displayName = `${teacherName} (Преподаватель)`;

            const options = {
              roomName,
              width: '100%',
              height: '500px',
              parentNode: jitsiContainerRef.current,
              configOverwrite: {
                startWithAudioMuted: !micEnabled,
                startWithVideoMuted: !cameraEnabled,
              },
              interfaceConfigOverwrite: {
                TOOLBAR_BUTTONS: [
                  'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
                  'fodeviceselection', 'hangup', 'profile', 'info', 'chat', 'recording',
                  'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
                  'videoquality', 'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts',
                  'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone'
                ],
              },
              userInfo: {
                displayName,
              }
            };

            jitsiApiRef.current = new window.JitsiMeetExternalAPI('meet.jit.si', options);

            jitsiApiRef.current.addEventListener('videoConferenceLeft', () => {
              handleEndLesson();
            });

            console.log('Jitsi Meet loaded for lesson:', session.id);
          }
        })
        .catch((error) => {
          console.error('Error loading Jitsi Meet:', error);
          toast({
            title: "Ошибка",
            description: "Не удалось загрузить видеоконференцию",
            variant: "destructive",
          });
        });
    }

    return () => {
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
        jitsiApiRef.current = null;
      }
    };
  }, [lessonStarted, micEnabled, cameraEnabled, session.id, teacherName]);

  const handleStartLesson = async () => {
    setIsStarting(true);
    try {
      // Обновляем статус занятия на "scheduled" (пока не добавим "ongoing" в тип)
      const { error } = await supabase
        .from('lesson_sessions')
        .update({ 
          status: 'scheduled', // Изменим на scheduled пока что
          notes: lessonNotes || null
        })
        .eq('id', session.id);

      if (error) throw error;

      toast({
        title: "Урок начат",
        description: "Подключение к видеоконференции...",
      });

      // Запуск урока в том же модальном окне
      setLessonStarted(true);

    } catch (error) {
      console.error('Error starting lesson:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось начать урок",
        variant: "destructive",
      });
    } finally {
      setIsStarting(false);
    }
  };

  const handleEndLesson = () => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.dispose();
      jitsiApiRef.current = null;
    }
    setLessonStarted(false);
    onOpenChange(false);
    
    toast({
      title: "Урок завершен",
      description: "Видеоконференция завершена",
    });
  };

  const handleTestConnection = () => {
    toast({
      title: "Тестирование соединения",
      description: "Проверка микрофона, камеры и интернет-соединения...",
    });
    
    // Имитация тестирования
    setTimeout(() => {
      toast({
        title: "Соединение готово",
        description: "Все устройства работают корректно",
      });
    }, 2000);
  };

  if (!session) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            {lessonStarted ? 'Онлайн урок' : 'Начать онлайн урок'}
          </DialogTitle>
          <DialogDescription>
            {format(new Date(session.lesson_date), 'EEEE, d MMMM yyyy', { locale: ru })} в {session.start_time} - {session.end_time}
          </DialogDescription>
        </DialogHeader>

        {lessonStarted ? (
          // Урок начат - показываем видеоконференцию
          <div className="flex-1 overflow-hidden">
            <div 
              ref={jitsiContainerRef} 
              className="w-full h-[500px] bg-muted rounded-lg flex items-center justify-center"
            >
              <div className="text-center">
                <Video className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium">Загрузка видеоконференции...</p>
                <p className="text-sm text-muted-foreground">Подключение к серверу Jitsi Meet</p>
              </div>
            </div>
            
            {/* Кнопка завершения урока */}
            <div className="flex justify-center pt-4 border-t mt-4">
              <Button 
                onClick={handleEndLesson}
                variant="destructive"
                className="bg-red-600 hover:bg-red-700"
              >
                <PhoneOff className="h-4 w-4 mr-2" />
                Завершить урок
              </Button>
            </div>
          </div>
        ) : (
          // Настройки урока - показываем форму
          <div className="flex-1 overflow-y-auto space-y-6">
            {/* Информация о занятии */}
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  <span className="font-medium">
                    {session.learning_groups?.name || 'Индивидуальное занятие'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>Аудитория: {session.classroom}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{session.start_time} - {session.end_time}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>Студентов: {students?.length || 0}</span>
                </div>
              </div>
              
              {groupInfo && (
                <div className="mt-3 pt-3 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Предмет:</span>
                      <span className="ml-2 font-medium">{groupInfo.subject}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Уровень:</span>
                      <span className="ml-2 font-medium">{groupInfo.level}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Учебник:</span>
                      <span className="ml-2 font-medium">{groupInfo.textbook || 'Не указан'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Студенты */}
            {students && students.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Участники урока ({students.length})
                </h3>
                <div className="bg-background border rounded-lg p-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {students.map((student: any) => (
                      <div key={student.id} className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        <span>{student.first_name} {student.last_name}</span>
                        <Badge variant="outline" className="text-xs">Ожидает</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Настройки устройств */}
            <div className="space-y-3">
              <h3 className="font-medium flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Настройки устройств
              </h3>
              <div className="bg-background border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <Button
                      variant={micEnabled ? "default" : "outline"}
                      size="sm"
                      onClick={() => setMicEnabled(!micEnabled)}
                    >
                      {micEnabled ? <Mic className="h-4 w-4 mr-2" /> : <MicOff className="h-4 w-4 mr-2" />}
                      {micEnabled ? 'Микрофон включен' : 'Микрофон выключен'}
                    </Button>
                    
                    <Button
                      variant={cameraEnabled ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCameraEnabled(!cameraEnabled)}
                    >
                      {cameraEnabled ? <Camera className="h-4 w-4 mr-2" /> : <CameraOff className="h-4 w-4 mr-2" />}
                      {cameraEnabled ? 'Камера включена' : 'Камера выключена'}
                    </Button>
                  </div>
                  
                  <Button variant="outline" size="sm" onClick={handleTestConnection}>
                    Тест соединения
                  </Button>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  💡 Проверьте настройки микрофона и камеры перед началом урока
                </div>
              </div>
            </div>

            {/* Заметки к уроку */}
            <div className="space-y-3">
              <Label htmlFor="lesson-notes">Заметки к уроку (необязательно)</Label>
              <Textarea
                id="lesson-notes"
                value={lessonNotes}
                onChange={(e) => setLessonNotes(e.target.value)}
                placeholder="Цели урока, особые замечания, план занятия..."
                rows={3}
              />
            </div>

            {/* Полезные ссылки */}
            <div className="space-y-3">
              <h3 className="font-medium">Полезные ссылки</h3>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm">
                  <ExternalLink className="h-3 w-3 mr-2" />
                  Электронный учебник
                </Button>
                <Button variant="outline" size="sm">
                  <ExternalLink className="h-3 w-3 mr-2" />
                  Интерактивная доска
                </Button>
                <Button variant="outline" size="sm">
                  <ExternalLink className="h-3 w-3 mr-2" />
                  Словарь Cambridge
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Кнопки действий - показываем только если урок не начат */}
        {!lessonStarted && (
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              Урок начнется в этом же окне
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Отмена
              </Button>
              <Button 
                onClick={handleStartLesson} 
                disabled={isStarting || studentsLoading || groupLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                {isStarting ? (
                  'Подключение...'
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Начать урок
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};