/**
 * Утилиты для валидации идентификаторов мессенджеров
 * Помогает отличить реальные WhatsApp номера от Telegram ID
 */

/**
 * Проверяет, является ли строка валидным WhatsApp ID (телефонный номер)
 * WhatsApp ID должен быть телефоном в формате: 79161234567 или 79161234567@c.us
 * Telegram ID - это числа >11 цифр, не начинающиеся с телефонных кодов
 */
export function isValidWhatsappId(whatsappId: string | null | undefined): boolean {
  if (!whatsappId || whatsappId.trim() === '') {
    return false;
  }
  
  // Убираем @c.us суффикс если есть
  let digits = whatsappId.replace(/@c\.us$/i, '');
  
  // Извлекаем только цифры
  digits = digits.replace(/\D/g, '');
  const len = digits.length;
  
  // WhatsApp номер должен быть 10-15 цифр
  if (len < 10 || len > 15) {
    return false;
  }
  
  // Если >11 цифр, проверяем что начинается с известного кода страны
  // Telegram ID обычно 12+ цифр и НЕ начинаются с типичных кодов
  if (len > 11) {
    const validPrefixes = [
      '7',    // Россия
      '380',  // Украина
      '375',  // Беларусь
      '998',  // Узбекистан
      '996',  // Кыргызстан
      '992',  // Таджикистан
      '993',  // Туркменистан
      '994',  // Азербайджан
      '995',  // Грузия
      '374',  // Армения
      '373',  // Молдова
      '370',  // Литва
      '371',  // Латвия
      '372',  // Эстония
      '1',    // США/Канада
      '44',   // UK
      '49',   // Германия
      '33',   // Франция
      '39',   // Италия
      '34',   // Испания
      '90',   // Турция
      '86',   // Китай
      '91',   // Индия
    ];
    
    const hasValidPrefix = validPrefixes.some(prefix => digits.startsWith(prefix));
    if (!hasValidPrefix) {
      // Число >11 цифр без известного кода страны - скорее всего Telegram ID
      return false;
    }
  }
  
  // 10 цифр - проверяем российские номера
  if (len === 10) {
    // Должен начинаться с 9 (мобильный) или 4,8 (городской)
    if (!/^[948]/.test(digits)) {
      return false;
    }
  }
  
  // 11 цифр
  if (len === 11) {
    if (!/^[781]/.test(digits)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Проверяет, похожа ли строка на Telegram User ID
 * Telegram ID - это числа, обычно 9-13 цифр
 */
export function looksLikeTelegramId(value: string | null | undefined): boolean {
  if (!value || value.trim() === '') {
    return false;
  }
  
  const digits = value.replace(/\D/g, '');
  
  // Telegram ID обычно 9-13 цифр
  // И НЕ похож на телефон (не начинается с 7, 8, 1, 44 и т.д.)
  if (digits.length >= 9 && digits.length <= 15) {
    // Если это НЕ валидный WhatsApp ID, то скорее всего Telegram ID
    return !isValidWhatsappId(value);
  }
  
  return false;
}

/**
 * Форматирует WhatsApp ID для отображения
 * Убирает @c.us и форматирует как телефон
 */
export function formatWhatsappIdForDisplay(whatsappId: string | null | undefined): string {
  if (!whatsappId) return '';
  
  // Убираем @c.us
  let digits = whatsappId.replace(/@c\.us$/i, '');
  digits = digits.replace(/\D/g, '');
  
  // Форматируем как телефон для российских номеров
  if (digits.length === 11 && digits.startsWith('7')) {
    const code = digits.substring(1, 4);
    const part1 = digits.substring(4, 7);
    const part2 = digits.substring(7, 9);
    const part3 = digits.substring(9, 11);
    return `+7 (${code}) ${part1}-${part2}-${part3}`;
  }
  
  // Для остальных просто добавляем +
  return '+' + digits;
}
