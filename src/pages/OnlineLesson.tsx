import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

// Расширяем Window интерфейс для JitsiMeetExternalAPI
declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

export default function OnlineLesson() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const [jitsiApi, setJitsiApi] = useState<any>(null);
  const [isJoined, setIsJoined] = useState(false);

  const studentName = searchParams.get('student');
  const teacherName = searchParams.get('teacher');

  // Получаем данные урока
  const { data: lesson, isLoading } = useQuery({
    queryKey: ['lesson-session', lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lesson_sessions')
        .select('*')
        .eq('id', lessonId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!lessonId,
  });

  // Получаем профиль пользователя для определения роли
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const isTeacher = profile?.department === 'teacher' || teacherName?.includes(profile?.first_name || '');

  useEffect(() => {
    if (!lesson || !jitsiContainerRef.current || jitsiApi) return;

    // Проверяем доступность Jitsi API
    if (!window.JitsiMeetExternalAPI) {
      console.error('Jitsi Meet API не загружен');
      return;
    }

    const domain = 'meet.jit.si';
    const roomName = `OKEYEnglish_${lesson.id}_${lesson.lesson_date}`;
    
    // Определяем имя пользователя
    const displayName = isTeacher 
      ? `${profile?.first_name || 'Преподаватель'} (Учитель)`
      : studentName || profile?.first_name || 'Ученик';

    const configOverwrite = {
      prejoinPageEnabled: false,
      startWithAudioMuted: true,
      startWithVideoMuted: !isTeacher,
      disableInviteFunctions: true,
      hideConferenceSubject: true,
      doNotStoreRoom: true,
      startScreenSharing: false,
      enableEmailInStats: false,
    };

    const interfaceConfigOverwrite = {
      TOOLBAR_BUTTONS: isTeacher
        ? [
            'microphone', 'camera', 'desktop', 'select-background',
            'whiteboard',
            'chat', 'participants-pane', 'raisehand',
            'tileview', 'hangup', 'settings'
          ]
        : [
            'microphone', 'camera',
            'whiteboard',
            'chat', 'participants-pane', 'raisehand',
            'tileview', 'hangup'
          ],
      HIDE_INVITE_MORE_HEADER: true,
      DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
    };

    const options = {
      roomName,
      parentNode: jitsiContainerRef.current,
      width: '100%',
      height: '100%',
      userInfo: { displayName },
      configOverwrite,
      interfaceConfigOverwrite,
    };

    try {
      const api = new window.JitsiMeetExternalAPI(domain, options);
      setJitsiApi(api);

      // Обработчики событий
      api.addEventListener('videoConferenceJoined', () => {
        console.log('Присоединились к конференции');
        setIsJoined(true);
        // Здесь можно отправить информацию о присоединении в базу данных
      });

      api.addEventListener('videoConferenceLeft', () => {
        console.log('Покинули конференцию');
        setIsJoined(false);
        // Перенаправляем обратно
        navigate(-1);
      });

      api.addEventListener('participantJoined', (participant: any) => {
        console.log('Участник присоединился:', participant);
      });

      api.addEventListener('participantLeft', (participant: any) => {
        console.log('Участник покинул конференцию:', participant);
      });

    } catch (error) {
      console.error('Ошибка инициализации Jitsi:', error);
    }

    return () => {
      if (jitsiApi) {
        jitsiApi.dispose();
        setJitsiApi(null);
      }
    };
  }, [lesson, profile, isTeacher, studentName, navigate, jitsiApi]);

  const handleLeaveLesson = () => {
    if (jitsiApi) {
      jitsiApi.executeCommand('hangup');
    } else {
      navigate(-1);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="loading-spinner w-8 h-8 mx-auto mb-4"></div>
          <p>Загружаем урок...</p>
        </div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="mb-4">Урок не найден</p>
          <Button onClick={() => navigate(-1)}>Вернуться назад</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Верхняя панель */}
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="font-semibold">
              Урок: {format(new Date(lesson.lesson_date), 'dd MMMM yyyy', { locale: ru })}
            </h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Время: {lesson.start_time} - {lesson.end_time}</span>
              <span>•</span>
              <span>Класс: {lesson.classroom}</span>
            </div>
          </div>
          <Badge variant="secondary">
            {isTeacher ? 'Преподаватель' : 'Ученик'}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="text-sm text-muted-foreground">
            <div>Преподаватель: {lesson.teacher_name}</div>
            {studentName && <div>Ученик: {studentName}</div>}
          </div>
          <Button variant="outline" onClick={handleLeaveLesson}>
            Выйти из урока
          </Button>
        </div>
      </div>

      {/* Контейнер для Jitsi */}
      <div className="flex-1 relative">
        <div 
          ref={jitsiContainerRef}
          className="w-full h-full"
          style={{ minHeight: '400px' }}
        />
        
        {!window.JitsiMeetExternalAPI && (
          <div className="absolute inset-0 flex items-center justify-center bg-background">
            <div className="text-center">
              <p className="mb-4">Не удается загрузить систему видеоконференций</p>
              <p className="text-sm text-muted-foreground mb-4">
                Проверьте подключение к интернету и перезагрузите страницу
              </p>
              <Button onClick={() => window.location.reload()}>
                Перезагрузить
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}