/**
 * Extract organization ID from WPP session name
 * Expected format: org_<uuid> or org_<uuid>_suffix
 */
export function extractOrgIdFromSession(sessionName: string | undefined): string | null {
  if (!sessionName) return null;
  
  const str = String(sessionName);
  
  // Match org_<uuid> or org_<uuid>_anything
  const match = str.match(/^org_([a-f0-9-]{36})(?:_|$)/i);
  
  if (match) {
    return match[1];
  }
  
  return null;
}
