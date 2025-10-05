/**
 * Извлекает базовое название курса из полного названия группы/программы
 * Удаляет цифры, уровни и другие детали
 * 
 * @example
 * extractCourseName("Super Safari 3") => "Super Safari"
 * extractCourseName("Kid's Box 1") => "Kid's Box"
 * extractCourseName("Empower A2") => "Empower"
 */
export function extractCourseName(fullName: string): string {
  const name = fullName.trim();
  
  // Список известных курсов для точного сопоставления
  const coursePatterns = [
    { pattern: /super\s*safari/i, name: 'Super Safari' },
    { pattern: /kid'?s?\s*box/i, name: "Kid's Box" },
    { pattern: /prepare/i, name: 'Prepare' },
    { pattern: /empower/i, name: 'Empower' },
    { pattern: /speaking\s*club/i, name: 'Speaking Club' },
    { pattern: /workshop/i, name: 'Workshop' },
  ];
  
  // Проверяем каждый паттерн
  for (const { pattern, name: courseName } of coursePatterns) {
    if (pattern.test(name)) {
      return courseName;
    }
  }
  
  // Если не найдено совпадение, возвращаем название без цифр и уровней
  return name
    .replace(/\s+\d+$/, '') // Убираем цифры в конце
    .replace(/\s+[A-C][12]$/i, '') // Убираем уровни типа A1, B2, C1
    .replace(/\s+Starter$/i, '') // Убираем "Starter"
    .trim();
}
