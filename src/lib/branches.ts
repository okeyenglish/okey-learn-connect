// Изображения филиалов
import novokosinoImage from "@/assets/novokosino-branch.jpg";
import kotelnikiImage from "@/assets/kotelniki-branch.jpg";
import okskayaImage from "@/assets/okskaya-branch.jpg";
import lyubertsyImage from "@/assets/lyubertsy-branch.jpg";
import stakhanovskayaImage from "@/assets/stakhanovskaya-branch.jpg";
import krasnayaGorkaImage from "@/assets/krasnaya-gorka-branch.jpg";
import { WorkingHours } from "@/components/settings/WorkingHoursEditor";

// Placeholder URLs for deleted heavy images
const SOLNTSEVO_PLACEHOLDER = "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800&h=600&fit=crop";
const MYTISHCHI_PLACEHOLDER = "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=600&fit=crop";
const ONLINE_PLACEHOLDER = "https://images.unsplash.com/photo-1588196749597-9ff075ee6b5b?w=800&h=600&fit=crop";

// Центр Москвы для карты
export const MOSCOW_CENTER = { lat: 55.7558, lng: 37.6173 };

// Стандартный график работы
const DEFAULT_WORKING_HOURS: WorkingHours = {
  monday: { isOpen: true, open: '09:00', close: '21:00' },
  tuesday: { isOpen: true, open: '09:00', close: '21:00' },
  wednesday: { isOpen: true, open: '09:00', close: '21:00' },
  thursday: { isOpen: true, open: '09:00', close: '21:00' },
  friday: { isOpen: true, open: '09:00', close: '21:00' },
  saturday: { isOpen: true, open: '10:00', close: '18:00' },
  sunday: { isOpen: false, open: '10:00', close: '18:00' },
};

export interface Branch {
  id: string;
  name: string;
  address: string;
  metro: string;
  workingHours: string;
  workingHoursData: WorkingHours;
  image: string;
  features: string[];
}

