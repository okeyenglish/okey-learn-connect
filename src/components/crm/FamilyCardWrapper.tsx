import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { FamilyCard } from "./FamilyCard";
import { supabase } from "@/integrations/supabase/client";

interface FamilyCardWrapperProps {
  clientId: string;
}

export const FamilyCardWrapper = ({ clientId }: FamilyCardWrapperProps) => {
  const [familyGroupId, setFamilyGroupId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFamilyGroupId = async () => {
      if (!clientId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Find the family group for this client
        const { data, error } = await supabase
          .from('family_members')
          .select('family_group_id')
          .eq('client_id', clientId)
          .single();

        if (error) {
          console.error('Error finding family group:', error);
          setError('Семейная группа не найдена');
          return;
        }

        setFamilyGroupId(data.family_group_id);
      } catch (err) {
        console.error('Error fetching family group ID:', err);
        setError('Ошибка загрузки данных семьи');
      } finally {
        setLoading(false);
      }
    };

    fetchFamilyGroupId();
  }, [clientId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Загрузка семейных данных...</p>
        </CardContent>
      </Card>
    );
  }

  if (error || !familyGroupId) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">
            {error || "Семейная группа не найдена"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <FamilyCard
      familyGroupId={familyGroupId}
      activeMemberId={clientId}
      onSwitchMember={(memberId) => console.log('Switch member:', memberId)}
      onOpenChat={(memberId) => console.log('Open chat:', memberId)}
      onCall={(memberId) => console.log('Call member:', memberId)}
      onPhoneSwitch={(phoneId) => console.log('Switch phone:', phoneId)}
      activePhoneId="1"
    />
  );
};