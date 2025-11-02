import { supabase } from '@/integrations/supabase/client';

/**
 * Get AI provider key for the current user's organization or teacher
 * This function works client-side and server-side
 */
export const getAIProviderKey = async (): Promise<{
  provider: 'openrouter' | 'gateway';
  key?: string;
  keyPreview?: string;
  limitRemaining?: number;
}> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get user's profile to find organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      throw new Error('User has no organization');
    }

    // Try to get organization key first (higher priority)
    const { data: orgKey } = await supabase
      .from('v_ai_provider_keys_public')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .eq('provider', 'openrouter')
      .eq('status', 'active')
      .single();

    if (orgKey) {
      return {
        provider: 'openrouter',
        keyPreview: orgKey.key_preview,
        limitRemaining: orgKey.limit_remaining,
      };
    }

    // If no org key, try teacher key
    const { data: teacher } = await supabase
      .from('teachers')
      .select('id')
      .eq('profile_id', user.id)
      .single();

    if (teacher) {
      const { data: teacherKey } = await supabase
        .from('v_ai_provider_keys_public')
        .select('*')
        .eq('teacher_id', teacher.id)
        .eq('provider', 'openrouter')
        .eq('status', 'active')
        .single();

      if (teacherKey) {
        return {
          provider: 'openrouter',
          keyPreview: teacherKey.key_preview,
          limitRemaining: teacherKey.limit_remaining,
        };
      }
    }

    // Default to gateway if no keys found
    return {
      provider: 'gateway',
    };
  } catch (error) {
    console.error('Error getting AI provider key:', error);
    // Fallback to gateway
    return {
      provider: 'gateway',
    };
  }
};

/**
 * Server-side function to get actual key value (requires service_role)
 * Use this in Edge Functions only
 */
export const getAIProviderKeyValue = async (
  organizationId?: string,
  teacherId?: string
): Promise<string | null> => {
  // This would be called from an Edge Function with service_role access
  // Client-side code cannot access key_value due to RLS
  
  if (organizationId) {
    const { data } = await supabase
      .from('ai_provider_keys')
      .select('key_value')
      .eq('organization_id', organizationId)
      .eq('provider', 'openrouter')
      .eq('status', 'active')
      .single();

    return data?.key_value || null;
  }

  if (teacherId) {
    const { data } = await supabase
      .from('ai_provider_keys')
      .select('key_value')
      .eq('teacher_id', teacherId)
      .eq('provider', 'openrouter')
      .eq('status', 'active')
      .single();

    return data?.key_value || null;
  }

  return null;
};

/**
 * Check if organization or teacher has an active OpenRouter key
 */
export const hasActiveOpenRouterKey = async (
  organizationId?: string,
  teacherId?: string
): Promise<boolean> => {
  if (organizationId) {
    const { data } = await supabase
      .from('v_ai_provider_keys_public')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('provider', 'openrouter')
      .eq('status', 'active')
      .maybeSingle();

    return !!data;
  }

  if (teacherId) {
    const { data } = await supabase
      .from('v_ai_provider_keys_public')
      .select('id')
      .eq('teacher_id', teacherId)
      .eq('provider', 'openrouter')
      .eq('status', 'active')
      .maybeSingle();

    return !!data;
  }

  return false;
};

/**
 * Manually trigger key provisioning for an organization or teacher
 * Useful for backfilling existing entities
 */
export const triggerKeyProvisioning = async (
  entityType: 'organization' | 'teacher',
  entityId: string,
  entityName: string
): Promise<void> => {
  const jobData = entityType === 'organization'
    ? {
        organization_id: entityId,
        entity_name: entityName,
        provider: 'openrouter',
        monthly_limit: 200,
        reset_policy: 'daily',
      }
    : {
        teacher_id: entityId,
        entity_name: entityName,
        provider: 'openrouter',
        monthly_limit: 50,
        reset_policy: 'daily',
      };

  const { error } = await supabase
    .from('ai_key_provision_jobs')
    .insert(jobData);

  if (error) {
    throw new Error(`Failed to create provisioning job: ${error.message}`);
  }
};
