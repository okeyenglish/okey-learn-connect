import { supabase } from '@/integrations/supabase/typedClient';
import { getCachedUserId } from '@/lib/authHelpers';

/**
 * Get the current user's organization ID
 * This should be called before any insert operations that require organization_id
 * Uses cached userId to avoid duplicate getUser() calls
 */
export const getCurrentOrganizationId = async (): Promise<string> => {
  const userId = await getCachedUserId();
  
  if (!userId) {
    throw new Error('User not authenticated');
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', userId)
    .single();

  if (error || !profile?.organization_id) {
    throw new Error('Could not get organization ID');
  }

  return profile.organization_id;
};