export interface BranchWithCoordinates extends Branch {
  lat: number;
  lng: number;
  yandexOrgId?: string;
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

// Основной массив филиалов с полной информацией включая координаты
export const branches: BranchWithCoordinates[] = [
  { 
    id: "kotelniki",
    name: "Котельники", 
    address: "2-й Покровский проезд, 14к2",
    metro: "Котельники",
    workingHours: "Пн-Пт 9:00-21:00, Сб 10:00-18:00",
    workingHoursData: DEFAULT_WORKING_HOURS,
    image: kotelnikiImage,
    features: ["Современные классы", "Интерактивные доски", "Детская зона"],
    lat: 55.6606,
    lng: 37.8593,
    yandexOrgId: "124903478543",
  },
  { 
    id: "novokosino",
    name: "Новокосино", 
    address: "Реутов, Юбилейный проспект, 60",
    metro: "Новокосино",
    workingHours: "Пн-Пт 9:00-21:00, Сб 10:00-18:00",
    workingHoursData: DEFAULT_WORKING_HOURS,
    image: novokosinoImage,
    features: ["Просторные классы", "Парковка", "Кафе рядом"],
    lat: 55.7453,
    lng: 37.8687,
    yandexOrgId: "92516357375",
  },
  { 
    id: "okskaya",
    name: "Окская", 
    address: "ул. Окская, д. 3, корп. 1",
    metro: "Окская",
    workingHours: "Пн-Пт 9:00-21:00, Сб 10:00-18:00",
    workingHoursData: DEFAULT_WORKING_HOURS,
    image: okskayaImage,
    features: ["Уютная атмосфера", "Библиотека", "Игровая комната"],
    lat: 55.7126,
    lng: 37.7544,
    yandexOrgId: "1276487501",
  },
  { 
    id: "stakhanovskaya",
    name: "Стахановская", 
    address: "2-й Грайвороновский пр-д, 42к1",
    metro: "Стахановская",
    workingHours: "Пн-Пт 9:00-21:00, Сб 10:00-18:00",
    workingHoursData: DEFAULT_WORKING_HOURS,
    image: stakhanovskayaImage,
    features: ["Новый ремонт", "Мультимедиа", "Удобный подъезд"],
    lat: 55.7267,
    lng: 37.7474,
    yandexOrgId: "131325658206",
  },
  { 
    id: "solntsevo",
    name: "Солнцево", 
    address: "ул. Богданова, 6к1",
    metro: "Солнцево",
    workingHours: "Пн-Пт 9:00-21:00, Сб 10:00-18:00",
    workingHoursData: DEFAULT_WORKING_HOURS,
    image: SOLNTSEVO_PLACEHOLDER,
    features: ["Новые классы", "Удобная парковка", "Детская площадка"],
    lat: 55.6559,
    lng: 37.4010,
    yandexOrgId: "178121909150",
  },
  { 
    id: "mytishchi",
    name: "Мытищи", 
    address: "ул. Борисовка, 16А",
    metro: "Мытищи (МЦД)",
    workingHours: "Пн-Пт 9:00-21:00, Сб 10:00-18:00",
    workingHoursData: DEFAULT_WORKING_HOURS,
    image: MYTISHCHI_PLACEHOLDER,
    features: ["Просторные аудитории", "Техническое оснащение", "Буфет"],
    lat: 55.9116,
    lng: 37.7363,
    yandexOrgId: "1124754951",
  },
  { 
    id: "lyubertsy-1",
    name: "Люберцы", 
    address: "3 Почтовое отделение, 65к1",
    metro: "Люберцы (МЦД)",
    workingHours: "Пн-Пт 9:00-21:00, Сб 10:00-18:00",
    workingHoursData: DEFAULT_WORKING_HOURS,
    image: lyubertsyImage,
    features: ["Комфортная обстановка", "Методические материалы", "Зона отдыха"],
    lat: 55.6873,
    lng: 37.9009,
    yandexOrgId: "1159268195",
  },
  { 
    id: "lyubertsy-2",
    name: "Красная горка", 
    address: "проспект Гагарина, 3/8",
    metro: "Люберцы (МЦД)",
    workingHours: "Пн-Пт 9:00-21:00, Сб 10:00-18:00",
    workingHoursData: DEFAULT_WORKING_HOURS,
    image: krasnayaGorkaImage,
    features: ["Центральное расположение", "Современное оборудование", "Библиотека"],
    lat: 55.6777,
    lng: 37.8933,
    yandexOrgId: "97284619155",
  },
  { 
    id: "online",
    name: "Онлайн школа", 
    address: "Cambridge One платформа",
    metro: "По всей планете",
    workingHours: "24/7 доступ к материалам",
    workingHoursData: {
      monday: { isOpen: true, open: '00:00', close: '23:59' },
      tuesday: { isOpen: true, open: '00:00', close: '23:59' },
      wednesday: { isOpen: true, open: '00:00', close: '23:59' },
      thursday: { isOpen: true, open: '00:00', close: '23:59' },
      friday: { isOpen: true, open: '00:00', close: '23:59' },
      saturday: { isOpen: true, open: '00:00', close: '23:59' },
      sunday: { isOpen: true, open: '00:00', close: '23:59' },
    },
    image: ONLINE_PLACEHOLDER,
    features: ["Cambridge One", "Интерактивные уроки", "Гибкое расписание"],
    lat: 0,
    lng: 0,
  }
];

// Филиалы только с физическим расположением (без онлайн)
export const physicalBranches = branches.filter(b => b.id !== 'online');

// Уникальные станции метро для фильтра
export const METRO_STATIONS = [...new Set(physicalBranches.map(b => b.metro))].sort();

// Утилиты для работы с филиалами
export const getBranchById = (id: string): BranchWithCoordinates | undefined => {
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
