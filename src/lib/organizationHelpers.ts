import { supabase } from '@/integrations/supabase/typedClient';

/**
 * Get the current user's organization ID
 * This should be called before any insert operations that require organization_id
 */
export const getCurrentOrganizationId = async (): Promise<string> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data: profile, error } = await (supabase.from('profiles' as any) as any)
    .select('organization_id')
    .eq('id', user.id)
    .single();

  if (error || !profile?.organization_id) {
    throw new Error('Could not get organization ID');
  }

  return profile.organization_id;
};
