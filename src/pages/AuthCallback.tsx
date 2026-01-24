import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

const CRM_URL = 'https://crm.academyos.ru';
const SUPABASE_URL = 'https://api.academyos.ru';

// Encrypt tokens via Edge Function before redirect
const encryptTokensForSSO = async (session: { access_token: string; refresh_token: string }) => {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/sso-encrypt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      }),
    });

    if (!response.ok) {
      console.error('SSO encrypt failed:', response.status);
      return null;
    }

    const data = await response.json();
    return data.encrypted;
  } catch (error) {
    console.error('SSO encrypt error:', error);
    return null;
  }
};

// Build SSO redirect URL with encrypted token
const buildSSORedirectUrl = (encryptedPayload: string) => {
  const params = new URLSearchParams({ sso: encryptedPayload });
  return `${CRM_URL}/auth/sso?${params.toString()}`;
};

export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;

      if (session?.user) {
        // Encrypt tokens before redirect
        const encrypted = await encryptTokensForSSO(session);
        
        if (encrypted) {
          // Redirect to external CRM with encrypted SSO token
          const ssoUrl = buildSSORedirectUrl(encrypted);
          window.location.href = ssoUrl;
        } else {
          // Fallback: redirect without encryption (less secure)
          console.warn('Falling back to unencrypted SSO redirect');
          const params = new URLSearchParams({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          });
          window.location.href = `${CRM_URL}/auth/sso?${params.toString()}`;
        }
      } else {
        setError('Сессия не найдена');
        setStatus('error');
      }
    })();
    return () => { mounted = false; };
  }, [navigate]);

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 to-background">
        <div className="text-center p-8 bg-card rounded-lg shadow-lg max-w-md">
          <XCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h2 className="text-xl font-semibold mb-2">Ошибка авторизации</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button 
            onClick={() => navigate('/auth', { replace: true })}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Войти заново
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Завершаем вход...</p>
      </div>
    </div>
  );
}
