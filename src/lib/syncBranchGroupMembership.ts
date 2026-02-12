import { selfHostedPost } from './selfHostedApi';

interface StaffGroupChat {
  id: string;
  name: string;
  branch_name: string | null;
  is_branch_group: boolean;
}

const DEFAULT_ORGANIZATION_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Sync staff branch group membership when their branch changes.
 * - Removes user from old branch group (if any)
 * - Adds user to new branch group (if any)
 */
export async function syncBranchGroupMembership(
  userId: string,
  oldBranch: string | null | undefined,
  newBranch: string | null | undefined,
): Promise<void> {
  if (!userId) return;
  
  // Normalize
  const oldB = oldBranch?.trim().toLowerCase() || null;
  const newB = newBranch?.trim().toLowerCase() || null;
  
  // No change
  if (oldB === newB) return;

  try {
    // Fetch all branch groups
    const response = await selfHostedPost<{ groups: StaffGroupChat[] }>('get-staff-group-chats', {
      organization_id: DEFAULT_ORGANIZATION_ID,
      user_id: userId,
    });

    const groups = response.data?.groups || [];
    const branchGroups = groups.filter(g => g.is_branch_group && g.branch_name);

    // Remove from old branch group
    if (oldB) {
      const oldGroup = branchGroups.find(
        g => g.branch_name!.toLowerCase() === oldB
      );
      if (oldGroup) {
        console.log('[syncBranchGroup] Removing from old branch group:', oldGroup.name);
        await selfHostedPost('remove-staff-group-member', {
          group_id: oldGroup.id,
          user_id: userId,
        }).catch(e => console.error('[syncBranchGroup] Remove failed:', e));
      }
    }

    // Add to new branch group
    if (newB) {
      const newGroup = branchGroups.find(
        g => g.branch_name!.toLowerCase() === newB
      );
      if (newGroup) {
        console.log('[syncBranchGroup] Adding to new branch group:', newGroup.name);
        await selfHostedPost('add-staff-group-member', {
          group_id: newGroup.id,
          user_id: userId,
          role: 'member',
        }).catch(e => console.error('[syncBranchGroup] Add failed:', e));
      }
    }
  } catch (e) {
    console.error('[syncBranchGroup] Error syncing branch groups:', e);
  }
}
