import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, LogIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/typedClient";

type LoginState = 'loading' | 'success' | 'error' | 'expired';

export default function PortalLogin() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  
  const [state, setState] = useState<LoginState>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [clientName, setClientName] = useState('');

  useEffect(() => {
    if (token) {
      validateAndLogin(token);
    } else {
      setState('error');
      setErrorMessage('Ссылка недействительна');
    }
  }, [token]);

  const validateAndLogin = async (loginToken: string) => {
    try {
      // First try client_invitations (for password reset / login links)
      const { data: invitation, error: invError } = await supabase
        .from('client_invitations')
        .select('*, clients(*)')
        .eq('invite_token', loginToken)
        .maybeSingle();

      if (invitation) {
        // Check if expired
        if (new Date(invitation.expires_at) < new Date()) {
          setState('expired');
          return;
        }

        // Check if client has user_id (registered)
        if (!invitation.clients?.user_id) {
          // Not registered yet - redirect to onboarding
          navigate(`/client-onboarding?token=${loginToken}`);
          return;
        }

        setClientName(invitation.clients?.name || invitation.first_name || '');

        // Create a session for the user using admin API
        const response = await supabase.functions.invoke('portal-magic-login', {
          body: { token: loginToken }
        });

        if (response.error) {
          throw new Error(response.error.message);
        }

        if (response.data?.session) {
          // Set the session
          await supabase.auth.setSession({
            access_token: response.data.session.access_token,
            refresh_token: response.data.session.refresh_token
          });

          setState('success');
          
          // Redirect to portal after short delay
          setTimeout(() => {
            navigate('/parent-portal');
          }, 2000);
        } else {
          throw new Error('Не удалось создать сессию');
        }
      } else {
        setState('error');
        setErrorMessage('Ссылка недействительна или устарела');
      }
    } catch (error) {
      console.error('Login error:', error);
      setState('error');
      setErrorMessage(error instanceof Error ? error.message : 'Произошла ошибка при входе');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <LogIn className="h-6 w-6" />
            Вход в личный кабинет
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {state === 'loading' && (
            <div className="text-center py-8">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Выполняется вход...</p>
            </div>
          )}

          {state === 'success' && (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Добро пожаловать{clientName ? `, ${clientName}` : ''}!
              </h3>
              <p className="text-muted-foreground mb-4">
                Вход выполнен успешно. Перенаправляем в личный кабинет...
              </p>
              <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" />
            </div>
          )}

          {state === 'expired' && (
            <div className="text-center py-8">
              <XCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Ссылка устарела</h3>
              <p className="text-muted-foreground mb-6">
                Срок действия ссылки истёк. Запросите новую ссылку у администратора школы.
              </p>
              <Button 
                variant="outline" 
                onClick={() => navigate('/auth')}
              >
                Перейти на страницу входа
              </Button>
            </div>
          )}

          {state === 'error' && (
            <div className="text-center py-8">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Ошибка входа</h3>
              <p className="text-muted-foreground mb-6">{errorMessage}</p>
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/auth')}
                  className="w-full"
                >
                  Войти по email и паролю
                </Button>
                <p className="text-xs text-muted-foreground">
                  Если у вас нет аккаунта, обратитесь к администратору школы
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
