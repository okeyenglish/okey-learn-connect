import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { FamilyCard } from "./FamilyCard";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { normalizePhone } from "@/utils/phoneNormalization";

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

  const ensurePhoneNumberExists = async (cId: string, phone: string | null) => {
    if (!phone) return;

    // Check if phone number record already exists for this client
    const { data: existing } = await supabase
      .from('client_phone_numbers')
      .select('id')
      .eq('client_id', cId)
      .limit(1);

    if (existing && existing.length > 0) return;

    // Create phone number record
    await supabase
      .from('client_phone_numbers')
      .insert({
        client_id: cId,
        phone: phone,
        is_primary: true,
      });

    console.log('Created phone number record for client:', cId);
  };

  const getNormalizedPhoneForClient = async (cId: string): Promise<string | null> => {
    // 1) Prefer clients.phone
    const { data: client } = await supabase
      .from('clients')
      .select('phone')
      .eq('id', cId)
      .maybeSingle();

    const fromClient = client?.phone ? normalizePhone(client.phone) : '';
    if (fromClient) return fromClient;

    // 2) Fallback to client_phone_numbers (primary if possible)
    const { data: phones } = await supabase
      .from('client_phone_numbers')
      .select('phone, is_primary')
      .eq('client_id', cId)
      .order('is_primary', { ascending: false })
      .limit(1);

    const fromPhones = phones?.[0]?.phone ? normalizePhone(phones[0].phone) : '';
    return fromPhones || null;
  };

  const getStudentsCountForGroup = async (groupId: string): Promise<number> => {
    const { count } = await supabase
      .from('students')
      .select('id', { count: 'exact', head: true })
      .eq('family_group_id', groupId);

    return count || 0;
  };

  const findBestFamilyGroupByPhone = async (phoneNorm: string): Promise<{ groupId: string; studentsCount: number } | null> => {
    if (!phoneNorm) return null;

    // Find all client IDs that have this phone (either in clients.phone or in client_phone_numbers)
    const [{ data: clientsByPhone }, { data: phoneRows }] = await Promise.all([
      supabase.from('clients').select('id').eq('phone', phoneNorm),
      supabase.from('client_phone_numbers').select('client_id').eq('phone', phoneNorm),
    ]);

    const ids = new Set<string>();
    (clientsByPhone || []).forEach((c: any) => c?.id && ids.add(c.id));
    (phoneRows || []).forEach((r: any) => r?.client_id && ids.add(r.client_id));

    const clientIds = Array.from(ids);
    if (clientIds.length === 0) return null;

    const { data: members } = await supabase
      .from('family_members')
      .select('family_group_id')
      .in('client_id', clientIds);

    const groupIds = Array.from(new Set((members || []).map((m: any) => m.family_group_id).filter(Boolean)));
    if (groupIds.length === 0) return null;

    // Choose group with max students
    const counts = await Promise.all(
      groupIds.map(async (gid) => ({ gid, cnt: await getStudentsCountForGroup(gid) }))
    );

    counts.sort((a, b) => b.cnt - a.cnt);
    return { groupId: counts[0].gid, studentsCount: counts[0].cnt };
  };

  const ensureClientLinkedToFamilyGroup = async (cId: string, groupId: string) => {
    // already linked?
    const { data: existing } = await supabase
      .from('family_members')
      .select('id')
      .eq('client_id', cId)
      .eq('family_group_id', groupId)
      .maybeSingle();

    if (existing?.id) return;

    await supabase
      .from('family_members')
      .insert({
        family_group_id: groupId,
        client_id: cId,
        relationship_type: 'parent',
        is_primary_contact: false,
      });
  };

  const createFamilyGroupForClient = async (cId: string) => {
    // Prevent duplicate creation attempts for the same client
    if (createAttemptedRef.current === cId) return null;
    createAttemptedRef.current = cId;

    try {
      setCreating(true);

      // Get client info including phone
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('name, first_name, last_name, phone')
        .eq('id', cId)
        .single();

      if (clientError) throw clientError;

      // Ensure phone number record exists
      await ensurePhoneNumberExists(cId, client?.phone || null);

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

        // Ensure phone number exists for existing clients too
        const { data: client } = await supabase
          .from('clients')
          .select('phone')
          .eq('id', clientId)
          .maybeSingle();

        if (client?.phone) {
          await ensurePhoneNumberExists(clientId, client.phone);
        }

        // Resolve phone-based family group (to prevent duplicates and fix missed links)
        const phoneNorm = await getNormalizedPhoneForClient(clientId);
        const bestByPhone = phoneNorm ? await findBestFamilyGroupByPhone(phoneNorm) : null;

        const primaryGroup = data?.find(fm => fm.is_primary_contact);
        const selectedGroup = primaryGroup || data?.[0];

        if (selectedGroup?.family_group_id) {
          // If current group is empty but there is another group with same phone that has students, switch to it
          if (bestByPhone && bestByPhone.groupId !== selectedGroup.family_group_id && bestByPhone.studentsCount > 0) {
            const currentCount = await getStudentsCountForGroup(selectedGroup.family_group_id);
            if (currentCount === 0) {
              await ensureClientLinkedToFamilyGroup(clientId, bestByPhone.groupId);
              setFamilyGroupId(bestByPhone.groupId);
              createAttemptedRef.current = null;
              return;
            }
          }

          setFamilyGroupId(selectedGroup.family_group_id);
          createAttemptedRef.current = null; // Reset for next client
          return;
        }

        // No family group for this client yet
        if (bestByPhone?.groupId) {
          await ensureClientLinkedToFamilyGroup(clientId, bestByPhone.groupId);
          setFamilyGroupId(bestByPhone.groupId);
          createAttemptedRef.current = null;
          return;
        }

        // Fallback: auto-create
        const newGroupId = await createFamilyGroupForClient(clientId);
        if (newGroupId) {
          setFamilyGroupId(newGroupId);
        } else {
          setError('Не удалось создать карточку клиента');
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
