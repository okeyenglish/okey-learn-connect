/**
 * UUID Validation Utility
 * 
 * Used to validate client IDs before passing them to hooks/queries
 * that expect valid UUIDs. Teacher chat markers (teacher:xxx) are
 * not valid UUIDs and should be filtered out.
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates if a string is a valid UUID v1-5
 * @param str - The string to validate
 * @returns true if the string is a valid UUID, false otherwise
 */
export const isValidUUID = (str: string | null | undefined): boolean => {
  if (!str) return false;
  return UUID_REGEX.test(str);
};

/**
 * Returns the input string if it's a valid UUID, otherwise returns null
 * Useful for safely passing clientId to hooks that require valid UUIDs
 * @param str - The string to validate
 * @returns The original string if valid UUID, null otherwise
 */
export const safeUUID = (str: string | null | undefined): string | null => {
  if (!str) return null;
  return UUID_REGEX.test(str) ? str : null;
};

/**
 * Checks if the clientId is a teacher marker (teacher:xxx format)
 * @param clientId - The client ID to check
 * @returns true if it's a teacher marker
 */
export const isTeacherMarker = (clientId: string | null | undefined): boolean => {
  if (!clientId) return false;
  return clientId.startsWith('teacher:');
};

/**
 * Extracts the teacher ID from a teacher marker
 * @param clientId - The client ID in teacher:xxx format
 * @returns The teacher ID or null if not a valid marker
 */
export const extractTeacherId = (clientId: string | null | undefined): string | null => {
  if (!clientId || !clientId.startsWith('teacher:')) return null;
  const teacherId = clientId.replace('teacher:', '');
  return isValidUUID(teacherId) ? teacherId : null;
};
