import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { FamilyCard } from "./FamilyCard";
import { FamilyCardSkeleton } from "./FamilyCardSkeleton";
import { supabase } from "@/integrations/supabase/typedClient";
import { normalizePhone } from "@/utils/phoneNormalization";

interface FamilyCardWrapperProps {
  clientId: string;
  onOpenChat?: (clientId: string, messengerType?: 'whatsapp' | 'telegram' | 'max') => void;
}

// Cache for family group lookups to avoid repeated queries
const familyGroupCache = new Map<string, { groupId: string; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute cache

export const FamilyCardWrapper = ({ clientId, onOpenChat }: FamilyCardWrapperProps) => {
  const [familyGroupId, setFamilyGroupId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const createAttemptedRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Check cache first
  const getCachedFamilyGroup = useCallback((cId: string): string | null => {
    const cached = familyGroupCache.get(cId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.groupId;
    }
    return null;
  }, []);

  // Set cache
  const setCachedFamilyGroup = useCallback((cId: string, groupId: string) => {
    familyGroupCache.set(cId, { groupId, timestamp: Date.now() });
  }, []);

  const createFamilyGroupForClient = useCallback(async (cId: string) => {
    if (createAttemptedRef.current === cId) return null;
    createAttemptedRef.current = cId;

    try {
      setCreating(true);

      // Get client info in single query
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('name, first_name, last_name, phone')
        .eq('id', cId)
        .single();

      if (clientError) throw clientError;

      // Build group name
      let groupName = 'Семья клиента';
      if (client?.last_name) {
        groupName = `Семья ${client.last_name}`;
      } else if (client?.name) {
        const parts = client.name.split(' ');
        groupName = `Семья ${parts[0] || 'клиента'}`;
      }

      // Create family group and link client in parallel using transaction-like approach
      const { data: group, error: groupError } = await supabase
        .from('family_groups')
        .insert({ name: groupName })
        .select('id')
        .single();

      if (groupError) throw groupError;

      // Link client to family group
      await supabase.from('family_members').insert({
        family_group_id: group.id,
        client_id: cId,
        relationship_type: 'main',
        is_primary_contact: true,
      });

      // Ensure phone number exists (non-blocking)
      if (client?.phone) {
        const { data: existingPhones } = await supabase
          .from('client_phone_numbers')
          .select('id')
          .eq('client_id', cId)
          .limit(1);

        if (!existingPhones?.length) {
          await supabase.from('client_phone_numbers').insert({
            client_id: cId,
            phone: client.phone,
            is_primary: true,
          });
        }
      }
      console.log('[FamilyCardWrapper] Created family group:', group.id);
      return group.id;
    } catch (err: unknown) {
      console.error('[FamilyCardWrapper] Error creating family group:', err);
      return null;
    } finally {
      setCreating(false);
    }
  }, []);

  useEffect(() => {
    // Cancel previous request if client changes
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const fetchOrCreateFamilyGroup = async () => {
      if (!clientId) {
        setLoading(false);
        return;
      }

      // Check cache first - instant response
      const cached = getCachedFamilyGroup(clientId);
      if (cached) {
        setFamilyGroupId(cached);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Single optimized query to get family group
        const { data, error } = await supabase
          .from('family_members')
          .select('family_group_id, is_primary_contact')
          .eq('client_id', clientId)
          .order('is_primary_contact', { ascending: false })
          .limit(1);

        if (error) throw error;

        if (data?.length && data[0].family_group_id) {
          const groupId = data[0].family_group_id;
          setCachedFamilyGroup(clientId, groupId);
          setFamilyGroupId(groupId);
          createAttemptedRef.current = null;
          return;
        }

        // No family group - try to find by phone (single query)
        const { data: client } = await supabase
          .from('clients')
          .select('phone')
          .eq('id', clientId)
          .single();

        if (client?.phone) {
          const phoneNorm = normalizePhone(client.phone);
          if (phoneNorm) {
            // Find existing family group by phone in one query
            const { data: existingGroups } = await supabase
              .from('family_members')
              .select(`
                family_group_id,
                clients!inner (phone)
              `)
              .eq('clients.phone', phoneNorm)
              .limit(1);

            if (existingGroups?.length && existingGroups[0].family_group_id) {
              const groupId = existingGroups[0].family_group_id;
              
              // Link client to existing group
              await supabase.from('family_members').insert({
                family_group_id: groupId,
                client_id: clientId,
                relationship_type: 'parent',
                is_primary_contact: false,
              });

              setCachedFamilyGroup(clientId, groupId);
              setFamilyGroupId(groupId);
              createAttemptedRef.current = null;
              return;
            }
          }
        }

        // No existing group found - create new
        const newGroupId = await createFamilyGroupForClient(clientId);
        if (newGroupId) {
          setCachedFamilyGroup(clientId, newGroupId);
          setFamilyGroupId(newGroupId);
        } else {
          setError('Не удалось создать карточку клиента');
        }
      } catch (err) {
        console.error('[FamilyCardWrapper] Error:', err);
        setError('Ошибка загрузки данных');
      } finally {
        setLoading(false);
      }
    };

    setFamilyGroupId(null);
    createAttemptedRef.current = null;
    fetchOrCreateFamilyGroup();

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [clientId, getCachedFamilyGroup, setCachedFamilyGroup, createFamilyGroupForClient]);

  if (loading || creating) {
    return <FamilyCardSkeleton />;
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
    <div className="animate-scale-in">
      <FamilyCard
        familyGroupId={familyGroupId}
        activeMemberId={clientId}
        onSwitchMember={(memberId) => console.log('Switch member:', memberId)}
        onOpenChat={onOpenChat}
        onCall={(memberId) => console.log('Call member:', memberId)}
        onPhoneSwitch={(phoneId) => console.log('Switch phone:', phoneId)}
        activePhoneId="1"
      />
    </div>
  );
};