import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;

      if (session?.user) {
        // Redirect to external CRM after successful auth
        window.location.href = 'https://crm.academyos.ru/';
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