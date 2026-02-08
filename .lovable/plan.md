
# План исправления фильтрации клиентов по филиалам

## Обнаруженная проблема

Менеджер из Новокосино видит клиентов Окской, потому что система фильтрации не работает корректно.

### Корневые причины:

1. **Таблица `user_branches` не существует** в базе данных Lovable Cloud
2. На self-hosted сервере используется **другая таблица** — `manager_branches`, а не `user_branches`
3. Хук `useManagerBranches` пытается читать из несуществующей таблицы, получает ошибку, и возвращает пустой массив
4. Fallback на `profile.branch` также не работает, так как профили хранятся на self-hosted, а не в Lovable Cloud
5. В результате: `allowedBranchNames = []`, `hasRestrictions = false` → **все менеджеры видят всех клиентов**

## Решение

Изменить хук `useManagerBranches` так, чтобы он получал филиалы пользователя через self-hosted API, аналогично другим хукам проекта (например, `useStaffGroupChats`).

### Шаги реализации:

1. **Создать Edge Function** `get-user-branches` на self-hosted
   - Будет получать филиалы из таблицы `manager_branches` (или `user_branches`, если она там есть)
   - Также будет возвращать филиал из профиля как fallback

2. **Обновить хук `useManagerBranches`**
   - Заменить прямой запрос к несуществующей таблице `user_branches` на вызов `selfHostedPost('get-user-branches')`
   - Сохранить текущую логику фильтрации `canAccessBranch`

3. **Проверить и протестировать**
   - Менеджер Новокосино должен видеть только клиентов Новокосино
   - Менеджер с несколькими филиалами должен видеть клиентов из всех назначенных филиалов
   - Админы продолжают видеть всех клиентов

---

## Техническая реализация

### Файл 1: `supabase/functions/get-user-branches/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { user_id } = await req.json()

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 1. Попробуем получить филиалы из manager_branches
    const { data: managerBranches, error: mbError } = await supabase
      .from('manager_branches')
      .select('id, branch')
      .eq('manager_id', user_id)

    if (!mbError && managerBranches?.length > 0) {
      return new Response(
        JSON.stringify({ branches: managerBranches, source: 'manager_branches' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Fallback: user_branches
    const { data: userBranches, error: ubError } = await supabase
      .from('user_branches')
      .select('id, branch')
      .eq('user_id', user_id)

    if (!ubError && userBranches?.length > 0) {
      return new Response(
        JSON.stringify({ branches: userBranches, source: 'user_branches' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Fallback: profile.branch
    const { data: profile } = await supabase
      .from('profiles')
      .select('branch')
      .eq('id', user_id)
      .single()

    if (profile?.branch) {
      return new Response(
        JSON.stringify({ 
          branches: [{ id: 'profile-branch', branch: profile.branch }], 
          source: 'profile' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Нет филиалов — пользователь видит все
    return new Response(
      JSON.stringify({ branches: [], source: 'none' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

### Файл 2: `src/hooks/useManagerBranches.ts` (обновлённый)

Ключевые изменения:
- Замена `supabase.from('user_branches')` на `selfHostedPost('get-user-branches')`
- Использование API ответа для построения списка филиалов
- Сохранение всей логики нормализации и фильтрации

```typescript
import { useAuth } from "@/hooks/useAuth";
import { isAdmin as checkIsAdmin } from "@/lib/permissions";
import { useQuery } from "@tanstack/react-query";
import { selfHostedPost } from "@/lib/selfHostedApi";

export interface ManagerBranch {
  id: string;
  branch: string;
}

export function useManagerBranches() {
  const { user, roles } = useAuth();
  const isAdmin = checkIsAdmin(roles);

  const { data: branchData, isLoading } = useQuery({
    queryKey: ['manager-branches-selfhosted', user?.id],
    queryFn: async () => {
      if (!user?.id || isAdmin) return { branches: [], source: 'admin' };

      const response = await selfHostedPost<{
        branches: { id: string; branch: string }[];
        source: string;
      }>('get-user-branches', { user_id: user.id });

      if (!response.success || !response.data) {
        console.warn('Failed to fetch user branches:', response.error);
        return { branches: [], source: 'error' };
      }

      return response.data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const userBranches = branchData?.branches || [];
  const allowedBranchNames = userBranches.map(b => b.branch).filter(Boolean);
  const hasRestrictions = !isAdmin && allowedBranchNames.length > 0;

  const canAccessBranch = (clientBranch: string | null | undefined): boolean => {
    if (!hasRestrictions) return true;
    if (!clientBranch) return false;

    const normalizedClientBranch = normalizeBranchName(clientBranch);
    return allowedBranchNames.some(
      (userBranch) => normalizeBranchName(userBranch) === normalizedClientBranch
    );
  };

  return {
    managerBranches: userBranches as ManagerBranch[],
    allowedBranchNames,
    hasRestrictions,
    canAccessBranch,
    isLoading,
    isAdmin,
    userBranch: allowedBranchNames[0] || null,
  };
}

function normalizeBranchName(name: string): string {
  return name
    .toLowerCase()
    .replace(/okey\s*english\s*/gi, '')
    .replace(/o'key\s*english\s*/gi, '')
    .replace(/филиал\s*/gi, '')
    .trim();
}
```

---

## Ожидаемый результат

После внедрения:
- Менеджер Новокосино **не будет видеть** клиентов Окской
- Менеджер увидит только клиентов из филиала, к которому он привязан
- Админы продолжат видеть всех клиентов без ограничений
- Клиенты без филиала (`branch = null`) будут скрыты от менеджеров с ограничениями
