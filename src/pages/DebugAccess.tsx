import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
interface DiagnosticResult {
  userId: string | null;
  email: string | null;
  profile: {
    id: string;
    email: string | null;
    first_name: string | null;
    last_name: string | null;
    organization_id: string | null;
    branch: string | null;
  } | null;
  profileError: string | null;
  roles: string[];
  rolesError: string | null;
  organizationId: string | null;
  clientsCount: number;
  messagesCount: number;
  organizationName: string | null;
}

export default function DebugAccess() {
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user: authUser } = useAuth();

  const runDiagnostics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // 1. Get current user from context
      const user = authUser;
      
      if (!user) {
        setError('Не авторизован: user is null');
        setLoading(false);
        return;
      }

      // 2. Get profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, organization_id, branch')
        .eq('id', user.id)
        .maybeSingle();

      // 3. Get roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      // 4. Get organization name if exists
      let organizationName: string | null = null;
      if (profile?.organization_id) {
        const { data: org } = await supabase
          .from('organizations')
          .select('name')
          .eq('id', profile.organization_id)
          .maybeSingle();
        organizationName = org?.name || null;
      }

      // 5. Count accessible clients
      const { count: clientsCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true });

      // 6. Count accessible messages
      const { count: messagesCount } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true });

      setResult({
        userId: user.id,
        email: user.email || null,
        profile: profile as DiagnosticResult['profile'],
        profileError: profileError?.message || null,
        roles: roles?.map(r => r.role) || [],
        rolesError: rolesError?.message || null,
        organizationId: profile?.organization_id || null,
        clientsCount: clientsCount || 0,
        messagesCount: messagesCount || 0,
        organizationName,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const StatusIcon = ({ ok }: { ok: boolean }) => 
    ok ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />;

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Диагностика доступа</h1>
          <Button onClick={runDiagnostics} disabled={loading} variant="outline">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-2">Обновить</span>
          </Button>
        </div>

        {error && (
          <Card className="border-red-500">
            <CardContent className="pt-6">
              <p className="text-red-500">{error}</p>
            </CardContent>
          </Card>
        )}

        {result && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <StatusIcon ok={!!result.userId} />
                  Авторизация
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p><strong>User ID:</strong> <code className="bg-muted px-2 py-1 rounded text-sm">{result.userId}</code></p>
                <p><strong>Email:</strong> {result.email}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <StatusIcon ok={!!result.profile && !!result.organizationId} />
                  Профиль
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {result.profileError ? (
                  <p className="text-red-500">Ошибка: {result.profileError}</p>
                ) : result.profile ? (
                  <>
                    <p><strong>Имя:</strong> {result.profile.first_name} {result.profile.last_name}</p>
                    <p><strong>Email:</strong> {result.profile.email}</p>
                    <p><strong>Филиал:</strong> {result.profile.branch || '—'}</p>
                    <p className={!result.organizationId ? 'text-red-500 font-bold' : ''}>
                      <strong>Organization ID:</strong>{' '}
                      <code className="bg-muted px-2 py-1 rounded text-sm">
                        {result.organizationId || 'NULL ⚠️'}
                      </code>
                    </p>
                    {result.organizationName && (
                      <p><strong>Организация:</strong> {result.organizationName}</p>
                    )}
                  </>
                ) : (
                  <p className="text-red-500 font-bold">Профиль НЕ НАЙДЕН! ⚠️</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <StatusIcon ok={result.roles.length > 0} />
                  Роли
                </CardTitle>
              </CardHeader>
              <CardContent>
                {result.rolesError ? (
                  <p className="text-red-500">Ошибка: {result.rolesError}</p>
                ) : result.roles.length > 0 ? (
                  <div className="flex gap-2">
                    {result.roles.map(role => (
                      <span key={role} className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm">
                        {role}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-red-500 font-bold">Роли НЕ НАЗНАЧЕНЫ! ⚠️</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <StatusIcon ok={result.clientsCount > 0 || result.messagesCount > 0} />
                  Доступные данные (RLS)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className={result.clientsCount === 0 ? 'text-orange-500' : ''}>
                  <strong>Клиентов (clients):</strong> {result.clientsCount}
                </p>
                <p className={result.messagesCount === 0 ? 'text-orange-500' : ''}>
                  <strong>Сообщений (chat_messages):</strong> {result.messagesCount}
                </p>
                {result.clientsCount === 0 && result.messagesCount === 0 && (
                  <p className="text-red-500 font-bold mt-4">
                    ⚠️ RLS блокирует доступ к данным. Проверьте organization_id в профиле.
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
