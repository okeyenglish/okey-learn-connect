import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { FamilyCard } from "./FamilyCard";
import { FamilyCardSkeleton } from "./FamilyCardSkeleton";
import { supabase } from "@/integrations/supabase/typedClient";
import { normalizePhone } from "@/utils/phoneNormalization";
import { useQuery } from "@tanstack/react-query";

interface FamilyCardWrapperProps {
  clientId: string;
  onOpenChat?: (clientId: string, messengerType?: 'whatsapp' | 'telegram' | 'max') => void;
  activeMessengerTab?: 'whatsapp' | 'telegram' | 'max';
}

// Fetch or create family group ID for a client
const fetchFamilyGroupId = async (clientId: string): Promise<string | null> => {
  const startTime = performance.now();
  
  // Step 1: Check if client already has a family group
  const { data: existingMember, error: memberError } = await supabase
    .from('family_members')
    .select('family_group_id')
    .eq('client_id', clientId)
    .limit(1)
    .single();

  if (!memberError && existingMember?.family_group_id) {
    console.log(`[FamilyCardWrapper] Found existing group in ${(performance.now() - startTime).toFixed(0)}ms`);
    return existingMember.family_group_id;
  }

  // Step 2: Get client phone to find or create group
  const { data: client } = await supabase
    .from('clients')
    .select('name, first_name, last_name, phone')
    .eq('id', clientId)
    .single();

  // Step 3: Try to find existing group by phone
  if (client?.phone) {
    const phoneNorm = normalizePhone(client.phone);
    if (phoneNorm) {
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

        console.log(`[FamilyCardWrapper] Linked to existing group in ${(performance.now() - startTime).toFixed(0)}ms`);
        return groupId;
      }
    }
  }

  // Step 4: Create new family group
  let groupName = 'Семья клиента';
  if (client?.last_name) {
    groupName = `Семья ${client.last_name}`;
  } else if (client?.name) {
    const parts = client.name.split(' ');
    groupName = `Семья ${parts[0] || 'клиента'}`;
  }

  const { data: group, error: groupError } = await supabase
    .from('family_groups')
    .insert({ name: groupName })
    .select('id')
    .single();

  if (groupError) {
    console.error('[FamilyCardWrapper] Error creating group:', groupError);
    return null;
  }

  // Link client to new group
  await supabase.from('family_members').insert({
    family_group_id: group.id,
    client_id: clientId,
    relationship_type: 'main',
    is_primary_contact: true,
  });

  // Ensure phone number exists
  if (client?.phone) {
    const { data: existingPhones } = await supabase
      .from('client_phone_numbers')
      .select('id')
      .eq('client_id', clientId)
      .limit(1);

    if (!existingPhones?.length) {
      await supabase.from('client_phone_numbers').insert({
        client_id: clientId,
        phone: client.phone,
        is_primary: true,
      });
    }
  }

  console.log(`[FamilyCardWrapper] Created new group in ${(performance.now() - startTime).toFixed(0)}ms`);
  return group.id;
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
