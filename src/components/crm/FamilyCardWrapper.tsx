import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FamilyCard } from "./FamilyCard";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FamilyCardWrapperProps {
  clientId: string;
  onOpenChat?: (clientId: string, messengerType?: 'whatsapp' | 'telegram' | 'max') => void;
}

export const FamilyCardWrapper = ({ clientId, onOpenChat }: FamilyCardWrapperProps) => {
  const [familyGroupId, setFamilyGroupId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchFamilyGroupId = async () => {
      if (!clientId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Find family groups for this client, prioritizing where they are primary contact
        const { data, error } = await supabase
          .from('family_members')
          .select('family_group_id, is_primary_contact')
          .eq('client_id', clientId)
          .order('is_primary_contact', { ascending: false });

        if (error) throw error;

        // Take the first one where client is primary, or just the first one if none
        const primaryGroup = data?.find(fm => fm.is_primary_contact);
        const selectedGroup = primaryGroup || data?.[0];
        
        setFamilyGroupId(selectedGroup?.family_group_id ?? null);
      } catch (err) {
        console.error('Error fetching family group ID:', err);
        setError('Ошибка загрузки данных семьи');
      } finally {
        setLoading(false);
      }
    };

    fetchFamilyGroupId();
  }, [clientId]);

  const createFamilyGroupForClient = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get client info
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('name')
        .eq('id', clientId)
        .single();

      if (clientError) throw clientError;

      const lastName = client?.name?.split(' ').slice(-1)[0] || 'клиента';
      const groupName = `Семья ${lastName}`;

      // Create family group
      const { data: group, error: groupError } = await supabase
        .from('family_groups')
        .insert({ name: groupName })
        .select()
        .single();

      if (groupError) throw groupError;

      // Link client as primary contact
      const { error: linkError } = await supabase
        .from('family_members')
        .insert({
          family_group_id: group.id,
          client_id: clientId,
          relationship_type: 'main',
          is_primary_contact: true,
        });

      if (linkError) throw linkError;

      setFamilyGroupId(group.id);
      toast({ title: 'Семейная группа создана', description: 'Клиент назначен основным контактом' });
    } catch (err: any) {
      console.error('Error creating family group:', err);
      setError('Не удалось создать семейную группу');
      toast({ title: 'Ошибка', description: 'Не удалось создать семейную группу', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Загрузка семейных данных...</p>
        </CardContent>
      </Card>
    );
  }

  if (!familyGroupId) {
    return (
      <Card>
        <CardContent className="p-6 space-y-3">
          <p className="text-center text-muted-foreground">
            Семейная группа не найдена
          </p>
          <div className="flex justify-center">
            <Button onClick={createFamilyGroupForClient}>
              Создать семейную группу
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <FamilyCard
      familyGroupId={familyGroupId}
      activeMemberId={clientId}
      onSwitchMember={(memberId) => console.log('Switch member:', memberId)}
      onOpenChat={onOpenChat}
      onCall={(memberId) => console.log('Call member:', memberId)}
      onPhoneSwitch={(phoneId) => console.log('Switch phone:', phoneId)}
      activePhoneId="1"
    />
  );
};