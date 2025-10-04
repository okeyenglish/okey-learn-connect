// Система расчёта стоимости занятий на основе продолжительности
// Базовая цена: 1800 руб за 40 минут

const BASE_PRICE = 1800; // руб за 40 минут
const BASE_DURATION = 40; // минут
const TEACHER_RATE = 500; // руб за 40 минут

export const LESSON_DURATIONS = [40, 60, 80, 100] as const;
export type LessonDuration = typeof LESSON_DURATIONS[number];

/**
 * Рассчитывает стоимость занятия для студента на основе продолжительности
 * @param duration Продолжительность в минутах (40, 60, 80, 100)
 * @returns Стоимость в рублях
 */
export function calculateLessonPrice(duration: number): number {
  return Math.round((duration / BASE_DURATION) * BASE_PRICE);
}

/**
 * Рассчитывает оплату преподавателю на основе продолжительности
 * @param duration Продолжительность в минутах
 * @returns Оплата в рублях
 */
export function calculateTeacherPay(duration: number): number {
  return Math.round((duration / BASE_DURATION) * TEACHER_RATE);
}

/**
 * Возвращает текстовое описание продолжительности
 */
export function getDurationLabel(duration: number): string {
  return `${duration} мин`;
}

/**
 * Получает цены для всех доступных продолжительностей
 */
export function getAllPrices(): { duration: number; price: number; label: string }[] {
  return LESSON_DURATIONS.map(duration => ({
    duration,
    price: calculateLessonPrice(duration),
    label: getDurationLabel(duration)
  }));
}
