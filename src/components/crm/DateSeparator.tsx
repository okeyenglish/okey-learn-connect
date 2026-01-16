import { format, isToday, isYesterday, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

interface DateSeparatorProps {
  date: string | Date;
}

/**
 * Format date for chat separator
 * - "Сегодня" for today
 * - "Вчера" for yesterday  
 * - "10 ноября 2025" for other dates
 */
function formatDateForSeparator(date: Date): string {
  if (isToday(date)) {
    return "Сегодня";
  }
  if (isYesterday(date)) {
    return "Вчера";
  }
  // Format as "10 ноября 2025"
  return format(date, "d MMMM yyyy", { locale: ru });
}

/**
 * Get date string (YYYY-MM-DD) from a date for comparison
 */
export function getDateKey(dateInput: string | Date): string {
  const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
  return format(date, "yyyy-MM-dd");
}

/**
 * Check if we need to show a date separator between two messages
 */
export function shouldShowDateSeparator(
  currentMessageDate: string | Date | undefined,
  previousMessageDate: string | Date | undefined
): boolean {
  if (!currentMessageDate) return false;
  if (!previousMessageDate) return true; // First message always shows separator
  
  const currentKey = getDateKey(currentMessageDate);
  const previousKey = getDateKey(previousMessageDate);
  
  return currentKey !== previousKey;
}

export const DateSeparator = ({ date }: DateSeparatorProps) => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const formattedDate = formatDateForSeparator(dateObj);

  return (
    <div className="flex items-center justify-center my-3">
      <div className="bg-muted/60 text-muted-foreground text-xs font-medium px-3 py-1 rounded-full">
        {formattedDate}
      </div>
    </div>
  );
};
