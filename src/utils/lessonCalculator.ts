import { differenceInDays, parseISO, startOfDay } from 'date-fns';

/**
 * Вычисляет номер урока для курса Kid's Box 1 на основе даты урока
 * @param lessonDate - дата урока в формате ISO string
 * @param courseStartDate - дата начала курса (по умолчанию 1 сентября 2025)
 * @returns номер урока (1-80) или null если не удается определить
 */
export function calculateLessonNumber(
  lessonDate: string,
  courseStartDate: string = '2025-09-01'
): number | null {
  try {
    const startDate = startOfDay(parseISO(courseStartDate));
    const currentLessonDate = startOfDay(parseISO(lessonDate));
    
    // Вычисляем количество дней с начала курса
    const daysDiff = differenceInDays(currentLessonDate, startDate);
    
    if (daysDiff < 0) return null; // Урок до начала курса
    
    // Курс проходит 2 раза в неделю (понедельник, четверг)
    // Приблизительно каждые 3.5 дня урок
    const lessonsPerWeek = 2;
    const daysPerWeek = 7;
    
    // Более точный расчет с учетом расписания по понедельникам и четвергам
    const weeks = Math.floor(daysDiff / daysPerWeek);
    const remainingDays = daysDiff % daysPerWeek;
    
    let lessonNumber = weeks * lessonsPerWeek;
    
    // Определяем день недели текущего урока
    const dayOfWeek = currentLessonDate.getDay();
    
    // Понедельник = 1, Четверг = 4
    if (dayOfWeek === 1) { // Понедельник
      lessonNumber += 1;
    } else if (dayOfWeek === 4) { // Четверг
      lessonNumber += 2;
    } else {
      // Если урок не в запланированный день, пытаемся угадать
      lessonNumber += remainingDays >= 4 ? 2 : 1;
    }
    
    // Учитываем зимний перерыв с 1 по 10 января 2026
    const winterBreakStart = parseISO('2026-01-01');
    const winterBreakEnd = parseISO('2026-01-10');
    
    if (currentLessonDate >= winterBreakStart && currentLessonDate <= winterBreakEnd) {
      return null; // Урок во время каникул
    }
    
    // Если урок после зимних каникул, корректируем номер
    if (currentLessonDate > winterBreakEnd) {
      // Зимний перерыв длится 10 дней, что примерно 3 урока
      lessonNumber -= 3;
    }
    
    // Ограничиваем номер урока в пределах курса (1-80)
    if (lessonNumber > 80) return 80;
    if (lessonNumber < 1) return 1;
    
    return lessonNumber;
  } catch (error) {
    console.error('Error calculating lesson number:', error);
    return null;
  }
}

/**
 * Определяет номер урока для групп Kid's Box 1 на основе названия группы и даты
 */
export function getLessonNumberForGroup(
  groupName: string,
  groupLevel: string | undefined,
  lessonDate: string
): number | null {
  // Проверяем, является ли это группой Kid's Box 1
  const isKidsBox1 = groupLevel === "Kid's Box 1" || 
                     groupName?.toLowerCase().includes("kid's box 1") ||
                     groupName?.toLowerCase().includes("kids box 1");
  
  if (!isKidsBox1) {
    return null;
  }
  
  return calculateLessonNumber(lessonDate);
}