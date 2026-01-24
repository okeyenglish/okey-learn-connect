import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function SSOCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleSSO = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (!accessToken || !refreshToken) {
          setError('Токены авторизации не найдены в URL');
          setStatus('error');
          return;
        }

        // Set session using tokens from URL
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          console.error('SSO session error:', sessionError);
          setError(sessionError.message || 'Ошибка установки сессии');
          setStatus('error');
          return;
        }

        // Clear tokens from URL for security
        window.history.replaceState({}, '', '/auth/sso');
        
        setStatus('success');
        
        // Redirect to main CRM page after short delay
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 1000);
        
      } catch (err) {
        console.error('SSO error:', err);
        setError('Произошла ошибка при авторизации');
        setStatus('error');
      }
    };

    handleSSO();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 to-background">
      <div className="text-center p-8 bg-card rounded-lg shadow-lg max-w-md">
        {status === 'loading' && (
          <>
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <h2 className="text-xl font-semibold mb-2">Выполняется вход...</h2>
            <p className="text-muted-foreground">Устанавливаем сессию авторизации</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <h2 className="text-xl font-semibold mb-2">Вход выполнен!</h2>
            <p className="text-muted-foreground">Перенаправляем в систему...</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <XCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-semibold mb-2">Ошибка авторизации</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <button 
              onClick={() => navigate('/auth', { replace: true })}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Войти заново
            </button>
          </>
        )}
      </div>
    </div>
  );
}
