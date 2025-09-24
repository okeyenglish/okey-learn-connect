import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import ProtectedRoute from '@/components/ProtectedRoute';

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

  const studentName = searchParams.get('student');
  const teacherName = searchParams.get('teacher');

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

  const isTeacher = profile?.department === 'teacher';

  useEffect(() => {
    if (!lesson || !jitsiContainerRef.current || jitsiApi) return;

    if (!window.JitsiMeetExternalAPI) {
      console.error('Jitsi Meet API не загружен');
      return;
    }

    const domain = 'meet.jit.si';
    const roomName = `OKEYEnglish_${lesson.id}_${lesson.lesson_date}`;
    
    const displayName = isTeacher 
      ? `${profile?.first_name || 'Преподаватель'} (Учитель)`
      : studentName || profile?.first_name || 'Ученик';

    const options = {
      roomName,
      parentNode: jitsiContainerRef.current,
      width: '100%',
      height: '100%',
      userInfo: { displayName },
      configOverwrite: {
        prejoinPageEnabled: false,
        startWithAudioMuted: true,
        startWithVideoMuted: !isTeacher,
      }
    };

    try {
      const api = new window.JitsiMeetExternalAPI(domain, options);
      setJitsiApi(api);

      api.addEventListener('videoConferenceLeft', () => {
        navigate(-1);
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

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="loading-spinner w-8 h-8 mx-auto mb-4"></div>
            <p>Загружаем урок...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!lesson) {
    return (
      <ProtectedRoute>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="mb-4">Урок не найден</p>
            <Button onClick={() => navigate(-1)}>Вернуться назад</Button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="h-screen flex flex-col">
        <div className="flex items-center justify-between p-4 border-b bg-background">
          <div>
            <h1 className="font-semibold">
              Урок: {format(new Date(lesson.lesson_date), 'dd MMMM yyyy', { locale: ru })}
            </h1>
            <div className="text-sm text-muted-foreground">
              Время: {lesson.start_time} - {lesson.end_time} • Класс: {lesson.classroom}
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate(-1)}>
            Выйти из урока
          </Button>
        </div>

        <div className="flex-1 relative">
          <div 
            ref={jitsiContainerRef}
            className="w-full h-full"
            style={{ minHeight: '400px' }}
          />
        </div>
      </div>
    </ProtectedRoute>
  );
}