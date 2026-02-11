/**
 * Unified branch normalization utilities.
 * 
 * This module provides a single source of truth for branch name normalization
 * across the entire application: useManagerBranches, useUserAllowedBranches,
 * CRM filters, and localStorage persistence.
 */

/**
 * Alias map for branches with different names that refer to the same location.
 * Keys should be normalized (lowercase, cleaned).
 */
const BRANCH_ALIASES: Record<string, string> = {
  // Historical renamings
  'стахановская': 'грайвороновская',
  // Location variants
  'красная горка': 'люберцы',
  // Online school variants
  'онлайн': 'online school',
  'онлайн школа': 'online school',
  // Metro station prefix variants
  'м новокосино': 'новокосино',
  'м. новокосино': 'новокосино',
  'метро новокосино': 'новокосино',
};

/**
 * Converts a branch name to a stable, normalized key for comparison.
 * 
 * This handles:
 * - Unicode normalization (NFKC)
 * - Lowercase conversion
 * - ё → е replacement
 * - All apostrophe/quote variants removal
 * - Brand token removal (O'KEY ENGLISH, OKEY, etc.)
 * - Service word removal (филиал, branch)
 * - Punctuation to space
 * - Whitespace collapsing
 * - Alias resolution
 * 
 * @example
 * toBranchKey("O'KEY ENGLISH Новокосино") // => "новокосино"
 * toBranchKey("O'KEY ENGLISH Новокосино") // => "новокосино" (typographic apostrophe)
 * toBranchKey("Филиал Окская") // => "окская"
 * toBranchKey("Стахановская") // => "грайвороновская" (alias)
 */
/**
 * Reverse alias map: for a given normalized key,
 * what raw values might exist in the database?
 */
const REVERSE_ALIASES: Record<string, string[]> = {
  'грайвороновская': ['Грайвороновская', 'Стахановская'],
  'люберцы': ['Люберцы', 'Красная горка'],
  'online school': ['Online school', 'Онлайн', 'Онлайн школа'],
  'новокосино': ['Новокосино'],
};

/**
 * Expands a display branch name into all possible raw database values.
 * Used to build server-side filters that match all naming variants.
 */
export function expandBranchVariants(displayName: string): string[] {
  const key = toBranchKey(displayName);
  if (!key) return [displayName];
  
  const baseVariants = REVERSE_ALIASES[key] || [displayName];
  const allVariants = new Set<string>(baseVariants);
  
  // Add prefixed variants with brand tokens
  for (const variant of baseVariants) {
    allVariants.add(`O'KEY ENGLISH ${variant}`);
  }
  allVariants.add(displayName);
  
  return Array.from(allVariants);
}

export function toBranchKey(name: string | null | undefined): string {
  if (!name) return '';
  
  let normalized = name
    // Unicode normalization (handles invisible differences)
    .normalize('NFKC')
    // Lowercase
    .toLowerCase()
    // ё → е
    .replace(/ё/g, 'е')
    // Remove all apostrophe/quote variants: ' ' ʻ ʼ ʾ ʿ ˈ ˊ ˋ ′ ′ ʹ ʺ " « »
    .replace(/[''ʻʼʾʿˈˊˋ′′ʹʺ"«»"„'‚]/g, '')
    // Remove brand tokens (various spellings)
    .replace(/o\s*key\s*english/gi, '')
    .replace(/okey\s*english/gi, '')
    .replace(/o\s*key/gi, '')
    .replace(/okey/gi, '')
    // Remove service words
    .replace(/филиал/gi, '')
    .replace(/branch/gi, '')
    // Replace punctuation with space
    .replace(/[.,;:!?()[\]{}\/\\-]/g, ' ')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim();
  
  // Apply alias resolution
  if (BRANCH_ALIASES[normalized]) {
    normalized = BRANCH_ALIASES[normalized];
  }
  
  return normalized;
}

/**
 * Compares two branch names for equality using normalized keys.
 * 
 * @example
 * branchesMatch("O'KEY ENGLISH Новокосино", "Новокосино") // => true
 * branchesMatch("Стахановская", "Грайвороновская") // => true (alias)
 */
export function branchesMatch(branch1: string | null | undefined, branch2: string | null | undefined): boolean {
  const key1 = toBranchKey(branch1);
  const key2 = toBranchKey(branch2);
  
  // Empty keys never match (null/undefined branches)
  if (!key1 || !key2) return false;
  
  return key1 === key2;
}

/**
 * Checks if a client branch is in the list of allowed branches.
 * 
 * @param clientBranch - The client's branch name
 * @param allowedBranches - Array of allowed branch names (will be normalized)
 * @returns true if client branch matches any allowed branch
 */
export function isBranchAllowed(
  clientBranch: string | null | undefined,
  allowedBranches: string[]
): boolean {
  if (!clientBranch) return false;
  
  const clientKey = toBranchKey(clientBranch);
  if (!clientKey) return false;
  
  return allowedBranches.some(branch => toBranchKey(branch) === clientKey);
}

/**
 * Creates a Set of normalized branch keys for efficient lookup.
 * 
 * @param branches - Array of branch names
 * @returns Set of normalized branch keys
 */
export function toBranchKeySet(branches: string[]): Set<string> {
  return new Set(
    branches
      .map(toBranchKey)
      .filter(Boolean)
  );
}

/**
 * Gets unique normalized branch keys from an array of objects with branch property.
 * 
 * @param items - Array of objects with branch property
 * @param getBranch - Function to extract branch name from item
 * @returns Array of unique normalized branch keys
 */
export function getUniqueBranchKeys<T>(
  items: T[],
  getBranch: (item: T) => string | null | undefined
): string[] {
  const keys = new Set<string>();
  for (const item of items) {
    const key = toBranchKey(getBranch(item));
    if (key) keys.add(key);
  }
  return Array.from(keys).sort();
}

/**
 * Diagnostic helper: returns both raw and normalized branch info for debugging.
 */
export function diagnoseBranch(branch: string | null | undefined): {
  raw: string | null;
  normalized: string;
  isEmpty: boolean;
} {
  return {
    raw: branch ?? null,
    normalized: toBranchKey(branch),
    isEmpty: !toBranchKey(branch),
  };
}

/**
 * Diagnostic helper: compares two branches and explains the result.
 */
export function diagnoseBranchMatch(
  branch1: string | null | undefined,
  branch2: string | null | undefined
): {
  raw1: string | null;
  raw2: string | null;
  key1: string;
  key2: string;
  match: boolean;
} {
  const key1 = toBranchKey(branch1);
  const key2 = toBranchKey(branch2);
  
  return {
    raw1: branch1 ?? null,
    raw2: branch2 ?? null,
    key1,
    key2,
    match: key1 === key2 && !!key1,
  };
}
