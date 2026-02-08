/**
 * @deprecated Use toBranchKey from @/lib/branchUtils instead.
 * This file is kept for backward compatibility only.
 * 
 * The new branchUtils.ts provides a unified normalization function
 * that handles all edge cases including alias resolution.
 */

import { toBranchKey } from '@/lib/branchUtils';

/**
 * @deprecated Use toBranchKey from @/lib/branchUtils instead.
 */
export function normalizeBranchName(name: string): string {
  // For backward compatibility, this still returns display names for specific aliases
  // The new toBranchKey function returns normalized keys for comparison
  const n = name.trim().toLowerCase();
  const map: Record<string, string> = {
    'стахановская': 'Грайвороновская',
    'солнцево': "O'KEY English Солнцево",
    'красная горка': 'Люберцы',
    'онлайн школа': 'ONLINE SCHOOL',
    'онлайн': 'ONLINE SCHOOL',
  };
  return map[n] || name;
}

// Re-export for convenience
export { toBranchKey };
