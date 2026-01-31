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
  
  // Если номер 10 цифр и начинается с 9 (без кода страны), добавляем 7
  // ВАЖНО: не добавляем 7 к номерам начинающимся с других цифр (это могут быть Telegram ID)
  if (cleaned.length === 10 && cleaned.startsWith('9')) {
    cleaned = '7' + cleaned;
  }
  
  // Возвращаем нормализованный номер
  return cleaned;
}

/**
 * Проверяет, является ли строка валидным телефонным номером (а не Telegram ID)
 * Telegram ID обычно 9-10+ цифр и не начинаются с 7, 8, 9
 */
export function isLikelyPhoneNumber(input: string | null | undefined): boolean {
  if (!input) return false;
  
  const cleaned = input.replace(/\D/g, '');
  
  // Слишком короткий или слишком длинный - не телефон
  if (cleaned.length < 10 || cleaned.length > 15) {
    return false;
  }
  
  // Проверяем начало номера - валидные телефоны начинаются с 7, 8, 9, +7, +8
  // Telegram ID часто начинаются с 1, 2, 3, 4, 5, 6
  const firstDigit = cleaned[0];
  
  // Если 11 цифр и начинается с 7 или 8 - это телефон
  if (cleaned.length === 11 && (firstDigit === '7' || firstDigit === '8')) {
    return true;
  }
  
  // Если 10 цифр и начинается с 9 - это телефон без кода страны
  if (cleaned.length === 10 && firstDigit === '9') {
    return true;
  }
  
  // Международные номера могут начинаться с других цифр, но должны быть длиннее
  // Для простоты считаем номера 12+ цифр международными
  if (cleaned.length >= 12) {
    return true;
  }
  
  // Всё остальное - вероятно Telegram ID
  return false;
}

/**
 * Форматирует телефон для отображения: +7 (916) 123-45-67
 * Если номер не похож на телефон (например, Telegram ID), возвращает null
 */
export function formatPhoneForDisplay(phone: string | null | undefined): string {
  if (!phone) return '';
  
  // Проверяем, что это действительно телефон, а не Telegram ID
  if (!isLikelyPhoneNumber(phone)) {
    return ''; // Не форматируем как телефон - это вероятно Telegram ID
  }
  
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
  
  // Сначала проверяем, что это вообще похоже на телефон
  if (!isLikelyPhoneNumber(phone)) return false;
  
  const normalized = normalizePhone(phone);
  
  // Проверяем: начинается с 7 и длина 11 цифр
  return /^7\d{10}$/.test(normalized);
}
