import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
  const [creating, setCreating] = useState(false);
  const createAttemptedRef = useRef<string | null>(null);
  const { toast } = useToast();

  const createFamilyGroupForClient = async (cId: string) => {
    // Prevent duplicate creation attempts for the same client
    if (createAttemptedRef.current === cId) return null;
    createAttemptedRef.current = cId;

    try {
      setCreating(true);

      // Get client info
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('name, first_name, last_name')
        .eq('id', cId)
        .single();

      if (clientError) throw clientError;

      // Build group name from last_name or parsed from name
      let groupName = 'Семья клиента';
      if (client?.last_name) {
        groupName = `Семья ${client.last_name}`;
      } else if (client?.name) {
        const parts = client.name.split(' ');
        const lastName = parts[0] || 'клиента';
        groupName = `Семья ${lastName}`;
      }

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
          client_id: cId,
          relationship_type: 'main',
          is_primary_contact: true,
        });

      if (linkError) throw linkError;

      console.log('Auto-created family group for client:', cId, group.id);
      return group.id;
    } catch (err: any) {
      console.error('Error creating family group:', err);
      return null;
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    const fetchOrCreateFamilyGroup = async () => {
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
        
        if (selectedGroup?.family_group_id) {
          setFamilyGroupId(selectedGroup.family_group_id);
          createAttemptedRef.current = null; // Reset for next client
        } else {
          // No family group found - auto-create one
          const newGroupId = await createFamilyGroupForClient(clientId);
          if (newGroupId) {
            setFamilyGroupId(newGroupId);
          } else {
            setError('Не удалось создать карточку клиента');
          }
        }
      } catch (err) {
        console.error('Error fetching family group ID:', err);
        setError('Ошибка загрузки данных');
      } finally {
        setLoading(false);
      }
    };

    // Reset state when client changes
    setFamilyGroupId(null);
    createAttemptedRef.current = null;
    fetchOrCreateFamilyGroup();
  }, [clientId]);

  if (loading || creating) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">
            {creating ? 'Создание карточки клиента...' : 'Загрузка...'}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (error || !familyGroupId) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">{error || 'Ошибка загрузки'}</p>
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