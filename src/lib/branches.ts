// Изображения филиалов
import novokosinoImage from "@/assets/novokosino-branch.jpg";
import kotelnikiImage from "@/assets/kotelniki-branch.jpg";
import okskayaImage from "@/assets/okskaya-branch.jpg";
import lyubertsyImage from "@/assets/lyubertsy-branch.jpg";
import stakhanovskayaImage from "@/assets/stakhanovskaya-branch.jpg";
import mytishchiImage from "@/assets/mytishchi-branch.jpg";
import krasnayaGorkaImage from "@/assets/krasnaya-gorka-branch.jpg";
import solntsevoImage from "@/assets/solntsevo-branch.jpg";
import onlineSchoolImage from "@/assets/online-learning-new.png";

export interface Branch {
  id: string;
  name: string;
  address: string;
  metro: string;
  workingHours: string;
  image: string;
  features: string[];
}

export interface BranchWithSchedule extends Branch {
  activeGroups: number;
  nextGroup: string;
  availableSpots: number;
}

export interface BranchForIndex extends Branch {
  slug: string;
  activeGroups: number;
  nextGroup: string;
}

// Основной массив филиалов с полной информацией
export const branches: Branch[] = [
  { 
    id: "kotelniki",
    name: "Котельники", 
    address: "2-й Покровский проезд, 14к2",
    metro: "Котельники",
    workingHours: "Пн-Пт: 9:00-21:00, Сб-Вс: 10:00-18:00",
    image: kotelnikiImage,
    features: ["Современные классы", "Интерактивные доски", "Детская зона"]
  },
  { 
    id: "novokosino",
    name: "Новокосино", 
    address: "Реутов, Юбилейный проспект, 60",
    metro: "Новокосино",
    workingHours: "Пн-Пт: 9:00-21:00, Сб-Вс: 10:00-18:00",
    image: novokosinoImage,
    features: ["Просторные классы", "Парковка", "Кафе рядом"]
  },
  { 
    id: "okskaya",
    name: "Окская", 
    address: "ул. Окская, д. 3, корп. 1",
    metro: "Окская",
    workingHours: "Пн-Пт: 9:00-21:00, Сб-Вс: 10:00-18:00",
    image: okskayaImage,
    features: ["Уютная атмосфера", "Библиотека", "Игровая комната"]
  },
  { 
    id: "stakhanovskaya",
    name: "Стахановская", 
    address: "2-й Грайвороновский пр-д, 42к1",
    metro: "Стахановская",
    workingHours: "Пн-Пт: 9:00-21:00, Сб-Вс: 10:00-18:00",
    image: stakhanovskayaImage,
    features: ["Новый ремонт", "Мультимедиа", "Удобный подъезд"]
  },
  { 
    id: "solntsevo",
    name: "Солнцево", 
    address: "ул. Богданова, 6к1",
    metro: "Солнцево",
    workingHours: "Пн-Пт: 9:00-21:00, Сб-Вс: 10:00-18:00",
    image: solntsevoImage,
    features: ["Новые классы", "Удобная парковка", "Детская площадка"]
  },
  { 
    id: "mytishchi",
    name: "Мытищи", 
    address: "ул. Борисовка, 16А",
    metro: "Мытищи (МЦД-1)",
    workingHours: "Пн-Пт: 9:00-21:00, Сб-Вс: 10:00-18:00",
    image: mytishchiImage,
    features: ["Просторные аудитории", "Техническое оснащение", "Буфет"]
  },
  { 
    id: "lyubertsy-1",
    name: "Люберцы", 
    address: "3 Почтовое отделение, 65к1",
    metro: "Люберцы (МЦД-1)",
    workingHours: "Пн-Пт: 9:00-21:00, Сб-Вс: 10:00-18:00",
    image: lyubertsyImage,
    features: ["Комфортная обстановка", "Методические материалы", "Зона отдыха"]
  },
  { 
    id: "lyubertsy-2",
    name: "Красная горка", 
    address: "проспект Гагарина, 3/8",
    metro: "Люберцы (МЦД-1)",
    workingHours: "Пн-Пт: 9:00-21:00, Сб-Вс: 10:00-18:00",
    image: krasnayaGorkaImage,
    features: ["Центральное расположение", "Современное оборудование", "Библиотека"]
  },
  { 
    id: "online",
    name: "Онлайн школа", 
    address: "Cambridge One платформа",
    metro: "По всей планете",
    workingHours: "24/7 доступ к материалам",
    image: onlineSchoolImage,
    features: ["Cambridge One", "Интерактивные уроки", "Гибкое расписание"]
  }
];

// Утилиты для работы с филиалами
export const getBranchById = (id: string): Branch | undefined => {
  return branches.find(branch => branch.id === id);
};

export const getBranchNames = (): string[] => {
  return branches.map(branch => branch.name);
};

// Для селекторов в формах
export const getBranchesForSelect = () => {
  return branches.map(branch => ({
    value: branch.id,
    label: branch.name,
    address: branch.address
  }));
};

// Для Footer (упрощенный формат)
export const getBranchesForFooter = () => {
  return branches.map(branch => ({
    name: branch.name,
    address: branch.address,
    slug: branch.id
  }));
};

// Для программ (только названия)
export const getBranchNamesForPrograms = (): string[] => {
  return branches.map(branch => branch.name);
};

// Для главной страницы
export const getBranchesForIndex = (): BranchForIndex[] => {
  return branches.map(branch => ({
    ...branch,
    slug: branch.id,
    activeGroups: 30, // Значение по умолчанию, будет обновляться из API
    nextGroup: "Завтра в 10:00" // Значение по умолчанию, будет обновляться из API
  }));
};

// Для выбора аудиторий в филиалах
export const getClassroomsForBranch = (branchId: string): string[] => {
  // Возвращаем стандартный набор аудиторий для каждого филиала
  return [
    "Аудитория 1",
    "Аудитория 2", 
    "Аудитория 3",
    "Аудитория 4",
    "Онлайн"
  ];
};