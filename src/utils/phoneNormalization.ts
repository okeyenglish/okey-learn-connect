/**
 * Нормализует телефонный номер к единому формату 79161234567
 * 
 * Примеры:
 * - "+7 (916) 123-45-67" → "79161234567"
 * - "8 916 123 45 67" → "79161234567"
 * - "9161234567" → "79161234567"
 * - "+7 916 123 45 67" → "79161234567"
 */
export function normalizePhone(phoneInput: string | null | undefined): string {
  // Если NULL или пустая строка, возвращаем пустую строку
  if (!phoneInput || phoneInput.trim() === '') {
    return '';
  }
  
  // Убираем все символы кроме цифр
  let cleaned = phoneInput.replace(/\D/g, '');
  
  // Если номер начинается с 8 (российский формат), заменяем на 7
  if (/^8\d{10}$/.test(cleaned)) {
    cleaned = '7' + cleaned.substring(1);
  }
  
  // Если номер 10 цифр (без кода страны), добавляем 7
  if (cleaned.length === 10) {
    cleaned = '7' + cleaned;
  }
  
  // Возвращаем нормализованный номер
  return cleaned;
}

/**
 * Форматирует телефон для отображения: +7 (916) 123-45-67
 */
export function formatPhoneForDisplay(phone: string | null | undefined): string {
  if (!phone) return '';
  
  const normalized = normalizePhone(phone);
  
  // Если номер не российский (не начинается с 7) или длина != 11, возвращаем как есть
  if (!normalized.startsWith('7') || normalized.length !== 11) {
    return normalized;
  }
  
  // Форматируем: +7 (916) 123-45-67
  const code = normalized.substring(1, 4);
  const part1 = normalized.substring(4, 7);
  const part2 = normalized.substring(7, 9);
  const part3 = normalized.substring(9, 11);
  
  return `+7 (${code}) ${part1}-${part2}-${part3}`;
}

/**
 * Валидирует российский номер телефона
 */
export function isValidRussianPhone(phone: string | null | undefined): boolean {
  if (!phone) return false;
  
  const normalized = normalizePhone(phone);
  
  // Проверяем: начинается с 7 и длина 11 цифр
  return /^7\d{10}$/.test(normalized);
}
