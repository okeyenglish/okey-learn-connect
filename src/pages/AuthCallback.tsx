import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

const CRM_URL = 'https://crm.academyos.ru';

// Build SSO redirect URL with session tokens
const buildSSORedirectUrl = (session: { access_token: string; refresh_token: string }) => {
  const params = new URLSearchParams({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
  return `${CRM_URL}/auth/sso?${params.toString()}`;
};

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;

      if (session?.user) {
        // Redirect to external CRM with SSO tokens
        const ssoUrl = buildSSORedirectUrl(session);
        window.location.href = ssoUrl;
      } else {
        // If no session yet, go to auth page
        navigate('/auth', { replace: true });
      }
    })();
    return () => { mounted = false; };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Завершаем вход...</p>
      </div>
    </div>
  );
}