// Централизованная система ценообразования для курсов

export interface CoursePriceInfo {
  pricePerLesson: number;        // Цена за одно занятие
  academicHoursPerLesson: number; // Академических часов за занятие
  packagePrice: number;           // Цена пакета из 8 занятий
}

/**
 * Прайс-лист для курсов
 * Основан на пакетах по 8 занятий
 */
const COURSE_PRICES: Record<string, CoursePriceInfo> = {
  // Super Safari - дошкольники (1.5 ак.ч за занятие)
  'super safari 1': {
    pricePerLesson: 1250,
    academicHoursPerLesson: 1.5,
    packagePrice: 10000
  },
  'super safari 2': {
    pricePerLesson: 1250,
    academicHoursPerLesson: 1.5,
    packagePrice: 10000
  },
  'super safari 3': {
    pricePerLesson: 2000,  // Как на скриншоте
    academicHoursPerLesson: 2,
    packagePrice: 16000
  },
  
  // Kid's Box - младшие школьники (2 ак.ч за занятие)
  "kid's box 1": {
    pricePerLesson: 1500,
    academicHoursPerLesson: 2,
    packagePrice: 12000
  },
  "kid's box 2": {
    pricePerLesson: 1500,
    academicHoursPerLesson: 2,
    packagePrice: 12000
  },
  "kid's box 3": {
    pricePerLesson: 1500,
    academicHoursPerLesson: 2,
    packagePrice: 12000
  },
  "kid's box 4": {
    pricePerLesson: 1500,
    academicHoursPerLesson: 2,
    packagePrice: 12000
  },
  "kid's box 5": {
    pricePerLesson: 1500,
    academicHoursPerLesson: 2,
    packagePrice: 12000
  },
  "kid's box 6": {
    pricePerLesson: 1500,
    academicHoursPerLesson: 2,
    packagePrice: 12000
  },
  
  // Prepare - подростки (2 ак.ч за занятие)
  'prepare 1': {
    pricePerLesson: 1750,
    academicHoursPerLesson: 2,
    packagePrice: 14000
  },
  'prepare 2': {
    pricePerLesson: 1750,
    academicHoursPerLesson: 2,
    packagePrice: 14000
  },
  'prepare 3': {
    pricePerLesson: 1750,
    academicHoursPerLesson: 2,
    packagePrice: 14000
  },
  'prepare 4': {
    pricePerLesson: 1750,
    academicHoursPerLesson: 2,
    packagePrice: 14000
  },
  'prepare 5': {
    pricePerLesson: 1750,
    academicHoursPerLesson: 2,
    packagePrice: 14000
  },
  'prepare 6': {
    pricePerLesson: 1750,
    academicHoursPerLesson: 2,
    packagePrice: 14000
  },
  'prepare 7': {
    pricePerLesson: 1750,
    academicHoursPerLesson: 2,
    packagePrice: 14000
  },
  
  // Empower - взрослые (2 ак.ч за занятие)
  'empower a1': {
    pricePerLesson: 1750,
    academicHoursPerLesson: 2,
    packagePrice: 14000
  },
  'empower a2': {
    pricePerLesson: 1750,
    academicHoursPerLesson: 2,
    packagePrice: 14000
  },
  'empower b1': {
    pricePerLesson: 1750,
    academicHoursPerLesson: 2,
    packagePrice: 14000
  },
  'empower b1+': {
    pricePerLesson: 1750,
    academicHoursPerLesson: 2,
    packagePrice: 14000
  },
  'empower b2': {
    pricePerLesson: 1750,
    academicHoursPerLesson: 2,
    packagePrice: 14000
  },
  'empower c1': {
    pricePerLesson: 1750,
    academicHoursPerLesson: 2,
    packagePrice: 14000
  }
};

/**
 * Получает информацию о цене курса
 * @param courseName Название курса (из course_name или group.name)
 * @returns Информация о цене или дефолтные значения
 */
export function getCoursePriceInfo(courseName?: string): CoursePriceInfo {
  if (!courseName) {
    return {
      pricePerLesson: 2000,
      academicHoursPerLesson: 2,
      packagePrice: 16000
    };
  }

  const normalizedName = courseName.toLowerCase().trim();
  
  // Проверяем точное совпадение
  if (COURSE_PRICES[normalizedName]) {
    return COURSE_PRICES[normalizedName];
  }
  
  // Проверяем частичное совпадение
  for (const [key, value] of Object.entries(COURSE_PRICES)) {
    if (normalizedName.includes(key) || key.includes(normalizedName)) {
      return value;
    }
  }
  
  // Fallback: определяем по ключевым словам
  if (normalizedName.includes('super safari')) {
    return {
      pricePerLesson: 1250,
      academicHoursPerLesson: 1.5,
      packagePrice: 10000
    };
  }
  
  if (normalizedName.includes("kid's box") || normalizedName.includes('kids box')) {
    return {
      pricePerLesson: 1500,
      academicHoursPerLesson: 2,
      packagePrice: 12000
    };
  }
  
  if (normalizedName.includes('prepare')) {
    return {
      pricePerLesson: 1750,
      academicHoursPerLesson: 2,
      packagePrice: 14000
    };
  }
  
  if (normalizedName.includes('empower')) {
    return {
      pricePerLesson: 1750,
      academicHoursPerLesson: 2,
      packagePrice: 14000
    };
  }
  
  // По умолчанию - стандартная цена
  return {
    pricePerLesson: 2000,
    academicHoursPerLesson: 2,
    packagePrice: 16000
  };
}

/**
 * Рассчитывает стоимость пакета занятий
 */
export function calculatePackagePrice(courseName: string | undefined, lessonsCount: number): number {
  const priceInfo = getCoursePriceInfo(courseName);
  return priceInfo.pricePerLesson * lessonsCount;
}

/**
 * Возвращает стандартные пакеты занятий с ценами
 */
export function getStandardPackages(courseName?: string) {
  const priceInfo = getCoursePriceInfo(courseName);
  const packages = [1, 4, 8, 24, 80];
  
  return packages.map(count => ({
    count,
    price: priceInfo.pricePerLesson * count
  }));
}
