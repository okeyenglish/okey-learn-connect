import { Card, CardContent } from "@/components/ui/card";
import { FamilyCard } from "./FamilyCard";
import { FamilyCardSkeleton } from "./FamilyCardSkeleton";
import { supabase } from "@/integrations/supabase/typedClient";
import { useQuery } from "@tanstack/react-query";

interface FamilyCardWrapperProps {
  clientId: string;
  onOpenChat?: (clientId: string, messengerType?: 'whatsapp' | 'telegram' | 'max') => void;
  activeMessengerTab?: 'whatsapp' | 'telegram' | 'max';
}

// Fetch or create family group ID using single RPC call
const fetchFamilyGroupId = async (clientId: string): Promise<string | null> => {
  const startTime = performance.now();
  
  // Single RPC call replaces 5-7 sequential queries
  const { data, error } = await supabase
    .rpc('get_or_create_family_group_id', { p_client_id: clientId });

  console.log(`[FamilyCardWrapper] RPC completed in ${(performance.now() - startTime).toFixed(0)}ms`);

  if (error) {
    console.error('[FamilyCardWrapper] RPC error:', error);
    return null;
  }

  return data as string | null;
};

export const FamilyCardWrapper = ({ clientId, onOpenChat, activeMessengerTab }: FamilyCardWrapperProps) => {
  // Use React Query for caching and deduplication
  const { data: familyGroupId, isLoading, error } = useQuery({
    queryKey: ['family-group-id', clientId],
    queryFn: () => fetchFamilyGroupId(clientId),
    enabled: !!clientId,
    staleTime: 60000, // 1 minute - data considered fresh
    gcTime: 5 * 60 * 1000, // 5 minutes cache
    refetchOnWindowFocus: false,
    retry: 1,
  });

  if (isLoading) {
    return <FamilyCardSkeleton />;
  }

  if (error || !familyGroupId) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">
            {error ? 'Ошибка загрузки' : 'Не удалось загрузить данные клиента'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="animate-scale-in">
      <FamilyCard
        familyGroupId={familyGroupId}
        activeMemberId={clientId}
        onSwitchMember={(memberId) => console.log('Switch member:', memberId)}
        onOpenChat={onOpenChat}
        onCall={(memberId) => console.log('Call member:', memberId)}
        onPhoneSwitch={(phoneId) => console.log('Switch phone:', phoneId)}
        activePhoneId="1"
        activeMessengerTab={activeMessengerTab}
      />
    </div>
  );
};
